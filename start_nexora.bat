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

echo [ACTIVE] Initializing NEXORA AI Ecosystem...
echo [CONSOLE] Running Core and Interface via Neural Link (concurrently)...
echo.

call npm start

echo.
echo ------------------------------------------------------
echo NEXORA_SESSION: TERMINATED
echo ------------------------------------------------------
echo.
pause
