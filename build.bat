@echo off
echo ========================================
echo    WatchParty Installer Builder
echo ========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if npm is available
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm is not available
    pause
    exit /b 1
)

echo Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Building Electron app and NSIS installer...
echo This may take a few minutes...
echo.

call npx electron-builder --win --publish=never
if %errorlevel% neq 0 (
    echo ERROR: Failed to build installer
    pause
    exit /b 1
)

echo.
echo ========================================
echo    Build completed successfully!
echo ========================================
echo.
echo Installer created: dist\WatchParty Setup 1.1.0.exe
echo.
echo You can now distribute this installer to users.
echo They can install WatchParty like any other Windows application.
echo.
pause
