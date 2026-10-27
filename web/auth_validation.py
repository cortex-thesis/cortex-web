import re
import unicodedata
from datetime import date

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.validators import validate_email

from .models import Profile, School


def registration_values(data):
    """Validate public registration without changing existing account workflows."""
    errors = {}
    values = {}
    limits = {'username': 150, 'email': 254, 'first_name': 150, 'middle_name': 150,
              'last_name': 150, 'student_number': 50, 'guardian_name': 200,
              'guardian_contact': 30, 'guardian_email': 254, 'birthdate': 10,
              'role': 20, 'school_id': 36}
    for field, limit in limits.items():
        raw = data.get(field, '')
        if not isinstance(raw, str):
            errors[field] = 'Enter a valid text value.'
            raw = ''
        values[field] = raw.strip()
        if len(values[field]) > limit:
            errors[field] = f'Use at most {limit} characters.'
    required = ['username', 'email', 'first_name', 'last_name', 'school_id']
    if values['role'] == Profile.Role.STUDENT:
        required += ['student_number', 'birthdate', 'guardian_name', 'guardian_contact', 'guardian_email']
    for field in required:
        if not values[field]:
            errors[field] = 'This field is required.'
    for field in ('first_name', 'middle_name', 'last_name', 'guardian_name'):
        value = values[field]
        if value and (any(unicodedata.category(c).startswith('N') for c in value)
                      or not any(c.isalpha() for c in value)):
            errors[field] = 'Enter a name without numbers.'
    for field in ('email', 'guardian_email'):
        if values[field]:
            try:
                validate_email(values[field])
            except ValidationError:
                errors[field] = 'Enter a valid email address with a domain.'
    if values['student_number'] and not re.fullmatch(r'[0-9]+', values['student_number']):
        errors['student_number'] = 'Use digits only.'
    contact = values['guardian_contact']
    if contact and (not re.fullmatch(r'\+?[0-9 ()-]+', contact) or not re.search(r'[0-9]', contact)):
        errors['guardian_contact'] = 'Use digits, spaces, parentheses or hyphens, with an optional leading +.'
    if values['birthdate']:
        try:
            values['birthdate'] = date.fromisoformat(values['birthdate'])
            if values['birthdate'] > date.today():
                raise ValueError
        except ValueError:
            errors['birthdate'] = 'Enter a valid birthdate that is not in the future.'
    else:
        values['birthdate'] = None
    if values['role'] not in (Profile.Role.STUDENT, Profile.Role.TEACHER):
        errors['role'] = 'Choose Student or Teacher.'
    try:
        values['school'] = School.objects.get(pk=values['school_id'])
    except (School.DoesNotExist, ValidationError, ValueError, TypeError):
        errors['school_id'] = 'Choose a registered school.'
    User = get_user_model()
    try:
        User._meta.get_field('username').run_validators(values['username'])
    except ValidationError as exc:
        errors['username'] = ' '.join(exc.messages)
    if User.objects.filter(username=values['username']).exists():
        errors['username'] = 'That username is already in use.'
    if values.get('school') and values['student_number'] and Profile.objects.filter(
            school=values['school'], student_number=values['student_number']).exists():
        errors['student_number'] = 'That student number is already in use at this school.'
    name = ' '.join(values[f] for f in ('first_name', 'middle_name', 'last_name') if values[f])
    if len(name) > 160:
        errors['first_name'] = 'Use at most 160 characters for the combined full name.'
    values['name'] = name
    for field in ('password', 'confirm_password'):
        values[field] = data.get(field, '')
        if not isinstance(values[field], str) or not values[field].strip():
            errors[field] = 'This field is required.'
            values[field] = ''
    if values['password'] and len(values['password']) < 12:
        errors['password'] = 'Password must be at least 12 characters.'
    if values['password'] != values['confirm_password']:
        errors['confirm_password'] = 'Passwords do not match.'
    return values, errors
