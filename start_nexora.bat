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
start "NEXORA_AI_CORE" cmd /k "npm run server"

echo [ACTIVE] Synchronizing HUD Interface (Frontend)...
start "NEXORA_HUD_INTERFACE" cmd /k "npm run dev"

echo.
echo ------------------------------------------------------
echo NEXORA_STATUS: CALIBRATED
echo ACCESS_POINT: http://localhost:5173
echo ------------------------------------------------------
echo.
echo Press any key to terminate the launcher (Servers will continue in their respective windows)...
pause > nul
