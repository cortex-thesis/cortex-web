@echo off
setlocal

rem Always use the folder containing this launcher as the project folder.
set "PROJECT_DIR=%~dp0"
set "FRONTEND_DIR=%~dp0frontend"
set "VITE_TEMPLATE_ONLY=false"
rem One development-server worker reuses one DB connection instead of
rem keeping a separate Supabase Session Pooler connection per request thread.
set "DATABASE_CONN_MAX_AGE=60"

rem Mirror the root Django flag into Vite so React can select mock screens too.
findstr /I /R /C:"^[ ]*CORTEX_TEMPLATE_ONLY[ ]*=[ ]*true[ ]*$" "%PROJECT_DIR%.env" >nul 2>&1
if not errorlevel 1 set "VITE_TEMPLATE_ONLY=true"

if not exist "%PROJECT_DIR%manage.py" (
    echo ERROR: manage.py was not found in:
    echo %PROJECT_DIR%
    pause
    exit /b 1
)

if not exist "%FRONTEND_DIR%\package.json" (
    echo ERROR: frontend\package.json was not found in:
    echo %FRONTEND_DIR%
    pause
    exit /b 1
)

set "BACKEND_PYTHON=%PROJECT_DIR%.venv\Scripts\python.exe"
if exist "%BACKEND_PYTHON%" goto PYTHON_READY
set "BACKEND_PYTHON=python"
where python >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or is not available in PATH.
    pause
    exit /b 1
)

:PYTHON_READY

where npm >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm is not installed or is not available in PATH.
    pause
    exit /b 1
)

rem Reuse listening development servers instead of creating duplicate listeners.
netstat -ano | findstr /R /C:":8000 .*LISTENING" >nul
if not errorlevel 1 goto BACKEND_STARTED
start "Cortex Backend" /D "%PROJECT_DIR%" cmd /k ""%BACKEND_PYTHON%" -u manage.py runserver 127.0.0.1:8000 --noreload --nothreading"
:BACKEND_STARTED
netstat -ano | findstr /R /C:":5173 .*LISTENING" >nul
if not errorlevel 1 goto FRONTEND_STARTED
start "Cortex Frontend" /D "%FRONTEND_DIR%" cmd /k "set VITE_TEMPLATE_ONLY=%VITE_TEMPLATE_ONLY%&& npm run dev"
:FRONTEND_STARTED

echo Starting Cortex. Waiting for both servers to become ready...
set /a WAITED=0

:WAIT_FOR_FRONTEND
netstat -ano | findstr /R /C:":5173 .*LISTENING" >nul
if errorlevel 1 goto KEEP_WAITING
powershell -NoProfile -Command "try { $response = Invoke-RestMethod 'http://127.0.0.1:8000/api/health/' -TimeoutSec 2; if ($response.service -eq 'cortex' -and $response.status -eq 'ok') { exit 0 }; exit 1 } catch { exit 1 }" >nul 2>&1
if not errorlevel 1 goto OPEN_CORTEX

:KEEP_WAITING
if %WAITED% GEQ 60 goto STARTUP_TIMEOUT
timeout /t 1 /nobreak >nul
set /a WAITED+=1
goto WAIT_FOR_FRONTEND

:OPEN_CORTEX
start msedge "http://localhost:5173/"
goto DONE

:STARTUP_TIMEOUT
echo.
echo ERROR: Both servers were not ready within 60 seconds.
echo Check the "Cortex Backend" and "Cortex Frontend" windows for errors.
pause

:DONE

endlocal
