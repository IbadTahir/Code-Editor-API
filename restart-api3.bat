@echo off
echo Stopping API3 service...
taskkill /F /IM python.exe /FI "WINDOWTITLE eq *uvicorn*" 2>nul

echo Waiting 2 seconds...
timeout /t 2 /nobreak >nul

echo Starting API3 service...
cd /d "c:\Users\User\Downloads\web-engineering(New)\Api3"
start "API3" python -m uvicorn app.main:app --reload --port 8000

echo API3 restart complete!
echo Check http://localhost:8000/docs to verify it's running
pause
