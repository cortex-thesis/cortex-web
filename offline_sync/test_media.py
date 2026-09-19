import hashlib
from pathlib import Path
from tempfile import TemporaryDirectory

from django.test import SimpleTestCase, override_settings

from .engine import SyncError
from .media import _prepared, _verified, media_ready, prepare_media


class MediaTests(SimpleTestCase):
    def setUp(self):
        self.temporary = TemporaryDirectory()
        root = Path(self.temporary.name)
        self.local = root / "local"
        self.cloud = root / "cloud"
        self.local.mkdir()
        self.cloud.mkdir()
        self.settings_override = override_settings(STORAGES={
            "default": {"BACKEND": "django.core.files.storage.FileSystemStorage", "OPTIONS": {"location": self.local}},
            "cloud_media": {"BACKEND": "django.core.files.storage.FileSystemStorage", "OPTIONS": {"location": self.cloud}},
        })
        self.settings_override.enable()
        _prepared.clear()
        _verified.clear()

    def tearDown(self):
        self.settings_override.disable()
        self.temporary.cleanup()
        super().tearDown()

    def data(self, name="lesson.txt", content=b"lesson"):
        return {"web_asset": {"1": {"file": name, "checksum_sha256": hashlib.sha256(content).hexdigest()}}}

    def test_offline_upload_and_other_laptop_download(self):
        data = self.data()
        (self.local / "lesson.txt").write_bytes(b"lesson")
        prepare_media(data, {})
        self.assertEqual((self.cloud / "lesson.txt").read_bytes(), b"lesson")
        self.assertTrue(media_ready(data))
        (self.local / "lesson.txt").unlink()
        prepare_media({}, data)
        self.assertEqual((self.local / "lesson.txt").read_bytes(), b"lesson")
        self.assertTrue(media_ready(data))

    def test_corrupt_file_never_replaces_good_cloud_object(self):
        (self.local / "lesson.txt").write_bytes(b"corrupt")
        (self.cloud / "lesson.txt").write_bytes(b"lesson")
        with self.assertRaisesRegex(SyncError, "checksum"):
            prepare_media(self.data(), {})
        self.assertEqual((self.cloud / "lesson.txt").read_bytes(), b"lesson")

    def test_changed_cloud_bytes_are_not_silently_accepted(self):
        (self.local / "lesson.txt").write_bytes(b"lesson")
        (self.cloud / "lesson.txt").write_bytes(b"different")
        with self.assertRaisesRegex(SyncError, "differ"):
            prepare_media(self.data(), {})

    def test_missing_and_unsafe_files_cannot_be_marked_ready(self):
        self.assertFalse(media_ready(self.data()))
        with self.assertRaises(FileNotFoundError):
            prepare_media({}, self.data())
        with self.assertRaisesRegex(SyncError, "invalid"):
            prepare_media({}, self.data("../private.txt"))

    def test_retained_asset_without_file_does_not_block_sync(self):
        data = {"web_asset": {"1": {"file": ""}}}
        prepare_media(data, data)
        self.assertTrue(media_ready(data))
