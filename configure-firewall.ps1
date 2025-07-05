# Windows Firewall Configuration for Editron APIs
# Run this script as Administrator to allow Editron API services through Windows Firewall

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Editron Firewall Configuration" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Check if running as administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "Error: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Please right-click on PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "Adding Windows Firewall rules for Editron services..." -ForegroundColor Green

try {
    # Remove existing rules if they exist
    Write-Host "Removing existing rules..." -ForegroundColor Yellow
    netsh advfirewall firewall delete rule name="Editron Code Editor API" >$null 2>&1
    netsh advfirewall firewall delete rule name="Editron User Management API" >$null 2>&1
    netsh advfirewall firewall delete rule name="Editron Educational Platform API" >$null 2>&1
    netsh advfirewall firewall delete rule name="Editron Frontend" >$null 2>&1

    # Add new rules for all Editron services
    Write-Host "Adding firewall rules..." -ForegroundColor Green
    
    # Code Editor API (Port 3003)
    netsh advfirewall firewall add rule name="Editron Code Editor API" dir=in action=allow protocol=TCP localport=3003 | Out-Null
    Write-Host "✓ Code Editor API (Port 3003) - Allowed" -ForegroundColor Green
    
    # User Management API (Port 5000)
    netsh advfirewall firewall add rule name="Editron User Management API" dir=in action=allow protocol=TCP localport=5000 | Out-Null
    Write-Host "✓ User Management API (Port 5000) - Allowed" -ForegroundColor Green
    
    # Educational Platform API (Port 8000)
    netsh advfirewall firewall add rule name="Editron Educational Platform API" dir=in action=allow protocol=TCP localport=8000 | Out-Null
    Write-Host "✓ Educational Platform API (Port 8000) - Allowed" -ForegroundColor Green
    
    # Frontend Development Server (Ports 5173-5180)
    for ($port = 5173; $port -le 5180; $port++) {
        netsh advfirewall firewall add rule name="Editron Frontend Dev Server (Port $port)" dir=in action=allow protocol=TCP localport=$port | Out-Null
    }
    Write-Host "✓ Frontend Development Server (Ports 5173-5180) - Allowed" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "   Firewall Configuration Complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "All Editron services are now allowed through Windows Firewall." -ForegroundColor Green
    Write-Host "You can now access the application without network connection issues." -ForegroundColor Green
    
} catch {
    Write-Host "Error configuring firewall: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Please ensure you're running as Administrator and try again." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
