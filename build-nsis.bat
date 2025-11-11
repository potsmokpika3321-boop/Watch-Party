@echo off
echo Building WatchParty NSIS Installer...
echo.

REM Set NSIS path
set NSIS_PATH="C:\Program Files (x86)\NSIS\makensis.exe"

REM Check if NSIS exists
if not exist %NSIS_PATH% (
    echo ERROR: NSIS not found at %NSIS_PATH%.
    echo Please ensure NSIS is installed correctly.
    echo.
    pause
    exit /b 1
)

REM Check if the unpacked app exists
if not exist "dist\win-unpacked\WatchParty.exe" (
    echo ERROR: WatchParty application not found. Please run 'npm run build:win' first.
    echo.
    pause
    exit /b 1
)

REM Build the installer
echo Creating installer...
%NSIS_PATH% /DSTANDALONE_INSTALLER installer.nsh

if %errorlevel% equ 0 (
    echo.
    echo SUCCESS: WatchParty-Setup.exe created successfully!
    echo Installer location: %cd%\WatchParty-Setup.exe
    echo.
) else (
    echo.
    echo ERROR: Failed to create installer.
    echo.
)

pause