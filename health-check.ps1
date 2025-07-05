# Editron Services Health Check
# This script tests if all backend services are running and responding

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Editron Services Health Check" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$services = @(
    @{Name="Code Editor API"; Url="http://localhost:3003/api/health"; Port=3003},
    @{Name="User Management API"; Url="http://localhost:5000/api/health"; Port=5000},
    @{Name="Educational Platform API"; Url="http://localhost:8000/docs"; Port=8000},
    @{Name="Frontend Dev Server"; Url="http://localhost:5178"; Port=5178}
)

$allHealthy = $true

foreach ($service in $services) {
    Write-Host "Testing $($service.Name)..." -ForegroundColor Yellow
    
    # First check if port is listening
    $portListening = $false
    try {
        $connection = Test-NetConnection -ComputerName localhost -Port $service.Port -InformationLevel Quiet -WarningAction SilentlyContinue
        $portListening = $connection
    } catch {
        $portListening = $false
    }
    
    if ($portListening) {
        Write-Host "  ✓ Port $($service.Port) is listening" -ForegroundColor Green
        
        # Test HTTP endpoint
        try {
            $response = Invoke-WebRequest -Uri $service.Url -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                Write-Host "  ✓ HTTP endpoint responding (Status: $($response.StatusCode))" -ForegroundColor Green
            } else {
                Write-Host "  ⚠ HTTP endpoint returned status: $($response.StatusCode)" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "  ⚠ HTTP endpoint not responding: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ❌ Port $($service.Port) is not listening" -ForegroundColor Red
        $allHealthy = $false
    }
    
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
if ($allHealthy) {
    Write-Host "   All Services Are Healthy! ✅" -ForegroundColor Green
} else {
    Write-Host "   Some Services Need Attention ⚠️" -ForegroundColor Yellow
}
Write-Host "========================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "Service URLs:" -ForegroundColor Cyan
Write-Host "- Frontend:              http://localhost:5178" -ForegroundColor White
Write-Host "- Code Editor API:       http://localhost:3003" -ForegroundColor White
Write-Host "- User Management API:   http://localhost:5000" -ForegroundColor White
Write-Host "- Educational API:       http://localhost:8000" -ForegroundColor White
Write-Host "- API Documentation:     http://localhost:8000/docs" -ForegroundColor White

Write-Host ""
Write-Host "If services are not running, use: .\start-all.bat" -ForegroundColor Gray
Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
