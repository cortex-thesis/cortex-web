from django.test import SimpleTestCase
import numpy as np
import time

from .services.live_eeg import extract, tbr_baseline


class LiveEEGPipelineTests(SimpleTestCase):
    def test_processing_latency_stays_within_two_second_window_interval(self):
        """Each 512-sample window processes faster than its two-second acquisition interval on this host."""
        channels = {name: [float((index % 40) - 20) for index in range(512)] for name in ("TP9", "AF7", "AF8", "TP10")}
        for _ in range(10):
            started = time.perf_counter()
            self.assertIsNotNone(extract(channels))
            self.assertLess(time.perf_counter() - started, 2)

    def signal(self, components):
        time = np.arange(2048) / 256
        values = sum(amplitude * np.sin(2 * np.pi * frequency * time) for frequency, amplitude in components)
        return {name: values.tolist() for name in ("TP9", "AF7", "AF8", "TP10")}

    def test_numerical_band_power_and_tbr_match_known_sines(self):
        """A 6 Hz amplitude-20 and 20 Hz amplitude-10 mixture gives theta/beta power ratio approximately four."""
        result = extract(self.signal([(6, 20), (20, 10)]))
        self.assertIsNotNone(result)
        self.assertAlmostEqual(result['theta_beta_ratio'], 4, delta=.4)
        self.assertAlmostEqual(result['average']['theta'], 200, delta=20)
        self.assertAlmostEqual(result['average']['beta'], 50, delta=5)
        self.assertLess(result['average']['gamma'], result['average']['theta'] * .01)

    def test_numerical_filter_rejects_mains_noise_and_preserves_theta(self):
        """Adding 60 Hz mains noise changes recovered 6 Hz power by less than five percent."""
        clean = extract(self.signal([(6, 20)]))
        noisy = extract(self.signal([(6, 20), (60, 20)]))
        self.assertAlmostEqual(noisy['average']['theta'] / clean['average']['theta'], 1, delta=.05)

    def test_rejects_nonfinite_excessive_and_abrupt_signal(self):
        for values in ([float('nan')] * 512, [float('inf')] * 512, [0, 400] * 256, [0, 121] * 256):
            with self.subTest(values=values[:2]):
                self.assertIsNone(extract({name: values for name in ("TP9", "AF7", "AF8", "TP10")}))

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
