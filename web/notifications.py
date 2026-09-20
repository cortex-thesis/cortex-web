import uuid

from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.http import require_http_methods

from .models import InterventionAlert


@require_http_methods(['GET', 'POST'])
def notifications(request):
    from .views import _require_profile, _body
    profile, error = _require_profile(request)
    if error:
        return error
    items = profile.notifications.all()
    alerts = InterventionAlert.objects.filter(intervention__actor=profile)
    if request.method == 'POST':
        try:
            data = _body(request)
            identifier = data.get('notification_id')
            if identifier:
                identifier = str(identifier)
                if identifier.startswith('intervention-'):
                    alerts = alerts.filter(pk=int(identifier.removeprefix('intervention-')))
                    items = items.none()
                else:
                    items = items.filter(pk=uuid.UUID(identifier))
                    alerts = alerts.none()
                if not items.exists() and not alerts.exists():
                    return JsonResponse({'detail': 'Notification not found.'}, status=404)
            elif data.get('all') is not True:
                return JsonResponse({'detail': 'Choose a notification or mark all read.'}, status=400)
        except (ValueError, TypeError, AttributeError):
            return JsonResponse({'detail': 'Invalid notification request.'}, status=400)
        items.filter(read_at__isnull=True).update(read_at=timezone.now())
        alerts.filter(read_at__isnull=True).update(read_at=timezone.now())
    items = profile.notifications.all()
    alerts = InterventionAlert.objects.filter(intervention__actor=profile)
    rows = [{'id': str(item.pk), 'kind': item.kind, 'title': item.title, 'body': item.body,
             'link': item.link, 'createdAt': item.created_at, 'read': item.read_at is not None}
            for item in items[:100]]
    rows += [{'id': f'intervention-{item.pk}', 'kind': 'intervention', 'title': item.title,
              'body': item.message, 'link': '', 'createdAt': item.created_at,
              'read': item.read_at is not None} for item in alerts.order_by('-created_at')[:100]]
    rows.sort(key=lambda item: item['createdAt'], reverse=True)
    return JsonResponse({'notifications': rows[:100], 'unread_count': items.filter(read_at__isnull=True).count() + alerts.filter(read_at__isnull=True).count()})
