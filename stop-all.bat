@echo off
echo ========================================
echo   Stopping Editron Services
echo ========================================
echo.

echo Stopping all services on ports 3003, 5000, 8000, and 5178...
echo.

REM Stop processes by port more reliably
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3003') do (
    echo Stopping Code Editor API (PID: %%a)
    taskkill /f /pid %%a >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000') do (
    echo Stopping User Management API (PID: %%a)
    taskkill /f /pid %%a >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000') do (
    echo Stopping Educational Platform API (PID: %%a)
    taskkill /f /pid %%a >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5178') do (
    echo Stopping React Frontend (PID: %%a)
    taskkill /f /pid %%a >nul 2>&1
)

REM Also check for other common frontend ports
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173') do (
    echo Stopping Frontend on default port (PID: %%a)
    taskkill /f /pid %%a >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5179') do (
    echo Stopping Frontend on alternate port (PID: %%a)
    taskkill /f /pid %%a >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5180') do (
    echo Stopping Frontend on alternate port (PID: %%a)
    taskkill /f /pid %%a >nul 2>&1
)

REM Force kill common processes that might be stuck
echo.
echo Force killing any remaining processes...
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im python.exe >nul 2>&1

REM Close service windows by title
taskkill /fi "WindowTitle eq Code Editor API*" /f >nul 2>&1
taskkill /fi "WindowTitle eq User Management API*" /f >nul 2>&1
taskkill /fi "WindowTitle eq Educational Platform API*" /f >nul 2>&1
taskkill /fi "WindowTitle eq React Frontend*" /f >nul 2>&1

echo.
echo ========================================
echo   All Services Stopped!
echo ========================================
echo.

timeout /t 3 >nul
