# Editron Services Startup Script
# PowerShell version for better reliability

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Starting Editron Services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Function to stop processes on specific ports
function Stop-ProcessOnPort {
    param([int]$Port)
    
    try {
        $processes = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
        foreach ($processId in $processes) {
            if ($processId -and $processId -ne 0) {
                Write-Host "Stopping process $processId on port $Port" -ForegroundColor Yellow
                Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
            }
        }
    } catch {
        # Port not in use, continue
    }
}

# Clean up existing processes
Write-Host "Cleaning up existing processes..." -ForegroundColor Yellow
Stop-ProcessOnPort -Port 3003
Stop-ProcessOnPort -Port 5000
Stop-ProcessOnPort -Port 8000
Stop-ProcessOnPort -Port 5178
Stop-ProcessOnPort -Port 5178
Stop-ProcessOnPort -Port 5180

# Kill any remaining node/python processes
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process -Name "python" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Starting services..." -ForegroundColor Green
Write-Host ""

# Get the script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

try {
    # Start Code Editor API (Api1) on port 3003
    Write-Host "[1/4] Starting Code Editor API (Port 3003)..." -ForegroundColor Green
    $api1Path = Join-Path $scriptDir "Api1"
    Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "cd /d `"$api1Path`" && npm start" -WindowStyle Normal
    Start-Sleep -Seconds 3

    # Start User Management API (Api2) on port 5000  
    Write-Host "[2/4] Starting User Management API (Port 5000)..." -ForegroundColor Green
    $api2Path = Join-Path $scriptDir "Api2"
    Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "cd /d `"$api2Path`" && npm start" -WindowStyle Normal
    Start-Sleep -Seconds 2

    # Start Educational Platform API (Api3) on port 8000
    Write-Host "[3/4] Starting Educational Platform API (Port 8000)..." -ForegroundColor Green
    $api3Path = Join-Path $scriptDir "Api3"
    Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "cd /d `"$api3Path`" && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload" -WindowStyle Normal
    Start-Sleep -Seconds 2

    # Start React Frontend
    Write-Host "[4/4] Starting React Frontend..." -ForegroundColor Green
    Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "cd /d `"$scriptDir`" && npm run dev" -WindowStyle Normal
    Start-Sleep -Seconds 2

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "   All Services Are Starting!" -ForegroundColor Cyan  
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Services will be available at:" -ForegroundColor White
    Write-Host "  - Frontend:              http://localhost:5178" -ForegroundColor Gray
    Write-Host "  - Code Editor API:       http://localhost:3003" -ForegroundColor Gray
    Write-Host "  - User Management API:   http://localhost:5000" -ForegroundColor Gray
    Write-Host "  - Educational API:       http://localhost:8000" -ForegroundColor Gray
    Write-Host "  - API Documentation:     http://localhost:8000/docs" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Each service is running in its own window." -ForegroundColor Yellow
    Write-Host "Close the individual windows to stop each service." -ForegroundColor Yellow
    Write-Host "Or run stop-all-services.ps1 to stop all services at once." -ForegroundColor Yellow
    Write-Host ""

    # Wait and open browser
    Write-Host "Opening browser in 5 seconds..." -ForegroundColor Green
    Start-Sleep -Seconds 5
    Start-Process "http://localhost:5178"

} catch {
    Write-Host "Error starting services: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
