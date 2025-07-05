# Editron - Quick Start Guide

## Prerequisites (Install these first)
1. **Node.js**: https://nodejs.org/ (LTS version)
2. **Python**: https://python.org/downloads/ (3.9+)
3. **Docker Desktop**: https://www.docker.com/products/docker-desktop/

## Quick Setup (5 minutes)

### 1. Install Dependencies
```bash
# In project root
npm install

# Install API dependencies
cd Api1 && npm install && npm run build && cd ..
cd Api2 && npm install && npm run build && cd ..
cd Api3 && pip install -r requirements.txt && cd ..
```

### 2. Start Everything
```bash
# Double-click this file or run in terminal
start-all.bat
```

### 3. Open Application
- **Main App**: http://localhost:5178
- **Create Account**: Click "Sign Up" to register

## That's it! 🎉

The application should now be running with:
- ✅ Frontend (React)
- ✅ Code Editor API (Docker integration)  
- ✅ User Management API
- ✅ Educational Platform API

## To Stop
```bash
stop-all.bat
```

## Troubleshooting
- **Docker not working?** → Make sure Docker Desktop is running
- **Port conflicts?** → Run `stop-all.bat` first
- **Dependencies issues?** → See full `SETUP_GUIDE.md`

---
*For detailed instructions and troubleshooting, see the complete `SETUP_GUIDE.md`*
