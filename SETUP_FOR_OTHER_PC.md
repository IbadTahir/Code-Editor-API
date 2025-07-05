# How to Run Editron on Another PC

## Overview
This guide explains how to set up and run the Editron project on a new Windows computer.

## What You Need
1. **Windows 10 or 11**
2. **Internet connection** (for downloading software)
3. **Administrator privileges** (for software installation)

## Step-by-Step Setup

### 1. Install Required Software

#### Node.js (Required)
1. Go to https://nodejs.org/
2. Download the LTS version (Long Term Support)
3. Run the installer and follow the prompts
4. **Important**: Make sure "Add to PATH" is checked
5. Test installation: Open Command Prompt and type `node --version`

#### Python (Required)
1. Go to https://python.org/downloads/
2. Download Python 3.9 or newer
3. Run the installer
4. **Critical**: Check "Add Python to PATH" during installation
5. Test installation: Open Command Prompt and type `python --version`

#### Docker Desktop (Required for code execution)
1. Go to https://www.docker.com/products/docker-desktop/
2. Download Docker Desktop for Windows
3. Install and restart your computer
4. Start Docker Desktop (should appear in system tray)
5. Test installation: Open Command Prompt and type `docker --version`

### 2. Get the Project Files
1. Copy the entire project folder to your computer
2. Extract if it's in a ZIP file
3. Remember the location (e.g., `C:\Users\YourName\Desktop\Editron`)

### 3. Install Project Dependencies

#### Open Command Prompt as Administrator
1. Press `Windows + R`, type `cmd`, press `Ctrl+Shift+Enter`
2. Navigate to your project folder:
   ```
   cd "C:\path\to\your\Editron\folder"
   ```

#### Install Frontend Dependencies
```bash
npm install
```
*This downloads all frontend dependencies (may take 2-5 minutes)*

#### Install Backend Dependencies
```bash
# Code Editor API
cd Api1
npm install
npm run build
cd ..

# User Management API  
cd Api2
npm install
npm run build
cd ..

# Educational Platform API
cd Api3
pip install -r requirements.txt
cd ..
```
*Each step may take 1-3 minutes*

### 4. Start the Application

#### Method 1: Automatic (Recommended)
1. Double-click `start-all.bat` in the project folder
2. Wait for all services to start (you'll see multiple windows open)
3. Your browser should automatically open to the application

#### Method 2: Manual (if automatic doesn't work)
Open **4 separate Command Prompt windows** and run:

**Window 1 - Code Editor API:**
```bash
cd Api1
npm start
```

**Window 2 - User Management API:**
```bash
cd Api2  
npm start
```

**Window 3 - Educational Platform API:**
```bash
cd Api3
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Window 4 - Frontend:**
```bash
npm run dev
```

### 5. Access the Application
1. Open your web browser
2. Go to: http://localhost:5178 (or http://localhost:5179)
3. You should see the Editron login page

### 6. Create Your Account
1. Click "Sign Up" 
2. Fill in your details
3. Click "Register"
4. Login with your new account

## Stopping the Application

### Automatic Stop:
Double-click `stop-all.bat` in the project folder

### Manual Stop:
Press `Ctrl + C` in each Command Prompt window, then close them

## Troubleshooting

### Problem: "Port already in use"
**Solution:**
1. Run `stop-all.bat`
2. Wait 10 seconds
3. Run `start-all.bat` again

### Problem: Docker not working
**Solution:**
1. Make sure Docker Desktop is running (check system tray)
2. Restart Docker Desktop
3. Try starting the application again

### Problem: Python command not found
**Solution:**
1. Reinstall Python with "Add to PATH" checked
2. Restart Command Prompt
3. Try `python --version` again

### Problem: npm command not found  
**Solution:**
1. Reinstall Node.js
2. Make sure "Add to PATH" is checked
3. Restart Command Prompt

### Problem: Browser shows "Can't connect"
**Solution:**
1. Wait 30 seconds for all services to start
2. Try http://localhost:5179 instead of 5178
3. Check that all 4 Command Prompt windows are running without errors

## What Should Be Running

When everything is working correctly, you should have:
- ✅ 4 Command Prompt windows open (or 1 if using start-all.bat)
- ✅ Docker Desktop running in system tray
- ✅ Website accessible at http://localhost:5178
- ✅ No error messages in the Command Prompt windows

## Application Features

Once running, you can:
- **Create an account** and login
- **Write and run code** in multiple programming languages
- **Create/join rooms** for collaborative coding
- **Browse educational books** and videos
- **Take AI-powered evaluations** and quizzes

## Getting Help

If you encounter issues:
1. Check the troubleshooting section above
2. Look at the detailed `SETUP_GUIDE.md` file
3. Make sure all prerequisite software is installed correctly
4. Verify Docker Desktop is running

## Performance Tips
- **Close other applications** to free up memory
- **Use an SSD** if possible for better performance  
- **Ensure good internet connection** for initial setup
- **Add project folder to antivirus exceptions** to prevent slowdowns

---

*This guide is designed for non-technical users. Follow each step carefully and you should have the application running successfully!*
