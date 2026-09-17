"""Connect bundled illustrations to matching lesson items without replacing media."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent

SHARED_ICONS = {
    name + '.png': '/assets/pre-vocational/common/' + name + '.png'
    for name in ('capability', 'opportunity', 'activity', 'not-sure-yet')
}

def shared_icon_urls():
    """Resolve stable private-storage previews at sync time, not import time."""
    from .models import Asset
    return {SHARED_ICONS[asset.original_name]: f'/api/content/assets/{asset.pk}/preview/'
            for asset in Asset.objects.filter(original_name__in=SHARED_ICONS,
                storage_path__startswith='lesson-icons/', archived_at__isnull=True,
                status=Asset.Status.VALIDATED).order_by('pk')}

def attach_shared_icons(configuration, urls):
    if isinstance(configuration, list):
        for item in configuration:
            attach_shared_icons(item, urls)
    elif isinstance(configuration, dict):
        for key, value in list(configuration.items()):
            if key in ('image_url', 'reveal_image') and isinstance(value, str) and value in urls:
                configuration[key] = urls[value]
            elif isinstance(value, (dict, list)):
                attach_shared_icons(value, urls)

def _key(text):
    return re.sub(r"[^a-z0-9]+", " ", text.lower()).strip()

ASSETS = {_key(label): url for label, url in json.loads((ROOT / "lesson_asset_map.json").read_text(encoding="utf-8")).items()}

def attach_local_assets(configuration):
    """Only populate image slots on concrete items; leave videos and answer keys intact."""
    count = 0
    def visit(value):
        nonlocal count
        if isinstance(value, list):
            for item in value:
                visit(item)
        elif isinstance(value, dict):
            label = value.get("label") or value.get("title")
            if label and not value.get("image_url"):
                url = ASSETS.get(_key(label))
                if url and (ROOT.parent / "frontend/public" / url.lstrip("/")).is_file():
                    value["image_url"] = url
                    value["alt_text"] = label
                    count += 1
            for key, item in list(value.items()):
                if key not in ("lesson_metadata", "asset_placeholders", "adaptive_delivery", "assessment_metadata"):
                    visit(item)
    visit(configuration)
    return count

def attach_definitions(definitions):
    for lesson in definitions:
        for slide in lesson["slides"]:
            attach_local_assets(slide["configuration"])
