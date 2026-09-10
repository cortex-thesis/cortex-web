from copy import deepcopy
from django.test import SimpleTestCase
from web.lesson_assets import ASSETS, ROOT, attach_local_assets


class LessonAssetTests(SimpleTestCase):
    def test_all_mapped_files_exist(self):
        for url in ASSETS.values():
            self.assertTrue((ROOT.parent / "frontend/public" / url.lstrip("/")).is_file(), url)

    def test_only_missing_images_are_filled_and_repeat_is_safe(self):
        config = {"items": [{"id": "soap", "label": "Soap"},
                            {"id": "comb", "label": "Comb", "image_url": "/custom/comb.png"},
                            {"id": "clock", "label": "Analog clock: 7:00"}],
                  "correct_item_ids": ["soap"], "video_url": "/custom/demo.mp4"}
        self.assertEqual(attach_local_assets(config), 1)
        self.assertEqual(config["items"][0]["image_url"], "/assets/care/care-01/soap.png")
        self.assertEqual(config["items"][1]["image_url"], "/custom/comb.png")
        self.assertNotIn("image_url", config["items"][2])
        self.assertEqual(config["correct_item_ids"], ["soap"])
        self.assertEqual(config["video_url"], "/custom/demo.mp4")
        before = deepcopy(config)
        self.assertEqual(attach_local_assets(config), 0)
        self.assertEqual(config, before)
