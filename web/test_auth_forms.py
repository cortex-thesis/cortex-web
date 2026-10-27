import json
from unittest.mock import patch
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from .models import Profile, School

User = get_user_model()

class AuthenticationFormsTests(TestCase):
    def setUp(self):
        cache.clear()
        self.school = School.objects.create(name='Auth school', contact_email='office@example.test')
        self.data = dict(username='new-user', email=' person@example.test ', first_name=' Ana-María ',
                         middle_name='José', last_name="O’Neill", school_id=str(self.school.pk), role='student',
                         password='auth-test-password-123!', confirm_password='auth-test-password-123!',
                         student_number='001234', guardian_name="Renée O'Neill", guardian_contact='+63 (917) 123-4567',
                         guardian_email='guardian@example.test', birthdate='2005-02-01')

    def post(self, data):
        return self.client.post('/api/auth/register/', json.dumps(data), content_type='application/json')

    def test_required_fields_and_whitespace(self):
        for data in ({}, {**self.data, 'first_name': '  ', 'email': '  ', 'password': '            '}):
            response = self.post(data)
            self.assertEqual(response.status_code, 400)
            self.assertIn('first_name', response.json()['errors'])
        self.assertFalse(User.objects.filter(username='new-user').exists())

    def test_student_details_are_required(self):
        for field in ('student_number', 'birthdate', 'guardian_name', 'guardian_contact', 'guardian_email'):
            for value in (None, '', '   '):
                with self.subTest(field=field, value=value):
                    data = {**self.data}
                    if value is None:
                        data.pop(field)
                    else:
                        data[field] = value
                    response = self.post(data)
                    self.assertEqual(response.status_code, 400)
                    self.assertIn(field, response.json()['errors'])
        self.assertFalse(User.objects.filter(username='new-user').exists())

    def test_invalid_fields_cannot_bypass_ui(self):
        for field, value in [('first_name', 'Ana2'), ('middle_name', '٣'), ('last_name', '123'),
                             ('guardian_name', 'Name1'), ('student_number', '12A'), ('guardian_contact', '09abc'),
                             ('email', 'person@'), ('email', 'person@example..test'), ('guardian_email', 'bad@'),
                             ('birthdate', '2005-02-30'), ('birthdate', '2999-01-01'), ('student_number', '1'*51),
                             ('confirm_password', 'different'), ('role', 'admin')]:
            with self.subTest(field=field, value=value):
                response = self.post({**self.data, field: value})
                self.assertEqual(response.status_code, 400)
                self.assertIn(field, response.json()['errors'])
        self.assertFalse(User.objects.filter(username='new-user').exists())

    def test_persistence_and_login(self):
        self.assertEqual(self.post(self.data).status_code, 201)
        user = User.objects.get(username='new-user')
        self.assertEqual(user.email, 'person@example.test')
        self.assertEqual(user.first_name, 'Ana-María')
        self.assertEqual(user.last_name, 'O’Neill')
        self.assertEqual(user.profile.display_name, 'Ana-María José O’Neill')
        for field in ('student_number', 'guardian_name', 'guardian_contact', 'guardian_email'):
            self.assertEqual(getattr(user.profile, field), self.data[field])
        self.assertEqual(user.profile.birthdate.isoformat(), self.data['birthdate'])
        with patch('web.views._ensure_demo_accounts'):
            for identifier in ('new-user', 'person@example.test'):
                result = self.client.post('/api/auth/login/', json.dumps({'email': identifier, 'password': self.data['password']}), content_type='application/json')
                self.assertEqual(result.status_code, 200)
        self.assertIn('_auth_user_id', self.client.session)

    def test_duplicates_are_field_errors(self):
        self.assertEqual(self.post(self.data).status_code, 201)
        self.assertIn('username', self.post(self.data).json()['errors'])
        self.assertIn('student_number', self.post({**self.data, 'username': 'other'}).json()['errors'])

    def test_teacher_stays_pending(self):
        data = {key: value for key, value in self.data.items() if key not in ('student_number', 'birthdate', 'guardian_name', 'guardian_contact', 'guardian_email')}
        self.assertEqual(self.post({**data, 'role': 'teacher'}).status_code, 201)
        self.assertEqual(User.objects.get(username='new-user').profile.account_status, Profile.AccountStatus.PENDING)
        with patch('web.views._ensure_demo_accounts'):
            result = self.client.post('/api/auth/login/', json.dumps({'username': 'new-user', 'password': self.data['password']}), content_type='application/json')
        self.assertEqual(result.status_code, 403)

    def test_login_empty_and_invalid(self):
        with patch('web.views._ensure_demo_accounts'):
            for data, status in [({}, 400), ({'username': 'unknown', 'password': 'wrong'}, 401)]:
                response = self.client.post('/api/auth/login/', json.dumps(data), content_type='application/json')
                self.assertEqual(response.status_code, status)
        self.assertNotIn('_auth_user_id', self.client.session)
