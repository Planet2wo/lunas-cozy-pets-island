@echo off
title Luna's Cozy Pets - Launcher
color 0B

echo =======================================================
echo          Luna's Cozy Pets - The Island
echo =======================================================
echo.
echo [1] Start Local Server (Recommended - Best Performance)
echo [2] Play Standalone Version (No Node.js needed)
echo [3] Exit
echo.

set /p choice="Choose an option (1, 2, or 3): "

if "%choice%"=="1" goto server
if "%choice%"=="2" goto standalone
if "%choice%"=="3" goto exit

:server
echo.
echo Checking dependencies...
if not exist node_modules\ (
    echo First-time setup: Installing required packages...
    call npm install
)
echo.
echo Starting Vite server... (Your browser will open automatically)
call npm run dev
pause
goto exit

:standalone
echo.
echo Launching standalone offline game...
start "" "play\Luna's Cozy Pets Island.html"
goto exit

:exit