# current EEG model

`mixed-1395/` contains the saved classifier, 1,395 epoch feature rows (95 recorded and 1,300 augmented), evaluation metrics, and detailed analysis report.

Install dependencies with `python -m pip install -r requirements-ml.txt`.
Regenerate the report with `python manage.py analyze_mixed_epoch_data`.
Retrain from baseline recordings in the database with `python manage.py train_mixed_epoch_model`.
Superadmins can view the report at `/model_analysis` while both development servers run.

Mixed real/augmented evaluation; performance on unseen students has not been validated. This saved classifier is not automatically used for live session predictions.
Only load joblib files from trusted sources: loading them can execute Python code.
