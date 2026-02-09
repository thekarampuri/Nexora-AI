@echo off
TITLE NEXORA AI - COMPLETE SYSTEM LAUNCHER
color 0B

echo ============================================================
echo          NEXORA AI - COMPLETE SYSTEM INITIALIZATION           
echo ============================================================
echo.
echo [SYSTEM] Starting all NEXORA components...
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

if not exist "python_server\test_output\" (
    echo [!] Creating Python test directories...
    mkdir python_server\test_output 2>nul
    mkdir python_server\test_images 2>nul
)

echo.
echo ============================================================
echo [1/3] Starting Python Vision Server (Port 5001)...
echo ============================================================
start "NEXORA - Python Vision Server" cmd /k "cd python_server && python app.py"
timeout /t 3 /nobreak >nul

echo.
echo ============================================================
echo [2/3] Starting Node.js Backend (Port 5000)...
echo ============================================================
start "NEXORA - Node Backend" cmd /k "npm run server"
timeout /t 3 /nobreak >nul

echo.
echo ============================================================
echo [3/3] Starting Frontend Dev Server (Port 5173)...
echo ============================================================
start "NEXORA - Frontend" cmd /k "npm run dev"
timeout /t 2 /nobreak >nul

echo.
echo ============================================================
echo              ALL SYSTEMS ONLINE - NEXORA READY
echo ============================================================
echo.
echo [VISION] Python Server:  http://localhost:5001
echo [AI]     Node Backend:   http://localhost:5000
echo [UI]     Frontend:       http://localhost:5173
echo.
echo [INFO] Opening NEXORA in your default browser...
timeout /t 5 /nobreak >nul
start http://localhost:5173

echo.
echo ============================================================
echo NEXORA is now running in 3 separate windows.
echo Close those windows to stop the servers.
echo ============================================================
echo.
pause
