import base64
import csv
import gzip
import io
import json
from collections import Counter
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from web.management.commands.train_baseline_models import BANDS, CHANNELS, STATISTICS
from web.models import BaselineEpoch


class Command(BaseCommand):
    help = "Export the complete baseline dataset and generate a standalone exploratory HTML report."

    def add_arguments(self, parser):
        parser.add_argument("--output-dir", help="Override the default local-data/analysis directory.")

    def handle(self, *args, **options):
        epochs = list(BaselineEpoch.objects.select_related("recording").order_by("recording__participant_code", "recording_id", "epoch_number"))
        if not epochs:
            raise CommandError("No baseline epochs are available.")
        output = Path(options["output_dir"] or Path(settings.EEG_DATA_ROOT) / "analysis")
        output.mkdir(parents=True, exist_ok=True)
        feature_rows = [self._feature_row(epoch) for epoch in epochs]
        self._write_csv(output / "baseline_epoch_features.csv", feature_rows)
        self._write_raw(output / "baseline_raw_signals.csv.gz", epochs)
        metrics_path = Path(settings.EEG_DATA_ROOT) / settings.EEG_MODEL_SUBDIR / "baseline_model_metrics.json"
        metrics = json.loads(metrics_path.read_text(encoding="utf-8")) if metrics_path.exists() else {}
        html = self._report(feature_rows, epochs, metrics)
        (output / "baseline_analysis.html").write_text(html, encoding="utf-8")
        self.stdout.write(self.style.SUCCESS(f"Analysis report: {(output / 'baseline_analysis.html').resolve()}"))
        self.stdout.write(f"Epoch feature rows: {len(feature_rows)}")
        self.stdout.write(f"Raw scalar rows: {sum(epoch.sample_count for epoch in epochs) * 4}")

    @staticmethod
    def _feature_row(epoch):
        recording = epoch.recording
        row = {
            "recording_id": str(recording.pk), "epoch_number": epoch.epoch_number,
            "participant_code": recording.participant_code, "age_years": recording.age_years,
            "sex_at_birth": recording.sex_at_birth, "condition": recording.condition,
            "label_source": recording.label_source, "device_name": recording.device_name,
            "sampling_rate_hz": recording.sampling_rate_hz, "epoch_length_seconds": recording.epoch_length_seconds,
            "start_offset_ms": epoch.start_offset_ms, "end_offset_ms": epoch.end_offset_ms,
            "sample_count": epoch.sample_count, "theta_beta_ratio": epoch.theta_beta_ratio,
            "accepted_channels": epoch.accepted_channels, "battery_level": epoch.battery_level,
            "is_usable": epoch.is_usable,
        }
        for band in BANDS:
            row[f"absolute_{band}"] = (epoch.absolute_band_powers or {}).get(band)
            row[f"relative_{band}"] = (epoch.relative_band_powers or {}).get(band)
        for index, channel in enumerate(CHANNELS):
            row[f"{channel.lower()}_quality"] = (epoch.signal_quality or [None] * 4)[index]
            for statistic in STATISTICS:
                row[f"{channel.lower()}_{statistic}"] = (epoch.channel_statistics or {}).get(channel, {}).get(statistic)
        return row

    @staticmethod
    def _write_csv(path, rows):
        with path.open("w", newline="", encoding="utf-8-sig") as stream:
            writer = csv.DictWriter(stream, fieldnames=list(rows[0]))
            writer.writeheader(); writer.writerows(rows)

    @staticmethod
    def _write_raw(path, epochs):
        with gzip.open(path, "wt", newline="", encoding="utf-8") as stream:
            writer = csv.writer(stream)
            writer.writerow(["recording_id", "participant_code", "condition", "age_years", "sex_at_birth", "epoch_number", "channel", "sample_index", "time_seconds", "raw_microvolts"])
            for epoch in epochs:
                recording = epoch.recording
                for channel in CHANNELS:
                    for index, value in enumerate((epoch.raw_channels or {}).get(channel, [])):
                        writer.writerow([recording.pk, recording.participant_code, recording.condition, recording.age_years or "", recording.sex_at_birth, epoch.epoch_number, channel, index, index / recording.sampling_rate_hz, value])

    @staticmethod
    def _image(figure):
        buffer = io.BytesIO(); figure.savefig(buffer, format="png", dpi=150, bbox_inches="tight"); plt.close(figure)
        return base64.b64encode(buffer.getvalue()).decode()

    def _report(self, rows, epochs, metrics):
        condition_counts = Counter(row["condition"] for row in rows)
        fig1, ax1 = plt.subplots(figsize=(8, 4)); ax1.bar(condition_counts.keys(), condition_counts.values(), color="#6956b8"); ax1.set_title("Epochs by recording condition"); ax1.set_ylabel("Epochs"); ax1.tick_params(axis="x", rotation=20)
        usable = [row for row in rows if row["is_usable"]]
        fig2, ax2 = plt.subplots(figsize=(9, 4)); ax2.boxplot([[row[f"absolute_{band}"] for row in usable] for band in ("theta", "alpha", "beta", "gamma")], tick_labels=["Theta", "Alpha", "Beta", "Gamma"], showfliers=False); ax2.set_title("Absolute band-power distributions (usable epochs)"); ax2.set_ylabel("Power")
        fig3, ax3 = plt.subplots(figsize=(10, 4)); sample = epochs[0];
        for channel in CHANNELS: ax3.plot(np.arange(len(sample.raw_channels[channel])) / sample.recording.sampling_rate_hz, sample.raw_channels[channel], linewidth=.7, label=channel)
        ax3.set_title(f"Example raw epoch: {sample.recording.participant_code} - {sample.recording.condition}"); ax3.set_xlabel("Seconds"); ax3.set_ylabel("Raw signal"); ax3.legend(ncol=4)
        model = metrics.get("classification", {}); clustering = metrics.get("clustering", {})
        matrix = model.get("confusion_matrix", []); labels = model.get("labels", [])
        fig4, ax4 = plt.subplots(figsize=(6, 5))
        if matrix:
            image = ax4.imshow(matrix, cmap="Purples"); fig4.colorbar(image, ax=ax4); ax4.set_xticks(range(len(labels)), labels, rotation=30, ha="right"); ax4.set_yticks(range(len(labels)), labels); ax4.set_xlabel("Predicted"); ax4.set_ylabel("Actual"); ax4.set_title("Participant-grouped confusion matrix")
            for i, row in enumerate(matrix):
                for j, value in enumerate(row): ax4.text(j, i, value, ha="center", va="center")
        sweep = clustering.get("k_sweep", [])
        fig5, (ax5, ax6) = plt.subplots(1, 2, figsize=(10, 4))
        if sweep:
            ax5.plot([x["k"] for x in sweep], [x["inertia"] for x in sweep], marker="o"); ax5.set_title("Elbow method"); ax5.set_xlabel("Clusters (k)"); ax5.set_ylabel("Inertia")
            ax6.plot([x["k"] for x in sweep], [x["silhouette"] for x in sweep], marker="o", color="#178a70"); ax6.set_title("Silhouette by k"); ax6.set_xlabel("Clusters (k)")
        per_class = model.get("per_class", {})
        metric_rows = "".join(f"<tr><td>{label}</td><td>{per_class.get(label,{}).get('precision',0):.3f}</td><td>{per_class.get(label,{}).get('recall',0):.3f}</td><td>{per_class.get(label,{}).get('f1-score',0):.3f}</td><td>{int(per_class.get(label,{}).get('support',0))}</td></tr>" for label in labels)
        return f'''<!doctype html><html><head><meta charset="utf-8"><title>Cortex baseline EEG analysis</title><style>body{{font:14px Arial;background:#f7f4ed;color:#28233c;margin:0}}main{{max-width:1200px;margin:auto;padding:30px}}h1,h2{{color:#35276b}}.grid{{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}}.card{{background:white;border:1px solid #ddd7eb;border-radius:14px;padding:18px;margin:14px 0}}.stat b{{display:block;font-size:25px;color:#6956b8}}img{{max-width:100%;height:auto}}table{{width:100%;border-collapse:collapse}}th,td{{padding:8px;border-bottom:1px solid #eee;text-align:left}}code{{background:#eeeaf6;padding:3px 6px;border-radius:4px}}@media(max-width:700px){{.grid{{grid-template-columns:1fr 1fr}}}}</style></head><body><main><h1>Cortex baseline EEG exploratory analysis</h1><p>Generated from the complete baseline database. Raw signals and demographics are retained for analysis; the classifier uses only paper-specified EEG features.</p><div class="grid"><div class="card stat"><b>{len(set(str(e.recording_id) for e in epochs))}</b>recordings</div><div class="card stat"><b>{len(set(e.recording.participant_code for e in epochs))}</b>participants</div><div class="card stat"><b>{len(epochs)}</b>epochs</div><div class="card stat"><b>{sum(e.sample_count for e in epochs)*4:,}</b>raw values</div></div><section class="card"><h2>Dataset composition</h2><img src="data:image/png;base64,{self._image(fig1)}"></section><section class="card"><h2>Feature exploration</h2><img src="data:image/png;base64,{self._image(fig2)}"><img src="data:image/png;base64,{self._image(fig3)}"></section><section class="card"><h2>Classification evaluation</h2><p>Accuracy: <b>{model.get('accuracy',0):.3f}</b> | Balanced accuracy: <b>{model.get('balanced_accuracy',0):.3f}</b> | Macro precision: <b>{model.get('macro_precision',0):.3f}</b> | Macro recall: <b>{model.get('macro_recall',0):.3f}</b> | Macro F1: <b>{model.get('macro_f1',0):.3f}</b></p><table><tr><th>State</th><th>Precision</th><th>Recall</th><th>F1</th><th>Support</th></tr>{metric_rows}</table><img src="data:image/png;base64,{self._image(fig4)}"></section><section class="card"><h2>Clustering evaluation</h2><p>Silhouette: <b>{clustering.get('silhouette_score',0):.3f}</b> | Davies-Bouldin: <b>{clustering.get('davies_bouldin_index',0):.3f}</b> | Calinski-Harabasz: <b>{clustering.get('calinski_harabasz_index',0):.3f}</b> | ARI: <b>{clustering.get('adjusted_rand_index_against_protocol_labels',0):.3f}</b> | NMI: <b>{clustering.get('normalized_mutual_information',0):.3f}</b></p><img src="data:image/png;base64,{self._image(fig5)}"></section><section class="card"><h2>Files for detailed analysis</h2><p><code>baseline_epoch_features.csv</code> contains metadata, quality, powers, ratios, and channel statistics. <code>baseline_raw_signals.csv.gz</code> contains every raw value in long format.</p></section></main></body></html>'''
