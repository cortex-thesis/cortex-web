@echo off
setlocal
cd /d "%~dp0"

echo Training the paper-aligned baseline models...
python manage.py train_baseline_models
if errorlevel 1 goto ERROR

echo Generating the exploratory dataset and graphs...
python manage.py analyze_baseline_data
if errorlevel 1 goto ERROR

start "" "%~dp0local-data\analysis\baseline_analysis.html"
echo Analysis complete. The report has been opened in your browser.
exit /b 0

:ERROR
echo.
echo ERROR: Baseline analysis did not complete. Review the message above.
pause
exit /b 1
