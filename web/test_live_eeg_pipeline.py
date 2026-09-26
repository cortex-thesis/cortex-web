from django.test import SimpleTestCase

from .services.live_eeg import extract, tbr_baseline


class LiveEEGPipelineTests(SimpleTestCase):
    def test_extracts_four_channel_paper_aligned_features(self):
        channels = {name: [float((index % 40) - 20 + channel * 3) for index in range(512)]
                    for channel, name in enumerate(("TP9", "AF7", "AF8", "TP10"))}
        result = extract(channels)
        self.assertIsNotNone(result)
        self.assertEqual(result["accepted_channels"], 4)
        self.assertEqual(result["settings"]["gamma_hz"], [30, 40])
        self.assertEqual(set(result["channel_features"]), {"TP9", "AF7", "AF8", "TP10"})
        self.assertEqual(len(result["vector"]), 5)

    def test_rejects_flat_or_missing_raw_input(self):
        self.assertIsNone(extract({name: [0.0] * 512 for name in ("TP9", "AF7", "AF8", "TP10")}))

    def test_tbr_baseline_is_deterministic(self):
        self.assertEqual(tbr_baseline([0, 0, 0, -1, 2]), "distracted")
        self.assertEqual(tbr_baseline([0, 2, 1, 0, .8]), "relaxed")
        self.assertEqual(tbr_baseline([0, 0, 1, 2, .8]), "overstimulated")
