import json

from django.conf import settings
from django.http import HttpResponseServerError, JsonResponse
from django.shortcuts import render


def health(request):
    return JsonResponse({"status": "ok", "service": "cortex"})


def frontend(request):
    """Render the React shell; React Router handles the existing client routes."""
    manifest_path = settings.BASE_DIR / "frontend_dist" / ".vite" / "manifest.json"
    if not manifest_path.exists():
        return HttpResponseServerError(
            "Frontend assets are missing. Run `npm run build`, then restart Django."
        )

    with manifest_path.open(encoding="utf-8") as manifest_file:
        manifest = json.load(manifest_file)

    entry = manifest.get("index.html")
    if not entry:
        return HttpResponseServerError("The Vite manifest has no index.html entry.")

    return render(request, "index.html", {
        "script_file": entry["file"],
        "css_files": entry.get("css", []),
    })
