from __future__ import annotations

import json
import hashlib
from functools import lru_cache
from pathlib import Path

import joblib
import numpy as np
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from scipy.signal import butter, detrend, filtfilt, iirnotch, sosfiltfilt, welch

from web.models import ModelVersion
from web.services.augmented_eeg import WORKFLOW as AUGMENTED_WORKFLOW, artifact_directory

CHANNELS = ("TP9", "AF7", "AF8", "TP10")
BANDS = {"theta": (4, 8), "alpha": (8, 13), "beta": (13, 30), "gamma": (30, 40)}
SETTINGS = {"sampling_rate_hz": 256, "detrend": "linear", "notch_hz": 60, "notch_q": 30,
            "bandpass_hz": [1, 45], "psd": "welch_hann", "gamma_hz": [30, 40], "power_units": "uV^2/Hz"}


def _artifact(values):
    return (len(values) < 256 or not np.isfinite(values).all() or np.ptp(values) < .5 or
            np.ptp(values) > 350 or np.max(np.abs(np.diff(values))) > 120)


def extract(raw_channels):
    """Return paper-aligned features from one raw multi-channel EEG window."""
    notch_b, notch_a = iirnotch(60, 30, fs=256)
    band_sos = butter(4, (1, 45), btype="bandpass", fs=256, output="sos")
    channel_features = {}
    linear_by_band = {band: [] for band in BANDS}
    rejected = {}
    for channel in CHANNELS:
        raw = np.asarray(raw_channels.get(channel, []), dtype=np.float64)
        if _artifact(raw):
            rejected[channel] = "missing, flat, non-finite, excessive amplitude, or abrupt movement artifact"
            continue
        filtered = filtfilt(notch_b, notch_a, detrend(raw, type="linear"))
        filtered = sosfiltfilt(band_sos, filtered)
        freq, psd = welch(filtered, fs=256, window="hann", nperseg=min(256, len(filtered)),
                          noverlap=min(128, len(filtered) // 2), detrend=False, scaling="density")
        powers = {}
        total = float(np.trapezoid(psd[(freq >= 1) & (freq < 45)], freq[(freq >= 1) & (freq < 45)])) or 1e-12
        for band, (low, high) in BANDS.items():
            mask = (freq >= low) & (freq < high)
            value = float(np.trapezoid(psd[mask], freq[mask]))
            powers[band] = {"absolute": value, "relative": value / total}
            linear_by_band[band].append(value)
        channel_features[channel] = powers
    if not channel_features:
        return None
    average = {band: float(np.mean(values)) for band, values in linear_by_band.items()}
    beta = average["beta"]
    tbr = average["theta"] / beta if beta > 1e-12 else None
    vector = [float(np.log10(max(average[band], 1e-12))) for band in BANDS] + [float(tbr or 0)]
    return {"average": average, "relative": {band: average[band] / max(sum(average.values()), 1e-12) for band in BANDS},
            "theta_beta_ratio": tbr, "vector": vector, "channel_features": channel_features,
            "accepted_channels": len(channel_features), "rejected_channels": rejected, "settings": SETTINGS}


def _artifact_paths():
    root = artifact_directory()
    return root / "classifier.joblib", root / "metrics.json"


@lru_cache(maxsize=1)
def global_model():
    model_path, metrics_path = _artifact_paths()
    model = joblib.load(model_path)
    metrics = json.loads(metrics_path.read_text(encoding="utf-8"))
    fingerprint = hashlib.sha256(model_path.read_bytes()).hexdigest()
    if metrics.get('artifact_sha256') and metrics['artifact_sha256'] != fingerprint:
        raise ValueError('Model artifact does not match its evaluation metadata.')
    metrics['artifact_sha256'] = fingerprint
    return model, metrics


def ensure_model_version():
    model_path, _ = _artifact_paths()
    model, metrics = global_model()
    snapshot_path = model_path.parent / 'versions' / metrics['artifact_sha256'] / model_path.name
    version_path = snapshot_path if snapshot_path.exists() else model_path
    defaults = {"algorithm": "AugmentedClusterRandomForest", "storage_path": str(version_path.relative_to(settings.BASE_DIR)),
                "hyperparameters": {"features": metrics["features"], **model.named_steps['model'].get_params()}, "metrics": metrics,
                "dataset_fingerprint": metrics.get('dataset_sha256', ''),
                "trained_at": timezone.now(), "is_active": False}
    version, _ = ModelVersion.objects.get_or_create(name="cortex-global-eeg", version=f"augmented-eeg-{metrics['artifact_sha256'][:12]}", defaults=defaults)
    if not version.is_active:
        ModelVersion.objects.filter(name=version.name, is_active=True).exclude(pk=version.pk).update(is_active=False)
        version.is_active = True; version.save(update_fields=["is_active"])
    return version


@transaction.atomic
def classify_and_update(student, device, vector, model_version):
    model, metadata = global_model()
    if metadata.get('workflow') != AUGMENTED_WORKFLOW:
        raise ValueError('The selected artifact is not the Augmented EEG Classifier.')
    values = np.asarray([vector], dtype=float)
    state = str(model.predict(values)[0])
    probabilities = model.predict_proba(values)[0]
    confidence = float(probabilities[list(model.classes_).index(state)])
    cluster = int(model.predict_cluster(values)[0])
    return state, confidence, cluster, 'Augmented EEG Classifier; frozen experimental model'


def tbr_baseline(vector):
    theta, alpha, beta, gamma, tbr = vector
    if gamma > max(alpha, beta): return "overstimulated"
    if tbr >= 1.5: return "distracted"
    if alpha >= max(theta, beta): return "relaxed"
    return "focused"
