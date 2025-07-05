# Editron - Start All Services (PowerShell)
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Starting Editron Services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Function to stop processes on specific ports
function Stop-ProcessOnPort {
    param([int]$Port)
    
    try {
        $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        if ($connections) {
            foreach ($connection in $connections) {
                $processId = $connection.OwningProcess
                Write-Host "  Stopping existing process on port $Port (PID: $processId)" -ForegroundColor Yellow
                Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
            }
            Start-Sleep -Seconds 1
        }
    } catch {
        # Ignore errors
    }
}

# Clean up existing processes
Write-Host "Cleaning up existing processes..." -ForegroundColor Yellow
Stop-ProcessOnPort -Port 3000
Stop-ProcessOnPort -Port 5000
Stop-ProcessOnPort -Port 8000
Stop-ProcessOnPort -Port 5178

Write-Host ""
Write-Host "Starting services..." -ForegroundColor Green
Write-Host ""

$scriptPath = $PSScriptRoot

# Start Code Editor API (Api1) on port 3000
Write-Host "[1/4] Starting Code Editor API (Port 3000)..." -ForegroundColor Green
$api1Path = Join-Path $scriptPath "Api1"
if (Test-Path (Join-Path $api1Path "dist\server.js")) {
    Start-Process PowerShell -ArgumentList "-NoExit", "-Command", "cd '$api1Path'; `$env:PORT='3000'; node dist/server.js" -WindowStyle Normal
} else {
    Start-Process PowerShell -ArgumentList "-NoExit", "-Command", "cd '$api1Path'; Write-Host 'Building first...' -ForegroundColor Yellow; npm run build; `$env:PORT='3000'; node dist/server.js" -WindowStyle Normal
}

Start-Sleep -Seconds 4

# Start User Management API (Api2) on port 5000
Write-Host "[2/4] Starting User Management API (Port 5000)..." -ForegroundColor Green
$api2Path = Join-Path $scriptPath "Api2"
Start-Process PowerShell -ArgumentList "-NoExit", "-Command", "cd '$api2Path'; npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 2

# Start Educational Platform API (Api3) on port 8000
Write-Host "[3/4] Starting Educational Platform API (Port 8000)..." -ForegroundColor Green
$api3Path = Join-Path $scriptPath "Api3"
Start-Process PowerShell -ArgumentList "-NoExit", "-Command", "cd '$api3Path'; python -m uvicorn app.main:app --reload --port 8000" -WindowStyle Normal

Start-Sleep -Seconds 2

# Start React Frontend on port 5178
Write-Host "[4/4] Starting React Frontend (Port 5178)..." -ForegroundColor Green
Start-Process PowerShell -ArgumentList "-NoExit", "-Command", "cd '$scriptPath'; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   All Services Are Starting!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Services will be available at:" -ForegroundColor White
Write-Host "  - Frontend:              http://localhost:5178" -ForegroundColor Gray
Write-Host "  - Code Editor API:       http://localhost:3000" -ForegroundColor Gray
Write-Host "  - User Management API:   http://localhost:5000" -ForegroundColor Gray
Write-Host "  - Educational API:       http://localhost:8000" -ForegroundColor Gray
Write-Host "  - API Documentation:     http://localhost:8000/docs" -ForegroundColor Gray
Write-Host ""

Write-Host "Each service is running in its own PowerShell window." -ForegroundColor Yellow
Write-Host "Close the individual windows to stop each service." -ForegroundColor Yellow
Write-Host "Or run .\stop-all.ps1 to stop all services at once." -ForegroundColor Yellow
Write-Host ""

# Wait a bit then open browser
Write-Host "Opening browser in 5 seconds..." -ForegroundColor Green
Start-Sleep -Seconds 5
Start-Process "http://localhost:5178"

Write-Host ""
Write-Host "Press any key to close this window..." -ForegroundColor White
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
