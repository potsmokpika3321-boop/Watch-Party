@echo off
echo ========================================
echo    NSIS Setup for WatchParty
echo ========================================
echo.

REM Check if NSIS is already installed
if exist "C:\Program Files (x86)\NSIS\makensis.exe" (
    echo NSIS is already installed via Chocolatey.
    cmd /c "C:\Program Files (x86)\NSIS\makensis.exe" /VERSION
    echo.
    echo You can now use 'build-nsis.bat' to build the installer.
    echo.
    goto :eof
)

echo NSIS not found. Installing via Chocolatey...
echo.

choco install nsis -y

if %errorlevel% equ 0 (
    echo.
    echo SUCCESS: NSIS installed successfully!
    echo.
    if exist "C:\Program Files (x86)\NSIS\makensis.exe" (
        cmd /c "C:\Program Files (x86)\NSIS\makensis.exe" /VERSION
    )
    echo.
    echo You can now use 'build-nsis.bat' to build the installer.
) else (
    echo.
    echo ERROR: Failed to install NSIS via Chocolatey.
    echo Please install NSIS manually from: https://nsis.sourceforge.io/Download
)

echo.
pause