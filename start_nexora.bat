@echo off
TITLE NEXORA AI - SYSTEM LAUNCHER
color 0B

echo ============================================================
echo          NEXORA AI - COMPLETE SYSTEM INITIALIZATION           
echo ============================================================
echo.

:: Check for Python
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python not found! Please install Python 3.8+
    pause
    exit /b 1
)

:: Check for Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not found! Please install Node.js 16+
    pause
    exit /b 1
)

:: Check for dependencies
if not exist "node_modules\" (
    echo [!] Installing Node dependencies...
    call npm install
)

echo [!] Verifying Python dependencies (this may take a moment)...
pip install -r python_server\requirements.txt
if %ERRORLEVEL% NEQ 0 (
    echo [WARN] Failed to install Python dependencies.
    pause
) else (
    echo [OK] Python dependencies verified.
)

if not exist "python_server\test_output\" (
    echo [!] Creating Python test directories...
    mkdir python_server\test_output 2>nul
    mkdir python_server\test_images 2>nul
)

echo.
echo ============================================================
echo Starting all NEXORA services in this window...
echo ============================================================
echo.
echo [VISION] Python Server will run on: http://localhost:5001
echo [AI]     Node Backend will run on:  http://localhost:5000
echo [UI]     Frontend will run on:      http://localhost:5173
echo.
echo Opening browser in 5 seconds...
echo.

:: Launch Browser in background
start /b cmd /c "timeout /t 5 /nobreak >nul & start http://localhost:5173"

:: Use concurrently to run all servers in one window
call npm start

echo.
echo ============================================================
echo NEXORA_SESSION: TERMINATED
echo ============================================================
echo.
pause
