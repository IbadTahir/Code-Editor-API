@echo off
echo ========================================
echo   Starting Editron Services
echo ========================================
echo.

REM Kill any existing processes on the ports we need
echo Cleaning up existing processes...
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im python.exe >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3003') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5178') do taskkill /f /pid %%a >nul 2>&1

echo.
echo Starting services...
echo.

REM Start Code Editor API (Api1) on port 3003
echo [1/4] Starting Code Editor API (Port 3003)...
cd /d "%~dp0Api1"
start "Code Editor API" cmd /k "npm start"

REM Wait a moment for the first service to start
timeout /t 3 >nul

REM Start User Management API (Api2) on port 5000
echo [2/4] Starting User Management API (Port 5000)...
cd /d "%~dp0Api2"
start "User Management API" cmd /k "npm start"

REM Wait a moment
timeout /t 2 >nul

REM Start Educational Platform API (Api3) on port 8000
echo [3/4] Starting Educational Platform API (Port 8000)...
cd /d "%~dp0Api3"
start "Educational Platform API" cmd /k "python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

REM Wait a moment
timeout /t 2 >nul

REM Start React Frontend (auto-detects available port, usually 5178)
echo [4/4] Starting React Frontend...
cd /d "%~dp0"
start "React Frontend" cmd /k "npm run dev"

echo.
echo ========================================
echo   All Services Are Starting!
echo ========================================
echo.
echo Services will be available at:
echo  - Frontend:              http://localhost:5178 (auto-detected)
echo  - Code Editor API:       http://localhost:3003
echo  - User Management API:   http://localhost:5000
echo  - Educational API:       http://localhost:8000
echo  - API Documentation:     http://localhost:8000/docs
echo.
echo Each service is running in its own window.
echo Close the individual windows to stop each service.
echo Or run stop-all.bat to stop all services at once.
echo.

REM Wait 5 seconds then open browser to the actual frontend port
timeout /t 5 >nul
start http://localhost:5178

pause
