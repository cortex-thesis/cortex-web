import json
from unittest.mock import patch
from datetime import timedelta

from django.contrib.auth.models import User
from django.db.models.query import QuerySet
from django.test import TestCase
from django.utils import timezone

from .models import Activity, ActivityResponse, ClassSession, ConsentRecord, CurriculumPackage, Enrollment, LearningSession, Lesson, Notification, Profile, SchoolClass, SessionEEGSample, Slide


class TeacherLedSessionTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.teacher = Profile.objects.create(user=User.objects.create_user('class-control-teacher'), display_name='Teacher', role=Profile.Role.TEACHER)
        cls.other_teacher = Profile.objects.create(user=User.objects.create_user('class-other-teacher'), role=Profile.Role.TEACHER)
        cls.student = Profile.objects.create(user=User.objects.create_user('class-control-student'), display_name='Student', role=Profile.Role.STUDENT)
        cls.outsider = Profile.objects.create(user=User.objects.create_user('class-outsider'), role=Profile.Role.STUDENT)
        cls.school_class = SchoolClass.objects.create(name='Live Class', code='TEACHERLED', teacher=cls.teacher)
        Enrollment.objects.create(school_class=cls.school_class, student=cls.student, enrolled_by=cls.teacher)
        package = CurriculumPackage.objects.first()
        cls.lesson = Lesson.objects.create(package=package, title='First lesson', status=Lesson.Status.APPROVED, created_by=cls.teacher)
        cls.second_lesson = Lesson.objects.create(package=package, title='Second lesson', status=Lesson.Status.APPROVED, created_by=cls.teacher)
        cls.draft_lesson = Lesson.objects.create(package=package, title='Draft', created_by=cls.teacher)
        cls.activity = Activity.objects.create(type='interactive', title='First question')
        cls.slide = Slide.objects.create(lesson=cls.lesson, activity=cls.activity, title='First question', position=1)
        Slide.objects.create(lesson=cls.second_lesson, activity=Activity.objects.create(type='interactive', title='Second question'), title='Second question', position=1)
        ConsentRecord.objects.create(profile=cls.student, consent_type='eeg_processing', version='1', granted=True)

    def post(self, url, data):
        return self.client.post(url, data=json.dumps(data), content_type='application/json')

    def open(self, lesson=True):
        self.client.force_login(self.teacher.user)
        response = self.post('/api/class-sessions/', {'class_id': self.school_class.pk, **({'lesson_id': self.lesson.pk} if lesson else {})})
        self.assertEqual(response.status_code, 201, response.content)
        group_id = response.json()['id']
        self.url = f'/api/class-sessions/{group_id}/'
        return ClassSession.objects.get(pk=group_id)

    def join(self, group):
        self.client.force_login(self.student.user)
        response = self.post(f'/api/class-sessions/{group.pk}/join/', {})
        self.assertIn(response.status_code, (200, 201), response.content)
        return LearningSession.objects.get(pk=response.json()['student_session']['id'])

    def control(self, action, **extra):
        self.client.force_login(self.teacher.user)
        return self.post(self.url, {'action': action, **extra})

    def test_nullable_lesson_joins_lock_only_the_session_row(self):
        # SQLite ignores row locks. Check the scope explicitly so PostgreSQL
        # does not try to lock the nullable side of the lesson outer join.
        original_get = QuerySet.get
        checked = []

        def checked_get(queryset, *args, **kwargs):
            if queryset.query.select_for_update and isinstance(queryset.query.select_related, dict) and 'lesson' in queryset.query.select_related:
                self.assertEqual(queryset.query.select_for_update_of, ('self',))
                checked.append(queryset.model)
            return original_get(queryset, *args, **kwargs)

        with patch.object(QuerySet, 'get', checked_get):
            group = self.open(lesson=False)
            member = self.join(group)
            self.assertEqual(self.control('set_lesson', lesson_id=self.lesson.pk).status_code, 200)
            self.client.force_login(self.student.user)
            response = self.post(f'/api/sessions/{member.pk}/end/', {})
            self.assertEqual(response.status_code, 200, response.content)
        self.assertIn(ClassSession, checked)
        self.assertIn(LearningSession, checked)

    def test_teacher_can_enable_adaptive_and_override_it(self):
        group = self.open()
        member = self.join(group)
        self.assertEqual(self.control('set_mode', mode='adaptive').status_code, 200)
        self.assertEqual(self.control('start').status_code, 200)
        self.client.force_login(self.student.user)
        response = self.post('/api/sessions/start/', {'class_id': self.school_class.pk, 'class_session_id': str(group.pk), 'control_mode': 'teacher'})
        self.assertEqual(response.status_code, 200, response.content)
        member.refresh_from_db()
        self.assertEqual(member.active_presentation_mode, 'focus')
        self.assertEqual(self.control('pause').status_code, 200)
        self.assertEqual(self.control('resume').status_code, 200)
        response = self.control('set_mode', mode='breathing')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['presentation_mode'], 'breathing')
        member.refresh_from_db()
        self.assertEqual(member.active_presentation_mode, 'relax')
        response = self.control('set_mode', mode='adaptive')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['presentation_mode'], 'adaptive')
        member.refresh_from_db()
        self.assertEqual(member.active_presentation_mode, 'focus')

    def test_invitation_lobby_and_activation_require_teacher_start(self):
        group = self.open(lesson=False)
        self.assertEqual(Notification.objects.filter(recipient=self.student, link=f'/student/class-session/{group.pk}').count(), 1)
        self.assertFalse(Notification.objects.filter(recipient=self.outsider).exists())
        session = self.join(group)
        self.assertEqual(session.status, LearningSession.Status.JOINED)
        self.join(group)
        self.assertEqual(group.student_sessions.count(), 1)
        start_data = {'class_id': self.school_class.pk, 'class_session_id': str(group.pk), 'control_mode': 'teacher'}
        self.assertEqual(self.post('/api/sessions/start/', start_data).status_code, 409)
        self.assertEqual(self.control('start').status_code, 409)
        self.assertEqual(self.control('set_lesson', lesson_id=self.lesson.pk).status_code, 200)
        self.assertEqual(self.control('start').status_code, 200)
        self.client.force_login(self.student.user)
        activated = self.post('/api/sessions/start/', start_data)
        self.assertEqual(activated.status_code, 200, activated.content)
        self.assertEqual(activated.json()['id'], str(session.pk))
        session.refresh_from_db()
        self.assertEqual(session.status, LearningSession.Status.ACTIVE)
        self.assertEqual(session.lesson, self.lesson)

    def test_shared_controls_pause_resume_modes_and_lesson_change(self):
        group = self.open()
        session = self.join(group)
        self.assertEqual(self.control('start').status_code, 200)
        self.assertEqual(self.control('set_mode', mode='breathing').status_code, 200)
        self.assertEqual(self.control('pause').status_code, 200)
        self.client.force_login(self.student.user)
        view = self.post(self.url, {'action': 'heartbeat'}).json()
        self.assertEqual(view['status'], 'paused')
        self.assertEqual(view['presentation_mode'], 'breathing')
        self.assertNotIn('participants', view)
        self.assertEqual(self.post(f'/api/sessions/{session.pk}/eeg/', {}).status_code, 409)
        self.assertEqual(self.control('resume').status_code, 200)
        self.assertEqual(self.control('set_mode', mode='refocus').status_code, 200)
        self.assertEqual(self.control('set_lesson', lesson_id=self.second_lesson.pk).status_code, 200)
        session.refresh_from_db(); group.refresh_from_db()
        self.assertEqual(session.lesson, self.second_lesson)
        self.assertEqual(group.lesson_revision, 1)
        self.assertEqual(len(group.lesson_history), 2)
        # A response already in flight when the lesson changes remains saveable.
        self.client.force_login(self.student.user)
        answer = self.post(f'/api/sessions/{session.pk}/slides/{self.slide.pk}/', {'action': 'answer', 'correct': True, 'selected': 'Yes'})
        self.assertEqual(answer.status_code, 200, answer.content)

    def test_report_is_persisted_counts_unique_answers_and_downloads_csv(self):
        group = self.open()
        session = self.join(group)
        self.control('start')
        for attempt in (1, 2):
            ActivityResponse.objects.create(session=session, activity=self.activity, attempt_number=attempt, is_correct=True)
        for state in ('focused', 'relaxed'):
            SessionEEGSample.objects.create(session=session, bands={}, state=state)
        ended = self.control('end')
        self.assertEqual(ended.status_code, 200, ended.content)
        report = ended.json()['report']
        self.assertEqual(report['participant_count'], 1)
        self.assertEqual(report['answered'], 1)
        self.assertEqual(report['correct'], 1)
        self.assertEqual(report['participants'][0]['attempts'], 2)
        self.assertEqual(report['participants'][0]['state_distribution']['relaxed'], 50)
        session.refresh_from_db(); self.assertIsNotNone(session.ended_at)
        self.assertEqual(self.control('end').json()['report'], report)
        downloaded = self.client.get(self.url + 'report/?download=csv')
        self.assertEqual(downloaded.status_code, 200)
        self.assertIn('attachment;', downloaded['Content-Disposition'])
        self.assertIn('Live Class', downloaded.content.decode('utf-8-sig'))
        self.assertEqual(self.client.get(self.url + 'report/').json(), report)

    def test_access_is_restricted_and_invalid_controls_are_rejected(self):
        group = self.open()
        self.assertEqual(self.control('set_lesson', lesson_id=self.draft_lesson.pk).status_code, 400)
        self.assertEqual(self.control('set_mode', mode='unknown').status_code, 400)
        self.assertEqual(self.control('pause').status_code, 409)
        for actor in (self.other_teacher, self.outsider):
            self.client.force_login(actor.user)
            self.assertEqual(self.client.get(self.url).status_code, 403)
            self.assertEqual(self.post(self.url, {'action': 'end'}).status_code, 403)
        self.client.force_login(self.student.user)
        self.assertEqual(self.post(self.url, {'action': 'start'}).status_code, 403)
        self.assertEqual(self.client.get(self.url + 'report/').status_code, 403)
        self.client.force_login(self.outsider.user)
        self.assertEqual(self.post(self.url + 'join/', {}).status_code, 403)
        self.assertEqual(self.client.get('/api/class-sessions/').json()['sessions'], [])
        self.client.force_login(self.teacher.user)
        self.assertEqual(self.client.get(self.url + 'report/').status_code, 409)
        self.assertEqual(self.post('/api/class-sessions/', {'class_id': self.school_class.pk}).status_code, 409)

    def test_activation_requires_consent_and_teacher_ownership(self):
        group = self.open()
        self.join(group); self.control('start')
        ConsentRecord.objects.filter(profile=self.student).update(granted=False)
        self.client.force_login(self.student.user)
        self.assertEqual(self.post('/api/sessions/start/', {'class_id': self.school_class.pk, 'class_session_id': str(group.pk), 'control_mode': 'teacher'}).status_code, 403)
        self.client.force_login(self.other_teacher.user)
        self.assertEqual(self.post('/api/class-sessions/', {'class_id': self.school_class.pk}).status_code, 400)
        self.assertEqual(self.client.get(f'/api/teacher/classes/{self.school_class.pk}/session-lessons/').status_code, 404)

    def test_heartbeat_distinguishes_offline_participants_and_ended_lobby(self):
        group = self.open()
        session = self.join(group)
        LearningSession.objects.filter(pk=session.pk).update(last_seen_at=timezone.now() - timedelta(seconds=30))
        self.client.force_login(self.teacher.user)
        self.assertFalse(self.client.get(self.url).json()['participants'][0]['online'])
        self.client.force_login(self.student.user)
        self.post(self.url, {'action': 'heartbeat'})
        self.client.force_login(self.teacher.user)
        self.assertTrue(self.client.get(self.url).json()['participants'][0]['online'])
        self.control('end')
        self.client.force_login(self.student.user)
        self.assertEqual(self.post(self.url + 'join/', {}).status_code, 409)
        self.assertEqual(self.post(self.url, {'action': 'heartbeat'}).json()['status'], 'completed')

    def test_student_leave_is_idempotent_and_does_not_end_the_class(self):
        group = self.open()
        session = self.join(group)
        self.control('start')
        self.client.force_login(self.student.user)
        end_url = f'/api/sessions/{session.pk}/end/'
        first = self.post(end_url, {}).json()
        self.assertEqual(self.post(end_url, {}).json(), first)
        group.refresh_from_db()
        self.assertEqual(group.status, ClassSession.Status.ACTIVE)
        self.assertEqual(self.post(self.url + 'join/', {}).status_code, 409)

    def test_report_snapshot_cannot_be_changed_by_late_answers(self):
        group = self.open()
        session = self.join(group)
        self.control('start')
        report = self.control('end').json()['report']
        self.client.force_login(self.student.user)
        response = self.post(f'/api/sessions/{session.pk}/slides/{self.slide.pk}/', {'action': 'answer', 'correct': True, 'selected': 'Yes'})
        self.assertEqual(response.status_code, 409)
        self.client.force_login(self.teacher.user)
        self.assertEqual(self.client.get(self.url + 'report/').json(), report)

    def test_student_can_finish_after_viewing_multiple_lessons(self):
        group = self.open()
        session = self.join(group)
        self.control('start')
        self.client.force_login(self.student.user)
        self.post(f'/api/sessions/{session.pk}/slides/{self.slide.pk}/', {'action': 'enter'})
        self.post(f'/api/sessions/{session.pk}/slides/{self.slide.pk}/', {'action': 'complete'})
        self.control('set_lesson', lesson_id=self.second_lesson.pk)
        self.client.force_login(self.student.user)
        second_slide = self.second_lesson.slides.first()
        self.post(f'/api/sessions/{session.pk}/slides/{second_slide.pk}/', {'action': 'enter'})
        self.post(f'/api/sessions/{session.pk}/slides/{second_slide.pk}/', {'action': 'complete'})
        response = self.post(f'/api/sessions/{session.pk}/end/', {})
        self.assertEqual(response.status_code, 200, response.content)
        session.refresh_from_db()
        self.assertEqual(session.completion_percentage, 100)

    def test_progress_includes_instruction_and_media_without_answers(self):
        instruction = Slide.objects.create(lesson=self.lesson, activity=Activity.objects.create(type='text', title='Read'), title='Read', position=2)
        media = Slide.objects.create(lesson=self.lesson, activity=Activity.objects.create(type='video', title='Watch'), title='Watch', position=3)
        group = self.open()
        session = self.join(group)
        self.control('start')
        self.client.force_login(self.student.user)
        for slide in (self.slide, instruction, media):
            url = f'/api/sessions/{session.pk}/slides/{slide.pk}/'
            self.assertIn(self.post(url, {'action': 'enter'}).status_code, (200, 201))
            self.assertEqual(self.post(url, {'action': 'complete'}).status_code, 200)
            self.assertEqual(self.post(url, {'action': 'complete'}).status_code, 200)
        self.client.force_login(self.teacher.user)
        row = self.client.get(self.url).json()['participants'][0]
        self.assertEqual(row['answered'], 0)
        self.assertEqual(row['completed_steps'], 3)
        self.assertEqual(row['lesson_progress_percentage'], 100)
        self.assertEqual(row['lesson_step_total'], 3)
        report = self.control('end').json()['report']['participants'][0]
        self.assertEqual(report['completed_steps'], 3)
        self.assertEqual(report['progress_percentage'], 100)
        self.client.force_login(self.student.user)
        summary = self.client.get('/api/student/sessions/').json()['sessions'][0]
        self.assertEqual(summary['tasks_completed'], 3)
        self.assertEqual(summary['tasks_total'], 3)

    def test_opening_and_pausing_do_not_complete_a_step(self):
        group = self.open()
        session = self.join(group)
        self.control('start')
        self.client.force_login(self.student.user)
        self.post(f'/api/sessions/{session.pk}/slides/{self.slide.pk}/', {'action': 'enter'})
        row = self.control('pause').json()['participants'][0]
        self.assertEqual(row['completed_steps'], 0)
        row = self.control('end').json()['report']['participants'][0]
        self.assertEqual(row['progress_percentage'], 0)
        session.refresh_from_db()
        self.assertEqual(session.completion_percentage, 0)
