@echo off
cd /d "c:\Users\User\Downloads\web-engineering(New)\Api3"
python -m uvicorn app.main:app --reload --port 8000
pause
