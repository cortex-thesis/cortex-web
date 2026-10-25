import hashlib
import json
from copy import deepcopy
from io import StringIO

from django.contrib.auth.models import User
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from web.career_lessons import CAREER_LESSONS
from web.game_validation import evaluate_game
from web.management.commands.publish_career01_revision import snapshot
from web.models import (Activity, ActivityResponse, AuditLog, ClassPackage, ContentAssignment,
                        CurriculumPackage, Enrollment, LearningSession, Lesson,
                        LessonPracticeProgress, Profile, SchoolClass, SessionSlideExposure, Slide)


class Career01RevisionTests(TestCase):
    def setUp(self):
        self.owner = Profile.objects.create(user=User.objects.create_user('revision-owner'), role='admin')
        self.teacher = Profile.objects.create(user=User.objects.create_user('revision-teacher'), role='teacher')
        self.student = Profile.objects.create(user=User.objects.create_user('revision-student'), role='student')
        self.section = SchoolClass.objects.create(name='Revision class', teacher=self.teacher, code='REV1')
        Enrollment.objects.create(student=self.student, school_class=self.section, enrolled_by=self.teacher)
        self.package, _ = CurriculumPackage.objects.get_or_create(slug='career', defaults={'name': 'Career'})
        ClassPackage.objects.get_or_create(package=self.package, school_class=self.section)
        self.old = Lesson.objects.create(package=self.package, title='My Strengths and Skills', competency_code='TP_CP-cp-NG-1', competency_description='Identify their strengths, weaknesses, talents and skills', created_by=self.owner, status='approved')
        for index, screen in enumerate(CAREER_LESSONS[0]['slides']):
            config = deepcopy(screen['configuration'])
            config['lesson_metadata'] = {'competency_code': self.old.competency_code, 'official_competency': self.old.competency_description}
            title, kind = screen['title'], screen['type']
            if index == 1:
                title, kind, config = 'Build the Career Profile', 'image', {'template': 'visual_narrative', 'steps': [{'id': 'original', 'title': 'Original teaching'}], 'lesson_metadata': config['lesson_metadata']}
            if index == 5:
                title, kind, config = 'Things I Am Developing', 'interactive', {'task_template': 'picture_choice', 'scored': False, 'items': [{'id': 'food', 'label': 'Prepare food'}], 'correct_item_ids': [], 'lesson_metadata': config['lesson_metadata']}
            activity = Activity.objects.create(type=kind, title=title, configuration=config, presentation_mode='focus', pacing_level=2)
            Slide.objects.create(lesson=self.old, activity=activity, position=index, title=title)
        self.slides = list(self.old.slides.select_related('activity'))
        self.original = snapshot(self.old, self.slides)
        self.sha = hashlib.sha256(self.original.encode()).hexdigest()
        self.progress = LessonPracticeProgress.objects.create(student=self.student, school_class=self.section, lesson=self.old, completed_slide_ids=[self.slides[1].pk, self.slides[5].pk], activity_evidence={str(self.slides[5].pk): {'selected': 'food'}})
        self.session = LearningSession.objects.create(student=self.student, school_class=self.section, lesson=self.old)
        self.response = ActivityResponse.objects.create(session=self.session, activity=self.slides[5].activity, response={'selected': 'food'})
        self.exposure = SessionSlideExposure.objects.create(session=self.session, slide=self.slides[1])
        ContentAssignment.objects.create(lesson=self.old, school_class=self.section, assigned_by=self.teacher)
        self.other = Lesson.objects.create(package=self.package, title='Other career lesson', competency_code='TP_CP-cp-NG-2', created_by=self.owner, status='approved')
        enrichment, _ = CurriculumPackage.objects.get_or_create(slug='enrichment', defaults={'name': 'Enrichment'})
        self.unrelated = Lesson.objects.create(package=enrichment, title='Unrelated', created_by=self.owner, status='approved')

    def publish(self):
        call_command('publish_career01_revision', source_lesson=self.old.pk, expected_source_sha256=self.sha, stdout=StringIO())
        return Lesson.objects.get(package=self.package, competency_code=self.old.competency_code, archived_at__isnull=True)

    def test_fresh_ids_only_two_content_changes_and_all_evidence_preserved(self):
        new = self.publish()
        self.old.refresh_from_db()
        self.assertEqual(self.old.status, 'archived')
        fresh = list(new.slides.select_related('activity'))
        self.assertEqual(len(fresh), 8)
        self.assertFalse({s.pk for s in fresh} & {s.pk for s in self.slides})
        self.assertFalse({s.activity_id for s in fresh} & {s.activity_id for s in self.slides})
        for index in (0, 2, 3, 4, 6, 7):
            self.assertEqual(fresh[index].title, self.slides[index].title)
            self.assertEqual(fresh[index].activity.configuration, self.slides[index].activity.configuration)
            self.assertEqual(fresh[index].activity.presentation_mode, 'focus')
            self.assertEqual(fresh[index].activity.pacing_level, 2)
        self.assertEqual(fresh[4].activity.configuration['scored'], False)
        self.assertEqual(new.competency_description, self.old.competency_description)
        self.assertEqual(fresh[1].activity.configuration['lesson_metadata'], self.slides[1].activity.configuration['lesson_metadata'])
        self.assertEqual(fresh[1].activity.configuration['media_url'], 'https://www.youtube.com/watch?v=WN3AnXRUmuc')
        self.assertEqual(fresh[5].activity.configuration['task_template'], 'word_search')
        for old in self.slides:
            current = Slide.objects.select_related('activity').get(pk=old.pk)
            self.assertEqual(current.activity.configuration, old.activity.configuration)
        self.progress.refresh_from_db(); self.session.refresh_from_db(); self.response.refresh_from_db(); self.exposure.refresh_from_db()
        self.assertEqual(self.progress.completed_slide_ids, [self.slides[1].pk, self.slides[5].pk])
        self.assertEqual(self.progress.activity_evidence[str(self.slides[5].pk)]['selected'], 'food')
        self.assertEqual(self.session.lesson_id, self.old.pk)
        self.assertEqual(self.response.activity_id, self.slides[5].activity_id)
        self.assertEqual(self.exposure.slide_id, self.slides[1].pk)
        self.assertFalse(LessonPracticeProgress.objects.filter(lesson=new).exists())
        self.assertTrue(new.assignments.filter(school_class=self.section).exists())
        self.other.refresh_from_db(); self.unrelated.refresh_from_db()
        self.assertEqual(self.other.status, 'approved'); self.assertEqual(self.unrelated.status, 'approved')
        self.publish()
        self.assertEqual(AuditLog.objects.filter(action='career01_publication').count(), 1)

    def test_dry_run_stale_source_and_positional_sync_protection(self):
        call_command('publish_career01_revision', source_lesson=self.old.pk, dry_run=True, stdout=StringIO())
        self.assertFalse(AuditLog.objects.filter(action='career01_publication').exists())
        with self.assertRaises(CommandError):
            call_command('publish_career01_revision', source_lesson=self.old.pk, expected_source_sha256='stale', stdout=StringIO())
        with self.assertRaises(CommandError):
            call_command('sync_career_lessons', stdout=StringIO())
        self.old.refresh_from_db()
        self.assertEqual(self.old.status, 'approved')

    def test_practice_without_hardware_validates_word_meanings_and_preserves_authorized_history(self):
        new = self.publish()
        self.client.force_login(self.student.user)
        package = self.client.get(f'/api/student/classes/{self.section.pk}/packages/career/').json()
        self.assertEqual(package['lessons'][0]['id'], new.pk)
        self.assertEqual(package['lessons'][0]['progress']['status'], 'not_started')
        self.assertIn(self.old.pk, [row['id'] for row in package['historical_lessons']])
        old_url = f'/api/student/classes/{self.section.pk}/lessons/{self.old.pk}/'
        self.assertEqual(self.client.get(old_url).status_code, 200)
        self.assertEqual(self.client.get(f'/api/sessions/{self.session.pk}/eeg/').status_code, 200)
        slides = list(new.slides.select_related('activity'))
        url = f'/api/student/classes/{self.section.pk}/lessons/{new.pk}/'
        self.assertEqual(self.client.get(url).status_code, 200)
        config = slides[5].activity.configuration
        good = {'found': [t['word'] for t in config['targets']], 'follow_ups': {t['word']: t['follow_up_question']['answer'] for t in config['targets']}}
        for response in ({}, {'found': good['found'][:-1], 'follow_ups': good['follow_ups']}, {'found': good['found'], 'follow_ups': {}}):
            self.assertFalse(evaluate_game(config, json.dumps(response)))
            self.assertEqual(self.client.post(url, json.dumps({'slide_id': slides[5].pk, 'selected': json.dumps(response)}), content_type='application/json').status_code, 400)
        self.assertEqual(self.client.post(url, json.dumps({'slide_id': slides[5].pk}), content_type='application/json').status_code, 400)
        self.assertEqual(self.client.post(url, json.dumps({'slide_id': self.slides[5].pk, 'selected': json.dumps(good)}), content_type='application/json').status_code, 400)
        self.assertEqual(self.client.post(url, json.dumps({'slide_id': slides[1].pk, 'selected': 'continued_without_video'}), content_type='application/json').status_code, 200)
        self.assertEqual(self.client.post(url, json.dumps({'slide_id': slides[5].pk, 'selected': json.dumps(good)}), content_type='application/json').status_code, 200)
        self.progress.refresh_from_db()
        self.assertEqual(self.progress.activity_evidence[str(self.slides[5].pk)]['selected'], 'food')
        second = Profile.objects.create(user=User.objects.create_user('no-old-history'), role='student')
        Enrollment.objects.create(student=second, school_class=self.section, enrolled_by=self.teacher)
        self.client.force_login(second.user)
        self.assertEqual(self.client.get(old_url).status_code, 404)
