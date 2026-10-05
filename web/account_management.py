"""Super-administrator identity edits and deletion of unlinked accounts."""
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import IntegrityError, transaction
from django.db.models.deletion import ProtectedError
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_http_methods

from .models import Profile
from .notifications import account_event
from .views import _require_profile, _body, _audit, _profile_data


@require_http_methods(['PATCH', 'DELETE'])
def account_detail(request, profile_id):
    actor, error = _require_profile(request, {Profile.Role.ADMIN})
    if error:
        return error
    if not actor.is_super_admin:
        return JsonResponse({'detail': 'Super administrator access required.'}, status=403)
    try:
        with transaction.atomic():
            target = get_object_or_404(Profile.objects.select_for_update(of=('self',)).select_related('user'), pk=profile_id)
            if target.is_super_admin:
                return JsonResponse({'detail': 'Super administrator accounts are protected from these actions.'}, status=403)
            if request.method == 'DELETE':
                identifier, name = target.pk, target.display_name
                _audit(actor, 'account_deleted', target, {'name': name})
                target.user.delete()
                account_event('Account deleted', f'{actor.display_name} deleted the account for {name}.')
                return JsonResponse({'status': 'deleted', 'id': identifier})
            data = _body(request)
            if not isinstance(data, dict) or not data or set(data) - {'name', 'username', 'email'}:
                raise ValueError
            before = {'name': target.display_name, 'username': target.user.username, 'email': target.user.email}
            values = before | data
            if any(not isinstance(value, str) or not value.strip() for value in values.values()):
                raise ValueError
            values = {key: value.strip() for key, value in values.items()}
            if len(values['name']) > 160 or len(values['username']) > 150 or len(values['email']) > 254:
                raise ValueError
            target.user._meta.get_field('username').run_validators(values['username'])
            validate_email(values['email'])
            if target.user.__class__.objects.exclude(pk=target.user_id).filter(email__iexact=values['email']).exists():
                return JsonResponse({'detail': 'That email address is already in use.'}, status=409)
            changed = [key for key, value in values.items() if value != before[key]]
            target.display_name = values['name']
            target.user.username = values['username']
            target.user.email = values['email']
            target.user.save(update_fields=['username', 'email'])
            target.save(update_fields=['display_name', 'updated_at'])
            if changed:
                _audit(actor, 'account_updated', target, {'fields': changed})
                account_event('Account details updated', f'{actor.display_name} updated the account for {target.display_name}.')
            return JsonResponse(_profile_data(target) | {'email': target.user.email})
    except ProtectedError:
        return JsonResponse({'detail': 'This account has linked learning or administrative records and cannot be deleted. Deactivate it to revoke access while preserving history.'}, status=409)
    except IntegrityError:
        return JsonResponse({'detail': 'That username is already in use.'}, status=409)
    except (ValueError, TypeError, ValidationError):
        return JsonResponse({'detail': 'Provide a valid name, username and email address. Role and school changes are not supported by this edit action.'}, status=400)
