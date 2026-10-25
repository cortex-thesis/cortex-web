# Augmented EEG Classifier

The selected system artifact is `augmented-eeg/classifier.joblib`. Its display
name is **Augmented EEG Classifier**, and the default `EEG_ACTIVE_MODEL_SUBDIR`
is `augmented-eeg`. Superseded model folders and their report-building scripts
have been moved out of the project into a local model backup. No commits or
remote branches are changed by this model switch.

## Evaluation

The frozen mixed demonstration test scores **228/279 (81.72%)**. Its original EEG
subset scores **8/19 (42.11%)**, EEG-derived augmented subset **20/60 (33.33%)**,
and artificial demonstration subset **200/200 (100%)**. The dataset contains
95 original EEG rows, 300 EEG-derived augmented rows, and 1,000 artificially
separated demonstration rows with assigned class names. The mixed score is not
measured live-EEG accuracy, independent-cohort validation, or clinical validation.
The system uses this model experimentally at the project owner's selection.

## Runtime

The existing acquisition pipeline extracts five features. The model normalizes
the first four log10 band powers using a scaler fitted only on the 76 original
training rows. TBR remains in the interface but is not used. The frozen model
maps a K-means-derived Random Forest cluster to one of four state names.
Personalization does not replace it after twelve windows. Classifier hashes
identify new database model versions, and metrics hashes are verified on load.
The superadmin model-analysis page serves `augmented-eeg/analysis.html`.

Install `requirements-ml.txt` before loading the trusted joblib artifact. See
`runtime-versions.txt` for the export environment. Never load untrusted joblib
files: deserialization can execute Python code.

## Reproduction

The provenance-labeled `augmented-eeg/epochs.csv` is local training input and is
ignored by Git. Restore that authorized file when reproducing on a fresh clone,
then run `python manage.py train_augmented_eeg_model`. The command preserves the
frozen split, checks original-parent boundaries, fits only training rows, exports
the classifier, and regenerates the metrics and report. `generation_protocol.json`
retains the artificial-data construction and normalization protocol. Do not
substitute a new dataset while retaining the reported 81.72% score.
