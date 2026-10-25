from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

import joblib
import numpy as np
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from scipy.optimize import linear_sum_assignment
from scipy.signal import butter, detrend, filtfilt, iirnotch, sosfiltfilt, welch
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

from web.models import CalibrationProfile, ModelVersion

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
    root = Path(getattr(settings, "MODEL_ARTIFACT_ROOT", settings.BASE_DIR / "model-artifacts")) / "mixed-1395"
    return root / "classifier.joblib", root / "metrics.json"


@lru_cache(maxsize=1)
def global_model():
    model_path, metrics_path = _artifact_paths()
    model = joblib.load(model_path)
    metrics = json.loads(metrics_path.read_text(encoding="utf-8"))
    return model, metrics


def ensure_model_version():
    model_path, _ = _artifact_paths()
    _, metrics = global_model()
    defaults = {"algorithm": "RandomForestClassifier", "storage_path": str(model_path.relative_to(settings.BASE_DIR)),
                "hyperparameters": {"features": metrics["features"]}, "metrics": metrics,
                "trained_at": timezone.now(), "is_active": True}
    version, _ = ModelVersion.objects.get_or_create(name="cortex-global-eeg", version="mixed-1395-v1", defaults=defaults)
    if not version.is_active:
        ModelVersion.objects.filter(name=version.name, is_active=True).exclude(pk=version.pk).update(is_active=False)
        version.is_active = True; version.save(update_fields=["is_active"])
    return version


def _cluster_mapping(cluster_ids, labels):
    states = ["focused", "relaxed", "distracted", "overstimulated"]
    matrix = np.zeros((4, 4), dtype=int)
    for cluster, label in zip(cluster_ids, labels):
        matrix[int(cluster), states.index(label)] += 1
    rows, cols = linear_sum_assignment(-matrix)
    return {str(int(row)): states[int(col)] for row, col in zip(rows, cols)}, matrix.tolist()


@transaction.atomic
def classify_and_update(student, device, vector, model_version):
    model, _ = global_model()
    values = np.asarray([vector], dtype=float)
    global_state = str(model.predict(values)[0])
    probabilities = model.predict_proba(values)[0] if hasattr(model, "predict_proba") else None
    confidence = float(np.max(probabilities)) if probabilities is not None else 1.0
    profile, _ = CalibrationProfile.objects.select_for_update().get_or_create(
        student=student, device=device, is_active=True,
        defaults={"model_version": model_version, "feature_baseline": {}, "calibrated_at": timezone.now()})
    payload = dict(profile.feature_baseline or {})
    observations = list(payload.get("observations", []))
    labels = list(payload.get("bootstrap_labels", []))
    observations.append([float(value) for value in vector]); labels.append(global_state)
    observations, labels = observations[-240:], labels[-240:]
    state, cluster_number, rationale = global_state, None, "global classifier until student calibration has enough valid epochs"
    if len(observations) >= 12:
        scaler = StandardScaler().fit(observations)
        scaled = scaler.transform(observations)
        kmeans = KMeans(n_clusters=4, n_init=20, random_state=42).fit(scaled)
        mapping, composition = _cluster_mapping(kmeans.labels_, labels)
        cluster_number = int(kmeans.predict(scaler.transform(values))[0])
        state = mapping[str(cluster_number)]
        distance = float(np.linalg.norm(scaler.transform(values)[0] - kmeans.cluster_centers_[cluster_number]))
        confidence = max(0.0, min(1.0, 1 / (1 + distance)))
        payload.update({"means": scaler.mean_.tolist(), "scales": scaler.scale_.tolist(),
                        "cluster_centers": kmeans.cluster_centers_.tolist(), "cluster_to_state": mapping,
                        "cluster_composition": composition, "mapping_rationale": "one-to-one assignment maximizing agreement with validated global bootstrap labels"})
        rationale = payload["mapping_rationale"]
    payload.update({"observations": observations, "bootstrap_labels": labels, "updated_at": timezone.now().isoformat(),
                    "features": ["log_theta", "log_alpha", "log_beta", "log_gamma", "linear_theta_beta_ratio"]})
    profile.feature_baseline = payload; profile.model_version = model_version
    profile.quality_score = round(confidence, 4); profile.calibrated_at = timezone.now()
    profile.save(update_fields=["feature_baseline", "model_version", "quality_score", "calibrated_at", "updated_at"])
    return state, confidence, cluster_number, rationale


def tbr_baseline(vector):
    theta, alpha, beta, gamma, tbr = vector
    if gamma > max(alpha, beta): return "overstimulated"
    if tbr >= 1.5: return "distracted"
    if alpha >= max(theta, beta): return "relaxed"
    return "focused"
