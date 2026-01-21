@echo off
TITLE NEXORA AI SYSTEM LAUNCHER
:: Color for the futuristic HUD feel (Cyan on Black)
color 0B

echo ======================================================
echo           NEXORA AI - SYSTEM INITIALIZATION           
echo ======================================================
echo.

:: Check for node_modules
if not exist "node_modules\" (
    echo [!] Missing root dependencies. Running npm install...
    call npm install
)

if not exist "server\node_modules\" (
    echo [!] Missing server dependencies. Running npm install in /server...
    cd server
    call npm install
    cd ..
)

echo [ACTIVE] Initializing Neural Link (Backend)...
start /b npm run server

echo [ACTIVE] Synchronizing HUD Interface (Frontend)...
start /b npm run dev

echo.
echo ------------------------------------------------------
echo NEXORA_STATUS: CALIBRATED
echo ACCESS_POINT: http://localhost:5173
echo ------------------------------------------------------
echo.
echo [!] NOTE: Running in single terminal mode.
echo [!] Press Ctrl+C twice to stop both servers.
echo.

:: Keep the window open
:loop
pause > nul
goto loop
