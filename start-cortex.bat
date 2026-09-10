@echo off
setlocal

rem Always use the folder containing this launcher as the project folder.
set "PROJECT_DIR=%~dp0"
set "FRONTEND_DIR=%~dp0frontend"
set "VITE_TEMPLATE_ONLY=false"

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

where python >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or is not available in PATH.
    pause
    exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm is not installed or is not available in PATH.
    pause
    exit /b 1
)

start "Cortex Backend" /D "%PROJECT_DIR%" cmd /k python manage.py runserver 127.0.0.1:8000
start "Cortex Frontend" /D "%FRONTEND_DIR%" cmd /k "set VITE_TEMPLATE_ONLY=%VITE_TEMPLATE_ONLY%&& npm run dev"

echo Starting Cortex. Waiting for the frontend to become ready...
set /a WAITED=0

:WAIT_FOR_FRONTEND
netstat -ano | findstr /R /C:":5173 .*LISTENING" >nul
if not errorlevel 1 goto OPEN_CORTEX

if %WAITED% GEQ 60 goto STARTUP_TIMEOUT
timeout /t 1 /nobreak >nul
set /a WAITED+=1
goto WAIT_FOR_FRONTEND

:OPEN_CORTEX
start "" "http://localhost:5173/"
goto DONE

:STARTUP_TIMEOUT
echo.
echo ERROR: The frontend did not start within 60 seconds.
echo Check the "Cortex Frontend" window for the error message.
pause

:DONE

endlocal
