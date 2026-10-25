import hashlib
import json
from copy import deepcopy
from io import StringIO

from django.contrib.auth.models import User
from django.core.management import call_command
from django.test import TestCase

from web.career_lessons import CAREER_LESSONS
from web.game_validation import evaluate_game
from web.management.commands.publish_career01_revision import snapshot
from web.models import Activity, ActivityResponse, AuditLog, ClassPackage, CurriculumPackage, Enrollment, LearningSession, Lesson, LessonPracticeProgress, Profile, SchoolClass, Slide


class Career03RevisionTests(TestCase):
    def setUp(self):
        self.owner = Profile.objects.create(user=User.objects.create_user('team-owner'), role='admin')
        self.teacher = Profile.objects.create(user=User.objects.create_user('team-teacher'), role='teacher')
        self.student = Profile.objects.create(user=User.objects.create_user('team-student'), role='student')
        self.section = SchoolClass.objects.create(name='Team class', teacher=self.teacher, code='TEAM')
        Enrollment.objects.create(student=self.student, school_class=self.section, enrolled_by=self.teacher)
        self.package, _ = CurriculumPackage.objects.get_or_create(slug='career', defaults={'name': 'Career'})
        ClassPackage.objects.get_or_create(package=self.package, school_class=self.section)
        self.old = Lesson.objects.create(package=self.package, title='Helpful Attitudes at Work', competency_code='TP_CP-cv-NG-1', competency_description=CAREER_LESSONS[2]['competency'], created_by=self.owner, status='approved')
        for index, screen in enumerate(CAREER_LESSONS[2]['slides']):
            config, title = deepcopy(screen['configuration']), screen['title']
            if index in (3, 4):
                title = 'Original question ' + str(index)
                config = {'task_template': 'multiple_choice', 'question': 'Choose a helpful response.', 'choices': ['Ask for help', 'Leave'], 'answer': 'Ask for help'}
            config['lesson_metadata'] = {'competency_code': self.old.competency_code, 'official_competency': self.old.competency_description}
            activity = Activity.objects.create(type=screen['type'], title=title, configuration=config, presentation_mode='focus', pacing_level=2)
            Slide.objects.create(lesson=self.old, activity=activity, position=index, title=title)
        self.slides = list(self.old.slides.select_related('activity'))
        self.sha = hashlib.sha256(snapshot(self.old, self.slides).encode()).hexdigest()
        self.progress = LessonPracticeProgress.objects.create(student=self.student, school_class=self.section, lesson=self.old, completed_slide_ids=[self.slides[3].pk], activity_evidence={str(self.slides[3].pk): {'selected': 'Ask for help'}})
        self.session = LearningSession.objects.create(student=self.student, school_class=self.section, lesson=self.old)
        self.response = ActivityResponse.objects.create(session=self.session, activity=self.slides[3].activity, response={'selected': 'Ask for help'})
        self.other = Lesson.objects.create(package=self.package, title='Other lesson', competency_code='TP_CP-cp-NG-2', created_by=self.owner, status='approved')

    def publish(self):
        call_command('publish_career03_revision', source_lesson=self.old.pk, expected_source_sha256=self.sha, stdout=StringIO())
        return Lesson.objects.get(package=self.package, competency_code=self.old.competency_code, archived_at__isnull=True)

    def test_only_two_slides_change_with_eight_fresh_ids_and_preserved_history(self):
        new = self.publish()
        fresh = list(new.slides.select_related('activity'))
        self.assertEqual(len(fresh), 8)
        self.assertFalse({s.pk for s in fresh} & {s.pk for s in self.slides})
        for position in (0, 1, 2, 5, 6, 7):
            self.assertEqual(fresh[position].title, self.slides[position].title)
            self.assertEqual(fresh[position].activity.configuration, self.slides[position].activity.configuration)
            self.assertEqual(fresh[position].activity.pacing_level, 2)
        self.assertFalse(fresh[6].activity.configuration['scored'])
        self.assertEqual(fresh[3].activity.configuration['lesson_metadata'], self.slides[3].activity.configuration['lesson_metadata'])
        self.assertEqual(fresh[4].activity.configuration['correct_order'], ['tell', 'ask', 'correct'])
        self.assertIn('Other workplace problems may need a different order.', fresh[4].activity.configuration['question'])
        self.assertEqual(fresh[4].activity.configuration['retry_feedback'], 'First tell someone what happened. Then ask which labels to use before correcting them.')
        self.assertEqual(new.competency_code, self.old.competency_code)
        self.assertEqual(new.competency_description, self.old.competency_description)
        self.old.refresh_from_db(); self.progress.refresh_from_db(); self.session.refresh_from_db(); self.response.refresh_from_db(); self.other.refresh_from_db()
        self.assertEqual(self.old.status, 'archived')
        self.assertEqual(self.progress.completed_slide_ids, [self.slides[3].pk])
        self.assertEqual(self.progress.activity_evidence[str(self.slides[3].pk)]['selected'], 'Ask for help')
        self.assertEqual(self.session.lesson_id, self.old.pk)
        self.assertEqual(self.response.activity_id, self.slides[3].activity_id)
        self.assertEqual(self.other.status, 'approved')
        self.assertFalse(LessonPracticeProgress.objects.filter(lesson=new).exists())
        for slide in self.slides:
            self.assertEqual(Activity.objects.get(pk=slide.activity_id).configuration, slide.activity.configuration)
        self.publish()
        self.assertEqual(AuditLog.objects.filter(action='career03_publication').count(), 1)

    def test_sorting_and_sequence_require_correct_complete_evidence(self):
        new = self.publish()
        self.client.force_login(self.student.user)
        url = f'/api/student/classes/{self.section.pk}/lessons/{new.pk}/'
        slides = list(new.slides.select_related('activity'))
        cases = [(slides[3], json.dumps(slides[3].activity.configuration['sort_answers']), ['{}', '{"check":"different"}']),
                 (slides[4], 'tell,ask,correct', ['correct,tell,ask', 'tell,ask', 'tell,ask,correct,extra'])]
        for slide, good, bad_values in cases:
            for bad in bad_values:
                self.assertFalse(evaluate_game(slide.activity.configuration, bad))
                response = self.client.post(url, json.dumps({'slide_id': slide.pk, 'selected': bad, 'correct': True}), content_type='application/json')
                self.assertEqual(response.status_code, 400)
            self.assertEqual(self.client.post(url, json.dumps({'slide_id': slide.pk}), content_type='application/json').status_code, 400)
            self.assertTrue(evaluate_game(slide.activity.configuration, good))
            self.assertEqual(self.client.post(url, json.dumps({'slide_id': slide.pk, 'selected': good}), content_type='application/json').status_code, 200)
        self.assertEqual(self.client.get(f'/api/student/classes/{self.section.pk}/lessons/{self.old.pk}/').status_code, 200)
        self.assertEqual(self.client.post(url, json.dumps({'slide_id': self.slides[3].pk, 'selected': 'Ask for help'}), content_type='application/json').status_code, 400)
