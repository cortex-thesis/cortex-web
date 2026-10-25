"""Build local Finder-launchable Cortex bundles. No desktop writes are performed."""
from pathlib import Path
import json
import plistlib
import shlex
import shutil
import subprocess

PROJECT = Path(__file__).resolve().parents[1]
OUTPUT = PROJECT / ".runtime/apps"


def icon() -> Path:
    iconset = OUTPUT / "Cortex.iconset"
    iconset.mkdir(parents=True, exist_ok=True)
    source = PROJECT / "frontend/src/assets/images/logo-icon.png"
    for size in (16, 32, 128, 256, 512):
        for scale in (1, 2):
            target = iconset / f"icon_{size}x{size}{'@2x' if scale == 2 else ''}.png"
            subprocess.run(["/usr/bin/sips", "-z", str(size * scale), str(size * scale),
                            str(source), "--out", str(target)], check=True, capture_output=True)
    target = OUTPUT / "Cortex.icns"
    subprocess.run(["/usr/bin/iconutil", "-c", "icns", "-o", str(target), str(iconset)], check=True)
    return target


def build(name: str, action: str, app_icon: Path) -> None:
    bundle = OUTPUT / f"{name}.app"
    if bundle.exists():
        shutil.rmtree(bundle)
    command = (shlex.quote(str(PROJECT / ".venv/bin/python")) + " "
               + shlex.quote(str(PROJECT / "scripts/mac_launcher.py")) + " " + action
               + " < /dev/null > /dev/null 2>&1 &")
    # osacompile supplies a native Mach-O applet accepted by Launch Services.
    subprocess.run(["/usr/bin/osacompile", "-o", str(bundle)],
                   input="do shell script " + json.dumps(command) + "\n",
                   text=True, capture_output=True, check=True)
    contents = bundle / "Contents"
    shutil.copyfile(app_icon, contents / "Resources/Cortex.icns")
    with (contents / "Info.plist").open("rb") as stream:
        metadata = plistlib.load(stream)
    metadata.update({"CFBundleName": name, "CFBundleDisplayName": name,
                "CFBundleIdentifier": "local.cortex." + action,
                "CFBundleVersion": "1", "CFBundleShortVersionString": "1.0",
                "CFBundlePackageType": "APPL",
                "CFBundleIconFile": "Cortex.icns", "LSUIElement": True,
                "NSHighResolutionCapable": True})
    with (contents / "Info.plist").open("wb") as stream:
        plistlib.dump(metadata, stream)
    subprocess.run(["/usr/bin/codesign", "--force", "--sign", "-", str(bundle)],
                   check=True, capture_output=True)
    print(OUTPUT / f"{name}.app")


if __name__ == "__main__":
    OUTPUT.mkdir(parents=True, exist_ok=True)
    app_icon = icon()
    build("Cortex", "start", app_icon)
    build("Stop Cortex", "stop", app_icon)
