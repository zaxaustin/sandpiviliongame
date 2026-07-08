@echo off
title Sand Pavilion (Dev)
cd /d "%~dp0"
echo Starting the Sand Pavilion in dev mode...
echo (This window shows Vite/Electron logs -- closing it stops the app.)
echo.
call npm run electron:dev
pause
