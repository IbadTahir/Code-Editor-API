# Restart API3 PowerShell Script
Write-Host "Stopping API3 services..." -ForegroundColor Yellow

# Kill Python processes
Get-Process -Name "python" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "Waiting 3 seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host "Starting API3 service..." -ForegroundColor Green

# Change to API3 directory and start the service
Set-Location "Api3"
Start-Process -FilePath "python" -ArgumentList "-m", "uvicorn", "app.main:app", "--reload", "--port", "8000" -WindowStyle Normal

Write-Host "API3 restart complete!" -ForegroundColor Green
Write-Host "Check http://localhost:8000/docs to verify it's running" -ForegroundColor Cyan

# Return to original directory
Set-Location ".."

Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
