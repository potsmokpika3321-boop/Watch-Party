;NSIS Installer Script for WatchParty
;This script can be used both as an include file for electron-builder
;and as a standalone NSIS script for manual builds

!ifndef STANDALONE_INSTALLER
;Include file mode for electron-builder
!macro customInstall
  ; Add any custom installation steps here
  DetailPrint "Installing WatchParty..."

  ; Create data directory for user settings
  CreateDirectory "$APPDATA\WatchParty"
!macroend

!macro customUnInstall
  ; Add any custom uninstallation steps here
  DetailPrint "Uninstalling WatchParty..."

  ; Remove user data directory
  RMDir /r "$APPDATA\WatchParty"
!macroend

!else
;Standalone installer mode

!include "MUI2.nsh"
!include "FileFunc.nsh"
!include "LogicLib.nsh"

;General Configuration
Name "WatchParty"
OutFile "WatchParty-Setup.exe"
Unicode True
InstallDir "$PROGRAMFILES\WatchParty"
InstallDirRegKey HKCU "Software\WatchParty" ""
RequestExecutionLevel admin

;Modern UI Configuration
!define MUI_ABORTWARNING
!define MUI_ICON "favicon.ico"
!define MUI_UNICON "favicon.ico"
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP "favicon.ico"
!define MUI_WELCOMEFINISHPAGE_BITMAP "favicon.ico"

;Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "LICENSE.txt"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

;Languages
!insertmacro MUI_LANGUAGE "English"

;Version Information
VIProductVersion "1.1.0.0"
VIAddVersionKey "ProductName" "WatchParty"
VIAddVersionKey "CompanyName" "WatchParty Team"
VIAddVersionKey "FileVersion" "1.1.0.0"
VIAddVersionKey "ProductVersion" "1.1.0.0"
VIAddVersionKey "FileDescription" "Watch videos together with synchronized playback"

;Installer Sections
Section "WatchParty" SecApp
  SectionIn RO

  SetOutPath "$INSTDIR"

  ;Copy all application files from the unpacked electron app
  DetailPrint "Installing WatchParty files..."
  File /r "dist\win-unpacked\*.*"

  ;Store installation folder
  WriteRegStr HKCU "Software\WatchParty" "" $INSTDIR

  ;Create uninstaller
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\WatchParty" "DisplayName" "WatchParty"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\WatchParty" "UninstallString" "$INSTDIR\Uninstall.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\WatchParty" "DisplayVersion" "1.1.0"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\WatchParty" "Publisher" "WatchParty Team"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\WatchParty" "DisplayIcon" "$INSTDIR\favicon.ico"
  WriteRegDWord HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\WatchParty" "NoModify" 1
  WriteRegDWord HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\WatchParty" "NoRepair" 1
  ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
  IntFmt $0 "0x%08X" $0
  WriteRegDWord HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\WatchParty" "EstimatedSize" "$0"

SectionEnd

;Shortcuts Section
Section "Desktop Shortcut" SecDesktop
  CreateShortCut "$DESKTOP\WatchParty.lnk" "$INSTDIR\WatchParty.exe" "" "$INSTDIR\favicon.ico" 0
SectionEnd

Section "Start Menu Shortcut" SecStartMenu
  CreateDirectory "$SMPROGRAMS\WatchParty"
  CreateShortCut "$SMPROGRAMS\WatchParty\WatchParty.lnk" "$INSTDIR\WatchParty.exe" "" "$INSTDIR\favicon.ico" 0
  CreateShortCut "$SMPROGRAMS\WatchParty\Uninstall.lnk" "$INSTDIR\Uninstall.exe" "" "$INSTDIR\Uninstall.exe" 0
SectionEnd

;Uninstaller Section
Section "Uninstall"

  ;Stop any running processes
  nsExec::ExecToLog 'taskkill /f /im WatchParty.exe /t'
  nsExec::ExecToLog 'taskkill /f /im node.exe /t'

  ;Remove files and directories
  Delete "$INSTDIR\Uninstall.exe"
  RMDir /r "$INSTDIR"

  ;Remove shortcuts
  Delete "$DESKTOP\WatchParty.lnk"
  RMDir /r "$SMPROGRAMS\WatchParty"

  ;Remove registry entries
  DeleteRegKey HKCU "Software\WatchParty"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\WatchParty"

SectionEnd

;Installer Functions
Function .onInit
  ;Check if already installed
  ReadRegStr $R0 HKCU "Software\WatchParty" ""
  ${If} $R0 != ""
    MessageBox MB_YESNO "WatchParty is already installed. Do you want to reinstall?" IDYES continue
    Abort
    continue:
  ${EndIf}

  ;Check if the unpacked app exists
  IfFileExists "dist\win-unpacked\WatchParty.exe" appExists appMissing
  appMissing:
    MessageBox MB_OK "WatchParty application files not found. Please run 'npm run build:win' first to create the distributable app."
    Abort
  appExists:
FunctionEnd

Function .onInstSuccess
  MessageBox MB_YESNO "Installation completed successfully! Would you like to launch WatchParty now?" IDNO end
  Exec '"$INSTDIR\WatchParty.exe"'
  end:
FunctionEnd

;Uninstaller Functions
Function un.onUninstSuccess
  MessageBox MB_OK "WatchParty has been successfully uninstalled."
FunctionEnd

!endif