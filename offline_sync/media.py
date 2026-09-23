"""Copy immutable lesson assets outside database transactions.

Missing files fail a cycle; database references are never advertised as synced
before both copies exist. Raw EEG files are intentionally not included.
"""
import hashlib
import os
from pathlib import PurePosixPath
import tempfile
import time

from django.core.files import File
from django.core.files.storage import default_storage, storages

from .engine import SyncError

_prepared = set()
_verified = {}


def cloud_version(cloud, name):
    """HEAD metadata lets us recheck verified S3 objects without downloading them."""
    if not hasattr(cloud, "bucket"):
        return None
    response = cloud.connection.meta.client.head_object(Bucket=cloud.bucket_name, Key=name)
    return (response.get("VersionId"), response.get("ETag"),
            response.get("ContentLength"), str(response.get("LastModified")))


def assets(data):
    # Retention can intentionally clear the file while preserving its audit row.
    return (asset for asset in data.get("web_asset", {}).values() if asset.get("file"))


def validated_name(asset):
    name = asset.get("file", "")
    path = PurePosixPath(name)
    if not name or path.is_absolute() or ".." in path.parts or "\\" in name or ":" in name:
        raise SyncError("An asset has an invalid storage path. Repair it before syncing.")
    return name


def digest(file):
    checksum = hashlib.sha256()
    for chunk in file.chunks():
        checksum.update(chunk)
    return checksum.hexdigest()


def prepare_media(local, remote):
    _prepared.clear()
    rows = list(assets(local)) + list(assets(remote))
    if not rows:
        return
    if "cloud_media" not in storages.backends:
        raise SyncError("Configure Supabase Storage before syncing lesson files.")
    cloud = storages["cloud_media"]
    for asset in rows:
        name = validated_name(asset)
        checksum = asset.get("checksum_sha256", "")
        identity = (name, checksum)
        if identity in _prepared:
            continue
        if default_storage.exists(name):
            stat = os.stat(default_storage.path(name))
            fingerprint = (stat.st_size, stat.st_mtime_ns, checksum)
            cached = _verified.get(name)
            if cached and cached[0] == fingerprint and time.monotonic() - cached[1] < 300:
                _prepared.add(identity)
                continue
            if cached and cached[0] == fingerprint and cached[2] is not None:
                if cloud_version(cloud, name) == cached[2]:
                    _verified[name] = (fingerprint, time.monotonic(), cached[2])
                    _prepared.add(identity)
                    continue
        # Capture metadata before reading bytes. A concurrent replacement then
        # causes another verification on the next check, never a stale match.
        version = cloud_version(cloud, name) if cloud.exists(name) else None
        if default_storage.exists(name):
            with default_storage.open(name, "rb") as file:
                actual = digest(file)
            if checksum and actual != checksum:
                raise SyncError("A local lesson file failed its checksum. Restore the file before syncing.")
            if not cloud.exists(name):
                with default_storage.open(name, "rb") as file:
                    saved = cloud.save(name, file)
                if saved != name:
                    raise SyncError("A lesson storage path changed during upload. Sync stopped.")
            # Verify existing objects too; never silently replace conflicting bytes.
            with cloud.open(name, "rb") as file:
                if digest(file) != actual:
                    raise SyncError("Local and cloud lesson files differ. Restore the correct file before syncing.")
        else:
            target = default_storage.path(name)
            os.makedirs(os.path.dirname(target), exist_ok=True)
            temporary = None
            try:
                with tempfile.NamedTemporaryFile(dir=os.path.dirname(target), delete=False) as out:
                    temporary = out.name
                    with cloud.open(name, "rb") as source:
                        for chunk in source.chunks():
                            out.write(chunk)
                with open(temporary, "rb") as source:
                    if checksum and digest(File(source)) != checksum:
                        raise SyncError("A downloaded lesson file failed its checksum.")
                os.replace(temporary, target)
            finally:
                if temporary and os.path.exists(temporary):
                    os.unlink(temporary)
        _prepared.add(identity)
        stat = os.stat(default_storage.path(name))
        _verified[name] = ((stat.st_size, stat.st_mtime_ns, checksum), time.monotonic(), version)


def media_ready(data):
    return all((validated_name(asset), asset.get("checksum_sha256", "")) in _prepared for asset in assets(data))
