# current EEG model

`mixed-1395/` contains the saved classifier, 1,395 epoch feature rows (95 recorded and 1,300 augmented), evaluation metrics, and detailed analysis report.

Install dependencies with `python -m pip install -r requirements-ml.txt`.
Regenerate the report with `python manage.py analyze_mixed_epoch_data`.
Retrain from baseline recordings in the database with `python manage.py train_mixed_epoch_model`.
Superadmins can view the report at `/model_analysis` while both development servers run.

Run `python manage.py evaluate_eeg_baselines` to compare the saved generalized classifier, per-participant classification-via-clustering, and the documented TBR threshold baseline on the same fixed test split. Results are retained in `mixed-1395/comparison_metrics.json` and included in the regenerated analysis report.

Live learning sessions load this trusted classifier after server-side raw-window validation and paper-aligned 1–45 Hz/60 Hz-notch processing. Each accepted window creates timestamped raw chunks, an epoch, channel features, a versioned prediction, and an updated student calibration profile. After twelve valid windows, prediction switches to the student's dynamically refitted four-cluster mapping. Raw chunks can be reviewed by the owning student, their teacher, or an in-scope administrator through `/api/sessions/<session-id>/eeg/recording/`.

Mixed real/augmented evaluation; performance on unseen students has not been validated. This saved classifier is not automatically used for live session predictions.
Only load joblib files from trusted sources: loading them can execute Python code.
