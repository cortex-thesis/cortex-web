"""School-year metadata preserves the original class year strings and session links."""
import re
from django.db import transaction
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.http import require_http_methods
from .models import Profile, School, SchoolClass, SchoolYear


def year_key(value):
    value = value.strip()
    match = re.fullmatch(r'(\d{4})\s*[-–—/]\s*(\d{4})', value)
    return f'{match[1]}–{match[2]}' if match else value


def current_class_year(profile):
    """Resolve class intake from administrator metadata, never from client input."""
    if not profile.school_id or not profile.school.is_active:
        raise ValueError('Your teacher account needs an active school assignment. Contact your School Admin.')
    item = SchoolYear.objects.filter(school_id=profile.school_id, is_active=True, is_archived=False).first()
    if item is None:
        raise ValueError('No current school year is configured. Ask your School Admin to activate a school year, then refresh this form.')
    name = year_key(item.name)
    if not re.fullmatch(r'\d{4}–\d{4}', name) or int(name[-4:]) != int(name[:4]) + 1:
        raise ValueError('The configured school year is invalid. Ask your School Admin to activate a valid school year, then refresh this form.')
    return item.name


@require_http_methods(['GET'])
def teacher_class_year(request):
    from .views import _require_profile
    profile, error = _require_profile(request, {Profile.Role.TEACHER})
    if error:
        return error
    try:
        response = JsonResponse({'school_year': current_class_year(profile)})
    except ValueError as exc:
        response = JsonResponse({'detail': str(exc)}, status=400)
    response['Cache-Control'] = 'private, no-store'
    return response


def year_catalog(profile):
    classes = SchoolClass.objects.filter(school_id=profile.school_id)
    if profile.role == Profile.Role.TEACHER:
        classes = classes.filter(teacher=profile)
    names = {year_key(value) for value in classes.values_list('school_year', flat=True)}
    metadata = {item.name: item for item in SchoolYear.objects.filter(school_id=profile.school_id)}
    names.update(metadata)
    # Offer this calendar year's and the following year's intake without declaring either active.
    if profile.school_id:
        year = timezone.localdate().year
        names.update(f'{start}–{start + 1}' for start in (year, year + 1))
    return [{"value": name or '__unassigned__', "label": name or 'Unassigned school year',
             "is_active": bool(metadata.get(name) and metadata[name].is_active),
             "is_archived": bool(metadata.get(name) and metadata[name].is_archived)}
            for name in sorted(names, reverse=True)]


def report_year_scope(request, profile):
    years = year_catalog(profile)
    selected = request.GET.get('school_year')
    if selected is None:
        selected = next((item['value'] for item in years if item['is_active']), 'all')
    selected = year_key(selected)
    if selected != 'all' and selected not in {item['value'] for item in years}:
        return None, None, JsonResponse({'detail': 'Unknown school year.'}, status=400)
    classes = SchoolClass.objects.filter(teacher=profile, school_id=profile.school_id)
    if selected == 'all':
        classes = visible_classes(classes.filter(status=SchoolClass.Status.ACTIVE))
    else:
        key = '' if selected == '__unassigned__' else selected
        ids = [pk for pk, name in classes.values_list('pk', 'school_year') if year_key(name) == key]
        classes = classes.filter(pk__in=ids)
    return classes, {'school_years': years, 'selected_school_year': selected}, None


def visible_classes(queryset):
    """Hide archived years without changing each class's independent archive status."""
    archived = set(SchoolYear.objects.filter(is_archived=True).values_list('school_id', 'name'))
    if not archived:
        return queryset
    hidden = [pk for pk, school, name in queryset.values_list('pk', 'school_id', 'school_year')
              if (school, year_key(name)) in archived]
    return queryset.exclude(pk__in=hidden)


@require_http_methods(['GET', 'POST'])
def school_years(request):
    from .views import _require_profile, _body, _audit
    profile, error = _require_profile(request, {Profile.Role.ADMIN})
    if error:
        return error
    if not profile.is_school_admin or not profile.school_id:
        return JsonResponse({'detail': 'School-administrator scope is required.'}, status=403)
    if request.method == 'GET':
        return JsonResponse({'school_years': year_catalog(profile)})
    try:
        data = _body(request)
        if not isinstance(data, dict):
            raise ValueError('Request body must be an object.')
        name = year_key(str(data.get('name', '')))
        action = data.get('action')
        if not re.fullmatch(r'\d{4}–\d{4}', name) or int(name[-4:]) != int(name[:4]) + 1:
            raise ValueError('Use consecutive years, for example 2026–2027.')
        if action not in {'archive', 'restore', 'activate'} or data.get('confirmed') is not True:
            raise ValueError('Confirm the school year and action.')
        with transaction.atomic():
            # Serialize year changes for this school, including creation of new metadata.
            School.objects.select_for_update().get(pk=profile.school_id)
            item, _ = SchoolYear.objects.get_or_create(school=profile.school, name=name)
            if action == 'archive' and item.is_active:
                raise ValueError('Choose a different active school year before archiving this year.')
            if action == 'activate':
                if item.is_archived:
                    raise ValueError('Restore the school year before making it active.')
                SchoolYear.objects.filter(school=profile.school, is_active=True).update(is_active=False)
                item.is_active = True
            else:
                item.is_archived = action == 'archive'
            item.save()
            _audit(profile, f'school_year_{action}', item)
        return JsonResponse({'school_years': year_catalog(profile)})
    except (ValueError, TypeError) as exc:
        return JsonResponse({'detail': str(exc)}, status=400)
    except RuntimeError as exc:
        if 'offline' not in str(exc).lower():
            raise
        return JsonResponse({'detail': 'School-year changes need an initialized offline ID allocation. Reconnect and synchronize this replica before trying again.'}, status=503)
