# Editron - Stop All Services (PowerShell)
Write-Host "========================================" -ForegroundColor Red
Write-Host "   Stopping Editron Services" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Red
Write-Host ""

# Function to stop processes on specific ports
function Stop-ProcessOnPort {
    param([int]$Port, [string]$ServiceName)
    
    try {
        $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        if ($connections) {
            Write-Host "Stopping $ServiceName (Port $Port)..." -ForegroundColor Yellow
            foreach ($connection in $connections) {
                $processId = $connection.OwningProcess
                Write-Host "  Killing process $processId" -ForegroundColor Gray
                Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
            }
            Write-Host "  ✓ $ServiceName stopped" -ForegroundColor Green
        } else {
            Write-Host "$ServiceName (Port $Port) - No running process found" -ForegroundColor Gray
        }
    } catch {
        Write-Host "Error stopping $ServiceName`: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Stop all services by port
Stop-ProcessOnPort -Port 3000 -ServiceName "Code Editor API"
Stop-ProcessOnPort -Port 5000 -ServiceName "User Management API"  
Stop-ProcessOnPort -Port 8000 -ServiceName "Educational Platform API"
Stop-ProcessOnPort -Port 5178 -ServiceName "React Frontend"

Write-Host ""
Write-Host "Cleaning up any remaining processes..." -ForegroundColor Yellow

# Stop processes by command line patterns (more targeted)
$processes = @(
    @{ Pattern = "*node dist/server.js*"; Name = "Code Editor API" },
    @{ Pattern = "*npm run dev*"; Name = "Development servers" },
    @{ Pattern = "*uvicorn app.main:app*"; Name = "Educational Platform API" },
    @{ Pattern = "*vite*"; Name = "Vite dev server" }
)

foreach ($proc in $processes) {
    try {
        $runningProcs = Get-WmiObject Win32_Process | Where-Object { $_.CommandLine -like $proc.Pattern }
        if ($runningProcs) {
            Write-Host "Stopping $($proc.Name)..." -ForegroundColor Yellow
            $runningProcs | ForEach-Object { 
                Write-Host "  Killing PID $($_.ProcessId)" -ForegroundColor Gray
                Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue 
            }
        }
    } catch {
        # Ignore errors
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   All Services Stopped!" -ForegroundColor Green  
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Start-Sleep -Seconds 2
