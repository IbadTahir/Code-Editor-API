# Editron Service Monitor
# This script continuously monitors all services and restarts them if they stop

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Editron Service Monitor Started" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$services = @(
    @{Name="Code Editor API"; Port=3003; Path="Api1"; Command="npm start"},
    @{Name="User Management API"; Port=5000; Path="Api2"; Command="npm start"},
    @{Name="Educational Platform API"; Port=8000; Path="Api3"; Command="python -m app.main"}
)

function Test-ServiceRunning {
    param([int]$Port)
    
    try {
        $connection = Test-NetConnection -ComputerName localhost -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue
        return $connection
    } catch {
        return $false
    }
}

function Start-Service {
    param($ServiceInfo)
    
    Write-Host "Starting $($ServiceInfo.Name) on port $($ServiceInfo.Port)..." -ForegroundColor Yellow
    
    $currentLocation = Get-Location
    try {
        Set-Location $ServiceInfo.Path
        
        if ($ServiceInfo.Name -eq "Educational Platform API") {
            Start-Process -FilePath "python" -ArgumentList "-m", "app.main" -WindowStyle Minimized
        } else {
            Start-Process -FilePath "npm" -ArgumentList "start" -WindowStyle Minimized
        }
        
        Start-Sleep -Seconds 3
        
        if (Test-ServiceRunning -Port $ServiceInfo.Port) {
            Write-Host "✓ $($ServiceInfo.Name) started successfully" -ForegroundColor Green
        } else {
            Write-Host "⚠ $($ServiceInfo.Name) may have failed to start" -ForegroundColor Yellow
        }
    } finally {
        Set-Location $currentLocation
    }
}

Write-Host "Monitoring services... Press Ctrl+C to stop" -ForegroundColor Green
Write-Host ""

$checkInterval = 30 # seconds

while ($true) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] Checking services..." -ForegroundColor Gray
    
    foreach ($service in $services) {
        if (-not (Test-ServiceRunning -Port $service.Port)) {
            Write-Host "[$timestamp] ❌ $($service.Name) is not running!" -ForegroundColor Red
            Start-Service -ServiceInfo $service
        } else {
            Write-Host "[$timestamp] ✓ $($service.Name) is running" -ForegroundColor Green
        }
    }
    
    Write-Host ""
    Start-Sleep -Seconds $checkInterval
}
