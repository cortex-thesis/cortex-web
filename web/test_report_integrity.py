from datetime import datetime, time, timedelta
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from .models import (Activity, ActivityResponse, CurriculumPackage, Enrollment, LearningSession, Lesson, Profile, SchoolClass, SessionAnalytics, SessionEEGSample, SessionSlideExposure, Slide)


class ReportIntegrityTests(TestCase):
    def setUp(self):
        self.teacher = Profile.objects.create(user=get_user_model().objects.create_user('report-audit-teacher'), role='teacher')
        self.student = Profile.objects.create(user=get_user_model().objects.create_user('report-audit-student'), role='student', display_name='Learner')
        self.section = SchoolClass.objects.create(name='Report class', code='REPORTAUDIT', teacher=self.teacher)
        Enrollment.objects.create(school_class=self.section, student=self.student, enrolled_by=self.teacher)
        self.lesson = Lesson.objects.create(title='Measured lesson', package=CurriculumPackage.objects.first(), created_by=self.teacher, status='approved')
        self.slides = [Slide.objects.create(lesson=self.lesson, title=f'Step {i}', position=i, activity=Activity.objects.create(type='text', title=f'Step {i}')) for i in range(2)]
        self.today = timezone.localdate()
        self.start = timezone.make_aware(datetime.combine(self.today, time.min))
        self.client.force_login(self.teacher.user)

    def session(self, start=None, ended=True):
        start = start or self.start
        row = LearningSession.objects.create(student=self.student, school_class=self.section, lesson=self.lesson, ended_at=start + timedelta(seconds=60) if ended else None)
        LearningSession.objects.filter(pk=row.pk).update(started_at=start)
        row.refresh_from_db()
        return row

    def report(self, advanced=False, **params):
        return self.client.get('/api/teacher/reports/' + ('advanced/' if advanced else ''), {'class_id': self.section.pk, 'range': 'month', **params})

    def sample(self, session, second, state='focused', accepted=4):
        return SessionEEGSample.objects.create(session=session, slide=self.slides[0], recorded_at=session.started_at + timedelta(seconds=second), state=state, accepted_channels=accepted)

    def test_report_dates_include_period_start_and_today_but_exclude_tomorrow_and_open_sessions(self):
        month_start = self.start.replace(day=1)
        first = self.session(month_start)
        today = self.session(self.start + timedelta(hours=12))
        self.session(month_start - timedelta(seconds=1))
        self.session(self.start + timedelta(days=1))
        self.session(ended=False)
        for advanced in (False, True):
            data = self.report(advanced).json()
            self.assertEqual(data['overall']['session_count'] if advanced else data['summary']['sessions'], 2)
            self.assertEqual({s['id'] for node in data['students'] for s in node['sessions']} if advanced else {s['id'] for s in data['sessions']}, {str(first.pk), str(today.pk)})

    def test_advanced_boundaries_and_overlaps_assign_each_valid_sample_once(self):
        session = self.session()
        SessionSlideExposure.objects.create(session=session, slide=self.slides[0], entered_at=self.start, exited_at=self.start + timedelta(seconds=10))
        SessionSlideExposure.objects.create(session=session, slide=self.slides[1], entered_at=self.start + timedelta(seconds=10), exited_at=self.start + timedelta(seconds=20))
        SessionSlideExposure.objects.create(session=session, slide=self.slides[0], entered_at=self.start + timedelta(seconds=15), exited_at=self.start + timedelta(seconds=25))
        for second in (5, 10, 17): self.sample(session, second)
        self.sample(session, 18, 'overstimulated', accepted=0)
        self.sample(session, 40)
        data = self.report(True).json()
        self.assertEqual(data['overall']['sample_count'], 3)
        self.assertEqual(sum(slide['states']['focused']['samples'] for lesson in data['lessons'] for slide in lesson['slides']), 3)
        self.assertEqual(sum(slide['states']['focused']['samples'] for student in data['students'] for row in student['sessions'] for slide in row['slides']), 3)
        self.assertEqual(data['overall']['states']['overstimulated']['samples'], 0)
        self.assertEqual(parse_datetime(data['overall']['last_sample_at']), self.start + timedelta(seconds=17))

    def test_missing_eeg_is_null_and_does_not_dilute_measured_focus(self):
        measured = self.session()
        missing = self.session()
        SessionAnalytics.objects.create(session=measured, focused_percentage=80, relaxed_percentage=20)
        SessionAnalytics.objects.create(session=missing)
        data = self.report().json()
        self.assertEqual(data['summary']['average_focus_percentage'], 80)
        self.assertIsNone(next(row for row in data['sessions'] if row['id'] == str(missing.pk))['focus_percentage'])
        self.assertEqual(self.report(True)['Cache-Control'], 'private, no-store')
        summary = self.client.get(f'/api/teacher/classes/{self.section.pk}/analytics/').json()
        self.assertEqual(summary['average_focus'], 80)
        self.assertEqual(summary['students'][0]['average_focus'], 80)

    def test_completed_tasks_count_saved_distinct_steps_not_answer_attempts(self):
        session = self.session()
        for attempt in (1, 2): ActivityResponse.objects.create(session=session, activity=self.slides[0].activity, attempt_number=attempt, response={'selected': 'a'}, is_correct=True)
        for _ in range(2): SessionSlideExposure.objects.create(session=session, slide=self.slides[0], entered_at=self.start, completed_at=self.start, exited_at=self.start)
        data = self.report().json()
        self.assertEqual(data['summary']['tasks_completed'], 1)
        self.assertEqual(data['sessions'][0]['tasks_completed'], 1)

    def test_legacy_valid_samples_supply_missing_summary_analytics(self):
        session = self.session()
        self.sample(session, 1, 'focused')
        self.sample(session, 2, 'relaxed')
        self.sample(session, 3, 'overstimulated', accepted=0)
        data = self.report().json()
        self.assertEqual(data['summary']['average_focus_percentage'], 50)
        self.assertEqual(data['state_distribution']['overstimulated'], 0)

    def test_read_endpoints_reject_mutations_and_foreign_filters(self):
        for suffix in ('reports/', 'reports/advanced/', f'classes/{self.section.pk}/analytics/'):
            self.assertEqual(self.client.post('/api/teacher/' + suffix).status_code, 405)
        self.assertEqual(self.report(class_id='99999').status_code, 404)
        self.assertEqual(self.report(student_id='99999').status_code, 404)
        self.assertEqual(self.report(True, range='invalid').status_code, 400)
        self.client.force_login(self.student.user)
        self.assertEqual(self.report().status_code, 403)
        self.assertEqual(self.report(True).status_code, 403)
    def test_week_boundaries_and_empty_measurements(self):
        empty = self.report().json()
        self.assertEqual(empty['summary']['sessions'], 0)
        self.assertIsNone(empty['summary']['average_focus_percentage'])
        self.assertEqual(empty['sessions'], [])
        advanced = self.report(True).json()
        self.assertEqual(advanced['overall']['sample_count'], 0)
        self.assertIsNone(advanced['overall']['first_sample_at'])
        week_start = self.start - timedelta(days=self.today.weekday())
        self.session(week_start)
        self.session(self.start + timedelta(hours=23, minutes=59, seconds=59))
        self.session(week_start - timedelta(seconds=1))
        self.session(self.start + timedelta(days=1))
        for advanced in (False, True):
            data = self.report(advanced, range='week').json()
            self.assertEqual(data['overall']['session_count'] if advanced else data['summary']['sessions'], 2)

    def test_foreign_teacher_class_and_students_remain_inaccessible(self):
        other = Profile.objects.create(user=get_user_model().objects.create_user('foreign-report-teacher'), role='teacher')
        other_section = SchoolClass.objects.create(name='Private class', code='PRIVATEREPORT', teacher=other)
        for advanced in (False, True):
            self.assertEqual(self.report(advanced, class_id=other_section.pk).status_code, 404)
        self.assertEqual(self.client.get(f'/api/teacher/classes/{other_section.pk}/analytics/').status_code, 404)
