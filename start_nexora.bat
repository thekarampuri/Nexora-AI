@echo off
setlocal
title NEXORA AI - SYSTEM LAUNCHER

echo ==================================================
echo       NEXORA AI - INITIALIZING SYSTEM
echo ==================================================
echo.

:: 1. Navigate to project root
cd /d "%~dp0"

:: 2. Check for Node Dependencies
if not exist "node_modules" (
    echo [SYSTEM] First run detected. Installing Node dependencies...
    call npm install --no-audit
) else (
    echo [SYSTEM] Node structure verified.
)

:: 3. Check Python Dependencies
echo [SYSTEM] Checking Python Environment...
pip install -r python_server/requirements.txt
if errorlevel 1 (
    echo [WARN] Python install failed or pip not found. Features might be limited.
) else (
    echo [SYSTEM] Python Dependencies Verified.
)

:: 4. Launch Services
echo.
echo [SYSTEM] Starting Frontend, Backend, and Vision Engine...
echo [INFO]  Please wait for "NEXORA AI Core linked on port 5000"
echo.

:: Open Browser in 5 seconds
start /b cmd /c "timeout /t 8 >nul && start http://localhost:5173"

:: Run All Services
call npm run start

:: Pause on exit
echo.
echo [SYSTEM] Process Terminated.
pause
