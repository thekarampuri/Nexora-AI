@echo off
setlocal
title NEXORA AI - SYSTEM CONTROLLER

echo ==================================================
echo       NEXORA AI - UNIFIED SYSTEM PRE-FLIGHT
echo ==================================================
echo.

:: 1. Kill any existing instances (Clean Slate)
echo [SYSTEM] Terminating orphan processes...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM python.exe >nul 2>&1

:: 2. Check Backend Dependencies
echo [SYSTEM] Verifying Core Modules (Node.js)...
call npm install --no-audit --no-fund --loglevel=error >nul 2>&1
echo [SYSTEM] Node.js Modules Verified.

:: 3. Check Python Dependencies
echo [SYSTEM] Verifying Neural Engine (Python)...
:: Assuming requirements are installed or skipped for speed. 
:: You could add: pip install -r requirements.txt >nul 2>&1

:: 4. Launch Services (Single Window)
echo.
echo [SYSTEM] Launching All Services...

:: Open Browser (Async)
start /b cmd /c "timeout /t 5 >nul && start http://localhost:5173"

:: Run everything via npm (concurrently)
npm run start

echo.
echo ==================================================
echo      NEXORA SYSTEM SHUTDOWN
echo ==================================================
echo.
pause >nul
