#!/usr/bin/env pwsh
# Video Management Diagnostic Script for Editron
# This script helps diagnose and fix common video management issues

Write-Host "🎬 Editron Video Management Diagnostic Tool" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Cyan
Write-Host ""

# Check if services are running
Write-Host "1. Checking Service Status..." -ForegroundColor Yellow
$services = @(
    @{ Name = "Educational Platform API"; Port = 8000; Url = "http://localhost:8000/api/v1/video-lectures" },
    @{ Name = "User Management API"; Port = 5000; Url = "http://localhost:5000/api/health" },
    @{ Name = "Code Editor API"; Port = 3003; Url = "http://localhost:3003/api/health" },
    @{ Name = "Frontend"; Port = 5178; Url = "http://localhost:5178" }
)

$serviceResults = @()
foreach ($service in $services) {
    $port = $service.Port
    $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    
    if ($connection) {
        Write-Host "   ✅ $($service.Name) is running on port $port" -ForegroundColor Green
        $serviceResults += @{ Service = $service.Name; Status = "Running"; Port = $port }
    } else {
        Write-Host "   ❌ $($service.Name) is NOT running on port $port" -ForegroundColor Red
        $serviceResults += @{ Service = $service.Name; Status = "Stopped"; Port = $port }
    }
}

Write-Host ""

# Test API endpoints
Write-Host "2. Testing API Endpoints..." -ForegroundColor Yellow
$endpointResults = @()

foreach ($service in $services) {
    try {
        $response = Invoke-WebRequest -Uri $service.Url -Method GET -TimeoutSec 5 -ErrorAction Stop
        Write-Host "   ✅ $($service.Name) API responding (Status: $($response.StatusCode))" -ForegroundColor Green
        $endpointResults += @{ Service = $service.Name; Status = "OK"; Response = $response.StatusCode }
    } catch {
        Write-Host "   ❌ $($service.Name) API not responding: $($_.Exception.Message)" -ForegroundColor Red
        $endpointResults += @{ Service = $service.Name; Status = "Error"; Response = $_.Exception.Message }
    }
}

Write-Host ""

# Test video operations
Write-Host "3. Testing Video Operations..." -ForegroundColor Yellow

try {
    # Test getting videos
    $videosResponse = Invoke-WebRequest -Uri "http://localhost:8000/api/v1/video-lectures?page=1&limit=10" -Method GET -ErrorAction Stop
    $videos = $videosResponse.Content | ConvertFrom-Json
    
    Write-Host "   ✅ Video retrieval successful" -ForegroundColor Green
    Write-Host "   📹 Found $($videos.Count) video(s)" -ForegroundColor Blue
    
    if ($videos.value.Count -gt 0) {
        Write-Host "   📝 Sample video: $($videos.value[0].title)" -ForegroundColor Blue
    }
    
} catch {
    Write-Host "   ❌ Video retrieval failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Check authentication
Write-Host "4. Testing Authentication..." -ForegroundColor Yellow
try {
    $authResponse = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -Method GET -ErrorAction Stop
    Write-Host "   ✅ User Management API responding" -ForegroundColor Green
} catch {
    Write-Host "   ❌ User Management API not responding: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Provide recommendations
Write-Host "5. Recommendations:" -ForegroundColor Yellow

$stoppedServices = $serviceResults | Where-Object { $_.Status -eq "Stopped" }
if ($stoppedServices.Count -gt 0) {
    Write-Host "   🔧 Start the following services:" -ForegroundColor Orange
    foreach ($service in $stoppedServices) {
        Write-Host "      - $($service.Service) (Port $($service.Port))" -ForegroundColor Orange
    }
    Write-Host "   📋 Use: ./start-all.bat to start all services" -ForegroundColor Orange
}

$errorEndpoints = $endpointResults | Where-Object { $_.Status -eq "Error" }
if ($errorEndpoints.Count -gt 0) {
    Write-Host "   🔧 Fix API endpoint issues:" -ForegroundColor Orange
    foreach ($endpoint in $errorEndpoints) {
        Write-Host "      - $($endpoint.Service): $($endpoint.Response)" -ForegroundColor Orange
    }
}

if ($stoppedServices.Count -eq 0 -and $errorEndpoints.Count -eq 0) {
    Write-Host "   🎉 All services appear to be running correctly!" -ForegroundColor Green
    Write-Host "   💡 If you're still having issues, check the browser console for errors" -ForegroundColor Blue
}

Write-Host ""
Write-Host "6. Common Solutions:" -ForegroundColor Yellow
Write-Host "   • Clear browser cache and refresh the page" -ForegroundColor White
Write-Host "   • Check Windows Firewall settings" -ForegroundColor White
Write-Host "   • Ensure no other services are using the same ports" -ForegroundColor White
Write-Host "   • Check if authentication token is valid" -ForegroundColor White
Write-Host "   • Restart all services if issues persist" -ForegroundColor White

Write-Host ""
Write-Host "Diagnostic complete! 🏁" -ForegroundColor Cyan
