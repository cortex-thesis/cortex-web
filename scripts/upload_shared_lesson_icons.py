"""Upload verified private PNGs, then atomically replace lesson image references."""
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from django.conf import settings
from django.core import serializers
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db import transaction
from web.lesson_assets import SHARED_ICONS, attach_shared_icons
from web.models import Activity, Asset, Profile, Slide

assert not settings.TEMPLATE_ONLY and 'postgresql' in settings.DATABASES['default']['ENGINE']
assert hasattr(default_storage, 'bucket_name'), 'Supabase Storage must be configured'
owner = Profile.objects.filter(role=Profile.Role.ADMIN).order_by('pk').first()
assert owner is not None, 'An administrator profile is required'
urls = {}
asset_ids = []
for name, local_url in SHARED_ICONS.items():
    source = Path(settings.BASE_DIR) / 'frontend' / 'public' / local_url.lstrip('/')
    data = source.read_bytes()
    assert data.startswith(b'\x89PNG\r\n\x1a\n'), 'Expected a PNG file'
    digest = sha256(data).hexdigest()
    path = 'lesson-icons/' + digest + '/' + name
    if not default_storage.exists(path):
        saved = default_storage.save(path, ContentFile(data))
        assert saved == path, 'Unexpected storage filename'
    with default_storage.open(path, 'rb') as uploaded:
        assert sha256(uploaded.read()).hexdigest() == digest, 'Shared-file checksum mismatch'
    asset, _ = Asset.objects.get_or_create(storage_path=path, checksum_sha256=digest, defaults={
        'file': path, 'original_name': name, 'mime_type': 'image/png', 'size_bytes': len(data),
        'storage_bucket': default_storage.bucket_name, 'uploaded_by': owner,
    })
    assert asset.file.name == path and asset.archived_at is None
    urls[local_url] = f'/api/content/assets/{asset.pk}/preview/'
    asset_ids.append(asset.pk)
    print('Uploaded and checksum-verified:', name, 'asset', asset.pk, flush=True)

with transaction.atomic():
    activity_ids = Slide.objects.filter(lesson__package__slug='pre_vocational', lesson__archived_at__isnull=True).values_list('activity_id', flat=True)
    activities = list(Activity.objects.select_for_update().filter(pk__in=activity_ids))
    backup = Path(settings.BASE_DIR) / '.runtime' / 'backups' / ('shared-icons-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'))
    backup.mkdir(parents=True)
    (backup / 'activities.json').write_text(serializers.serialize('json', activities, indent=2), encoding='utf-8')
    changed = 0
    import copy
    for activity in activities:
        config = copy.deepcopy(activity.configuration)
        if config.get('lesson_id') == 'PREV-01':
            for step in config.get('steps', []):
                if step.get('id') == 'capability' and not step.get('image_url'):
                    step['image_url'] = '/assets/pre-vocational/common/capability.png'
        attach_shared_icons(config, urls)
        if config != activity.configuration:
            activity.configuration = config
            activity.save(update_fields=['configuration'])
            changed += 1
    print('Shared lesson references updated:', changed, 'activities. Backup:', backup, flush=True)
print('Verified shared icon asset IDs:', asset_ids, flush=True)
