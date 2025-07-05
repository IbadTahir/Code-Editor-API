#!/usr/bin/env pwsh
# Video Management Diagnostic Script for Editron
# This script helps diagnose and fix common video management issues

Write-Host "Video Management Diagnostic Tool" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Cyan
Write-Host ""

# Check if services are running
Write-Host "1. Checking Service Status..." -ForegroundColor Yellow
$services = @(
    @{ Name = "Educational Platform API"; Port = 8000 },
    @{ Name = "User Management API"; Port = 5000 },
    @{ Name = "Code Editor API"; Port = 3003 },
    @{ Name = "Frontend"; Port = 5178 }
)

$serviceResults = @()
foreach ($service in $services) {
    $port = $service.Port
    $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    
    if ($connection) {
        Write-Host "   OK $($service.Name) is running on port $port" -ForegroundColor Green
        $serviceResults += @{ Service = $service.Name; Status = "Running"; Port = $port }
    } else {
        Write-Host "   ERROR $($service.Name) is NOT running on port $port" -ForegroundColor Red
        $serviceResults += @{ Service = $service.Name; Status = "Stopped"; Port = $port }
    }
}

Write-Host ""

# Test video endpoint
Write-Host "2. Testing Video API..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/api/v1/video-lectures?page=1&limit=10" -Method GET -TimeoutSec 5
    $data = $response.Content | ConvertFrom-Json
    Write-Host "   OK Video API responding with $($data.Count) videos" -ForegroundColor Green
} catch {
    Write-Host "   ERROR Video API not responding: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Recommendations
Write-Host "3. Recommendations:" -ForegroundColor Yellow
$stoppedServices = $serviceResults | Where-Object { $_.Status -eq "Stopped" }
if ($stoppedServices.Count -gt 0) {
    Write-Host "   Start these services:" -ForegroundColor Orange
    foreach ($service in $stoppedServices) {
        Write-Host "   - $($service.Service) (Port $($service.Port))" -ForegroundColor Orange
    }
    Write-Host "   Run: start-all.bat" -ForegroundColor Orange
} else {
    Write-Host "   All services are running!" -ForegroundColor Green
}

Write-Host ""
Write-Host "Diagnostic complete!" -ForegroundColor Cyan
