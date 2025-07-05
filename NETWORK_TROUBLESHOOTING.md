# Network Connection Troubleshooting Guide

If you're experiencing network connection errors with the Editron platform, follow these steps to resolve the issues.

## Common Network Errors

- "Network error. Please check your internet connection"
- "Network connection error. Please check if the backend services are running"
- "Failed to load books"
- "Service endpoint not found"

## Quick Fix Steps

### 1. Check Service Status
Run the health check script:
```powershell
.\health-check.ps1
```

### 2. Start All Services
If services are not running:
```batch
.\start-all.bat
```

### 3. Configure Windows Firewall (If needed)
If Windows Firewall is blocking connections, run as Administrator:
```powershell
.\configure-firewall.ps1
```

### 4. Manual Service Startup
If the batch script fails, start services manually:

**Code Editor API (Port 3003):**
```bash
cd Api1
npm run build
npm start
```

**User Management API (Port 5000):**
```bash
cd Api2
npm run build  
npm start
```

**Educational Platform API (Port 8000):**
```bash
cd Api3
pip install -r requirements.txt
python -m app.main
```

**Frontend (Port 5178):**
```bash
npm run dev
```

## Windows-Specific Issues

### PowerShell Execution Policy
If you get execution policy errors:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
```

### Windows Firewall
The application uses these ports:
- **3003** - Code Editor API
- **5000** - User Management API  
- **8000** - Educational Platform API
- **5178** - Frontend Development Server

To manually add firewall rules (Run as Administrator):
```batch
netsh advfirewall firewall add rule name="Editron Code Editor API" dir=in action=allow protocol=TCP localport=3003
netsh advfirewall firewall add rule name="Editron User Management API" dir=in action=allow protocol=TCP localport=5000
netsh advfirewall firewall add rule name="Editron Educational Platform API" dir=in action=allow protocol=TCP localport=8000
```

### Windows Defender
If Windows Defender is blocking Node.js or Python:
1. Open Windows Security
2. Go to Virus & threat protection
3. Manage settings under "Virus & threat protection settings"
4. Add exclusions for:
   - The entire Editron project folder
   - Node.js executable
   - Python executable

## Verification Steps

### Test Individual APIs
```powershell
# Test Educational Platform API
Invoke-WebRequest -Uri "http://localhost:8000/docs" -UseBasicParsing

# Test User Management API
Invoke-WebRequest -Uri "http://localhost:5000/api/health" -UseBasicParsing

# Test Code Editor API
Invoke-WebRequest -Uri "http://localhost:3003/api/health" -UseBasicParsing
```

### Test Frontend Connection
1. Open browser to http://localhost:5178
2. Go to Books page
3. Click "Test API Connection" button
4. Check for success message

## Common Port Conflicts

If ports are already in use:

### Find processes using ports:
```powershell
netstat -ano | findstr ":3003"
netstat -ano | findstr ":5000" 
netstat -ano | findstr ":8000"
```

### Kill processes by PID:
```powershell
taskkill /PID <process_id> /F
```

## Additional Resources

- Check logs in individual service windows
- Review browser developer console (F12) for detailed errors
- Ensure all dependencies are installed (`npm install` in each API folder)
- For Python API: ensure virtual environment is activated

## Still Having Issues?

1. Restart all services: `.\stop-all.bat` then `.\start-all.bat`
2. Restart your computer (sometimes required for firewall changes)
3. Run Windows as Administrator and repeat setup steps
4. Check if antivirus software is blocking network connections
