@echo off
title Editron Launcher

echo ========================================
echo   Welcome to Editron!
echo ========================================
echo.
echo This will start all services:
echo  - Code Editor API (Port 3000)
echo  - User Management API (Port 5000)  
echo  - Educational Platform API (Port 8000)
echo  - React Frontend (Port 5178)
echo.

pause

call start-all.bat
