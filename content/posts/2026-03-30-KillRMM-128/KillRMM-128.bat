@echo off
REM KillRMM (KillAEM, CentraKill) by SEAGULL (2013-2019)
echo KillRMM^: Datto RMM Agent Removal Tool ^| Build 128/September '19
echo ===============================================================

REM ============================================================== BOILERPLATE ==============================================================

REM Find Windows version
for /F "usebackq delims=" %%a in (`WMIC /interactive:off DATAFILE WHERE ^"Name^='C:\\Windows\\System32\\kernel32.dll'^" get Version ^| findstr .`) do for /F "usebackq tokens=4 delims=." %%b in ('^""echo .%%a.^"') do set /a varKernelVer=%%b
for /f "skip=1 usebackq tokens=*" %%o in (`wmic path win32_operatingsystem get caption`) do if not defined varOSCaption set varOSCaption=%%o
if not defined varOSCaption set varOSCaption=Microsoft Windows

REM Keep current folder as a variable
set varHomeDirectory=%CD%

REM Find device type
for /f "usebackq skip=1" %%v in (`wmic computersystem get domainrole ^| findstr /r /v "^$"`) do set /a varDomainRole=%%v
if %varDomainRole% leq 1 (set varDeviceType=Workstation) else (set varDeviceType=Server)

REM Find architecture & set variables that rely on it
set varCSProgramFiles=%programfiles%
if defined ProgramFiles(x86) (set varArch=64) else (set varArch=86)
if %varArch% equ 64 set varCSProgramFiles=%programfiles(x86)%
if %varArch% equ 86 (set varRegPath=HKLM\Software) else (set varRegPath=HKLM\Software\Wow6432Node)

REM Find the correct location of user data (MUI)
for /f "usebackq tokens=2 delims=:" %%j in (`reg query ^"HKLM\Software\Microsoft\Windows\CurrentVersion\Explorer\Shell Folders^" /v ^"Common AppData^"`) do (
	set varConfig="%systemDrive%%%j\CentraStage"
)

REM Locate installation UID of Splashtop Streamer
for /f "usebackq tokens=3" %%s in (`reg query "%varRegPath%\Splashtop Inc." /s 2^> nul ^| findstr /i "PRODUCTID" 2^> nul`) do set varStreamerUID=%%s

REM ================================================================= MAIN =================================================================

REM Echo this information
echo %varDeviceType%, build %varKernelVer% x%varArch%: %varOSCaption%
echo ===============================================================

REM Make sure script isn't being run as a component
if defined cs_profile_name (echo ERROR: Script being run as a Datto RMM Component.)
if defined cs_profile_name (echo You cannot use Datto RMM to uninstall itself.)
if defined cs_profile_name (echo Please use the script in the form it was distributed.)
if defined cs_profile_name (exit)

REM Check administrative privileges; varAdminCheck should be zero
net session >nul 2>&1
set varAdminCheck=%errorlevel%

if %varAdminCheck% neq 0 (echo ERROR: Administrative privileges required.)
if %varAdminCheck% neq 0 (echo Please right-click the Batch file and select "Run as Administrator".)
if %varAdminCheck% neq 0 (pause && exit)

echo This script completely removes the Agent from a Windows Endpoint.
echo You have received this script from a Datto support delegate.
echo This script is not for general usage and should not be shared.
echo Please only use this script if you have been instructed to.
set varContinuePrompt1=y
set /p varContinuePrompt1=   - - - Press ENTER to agree or N to abort - - - :   
if /i %varContinuePrompt1%==N (
	echo.
	echo - KillRMM procedure aborted. Exiting...
	ping -n 6 127.0.0.1 > nul
	exit
)

echo ===============================================================
echo.

REM ============================================================== AGENT LOCATION ==============================================================

REM Pinpoint location of executable and auto-suggest location
cd %varCSProgramFiles%
for /f "usebackq tokens=*" %%i in (`dir /s /b CagService.exe 2^>nul`) do set varAgentLocation=%%i
cd %varHomeDirectory%
set varAgentLocation=%varAgentLocation:~0,-15%
echo %varAgentLocation% | findstr "~" >nul 2>&1
if %errorlevel% equ 0 (echo Agent installation could not be found: Removing remnant folders.) else (echo Agent installation found at "%varAgentLocation%".)
echo = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =
set varContinuePrompt2=y
set /p varContinuePrompt2=Press ENTER to commence uninstallation or N to cancel: 
echo.
if /i %varContinuePrompt2% neq N (goto KillService)
echo - KillRMM procedure aborted. Exiting...
ping -n 6 127.0.0.1 > nul
exit

REM ============================================================ DISABLE COMPONENTS =============================================================

:KillService
REM Destroy the service
sc stop CagService >nul 2>&1
ping -n 3 127.0.0.1 > nul
echo - Agent service stopped

REM None of these should be running, but destroy them anyway to make sure
taskkill /f /im gui.exe >nul 2>&1
taskkill /f /im CagService.exe >nul 2>&1
taskkill /f /im AEMAgent.exe >nul 2>&1
taskkill /f /im aria2c.exe >nul 2>&1
echo - Agent processes killed

REM =========================================================== DELETE DELETE DELETE ============================================================

if exist "%varAgentLocation%\uninst.exe" (start "" "%varAgentLocation%\uninst.exe")
ping -n 10 127.0.0.1 > nul
rd /s /q "%varAgentLocation%" >nul 2>&1
echo - Agent uninstalled
echo - Agent installation directory removed

REM System-level config files: 2600 (XP32)
if %varKernelVer% lss 5000 if %varDeviceType% equ Workstation if %varArch% equ 86 (rd /s /q "%userprofile%\..\LocalService\Local Settings\Application Data\CentraStage" >nul 2>&1)
REM System-level config files: 3790 (server '03 and XP64)
if %varKernelVer% lss 5000 if %varDeviceType% equ Server (rd /s /q "%userprofile%\..\Default User\Local Settings\Application Data\CentraStage" >nul 2>&1)
if %varKernelVer% lss 5000 if %varDeviceType% equ Workstation if %varArch% equ 64 (rd /s /q "%userprofile%\..\Default User\Local Settings\Application Data\CentraStage" >nul 2>&1)
REM System-level config files: Vista+
if %varKernelVer% geq 5000 (rd /s /q "%systemroot%\System32\config\systemprofile\AppData\Local\CentraStage" >nul 2>&1)
if %varKernelVer% geq 5000 (rd /s /q "%systemroot%\SysWOW64\System32\config\systemprofile\AppData\Local\Service" >nul 2>&1)
REM warp (appears to only be present on 64-bit vista+)
if %varKernelVer% geq 5000 (rd /s /q "%systemroot%\System32\config\systemprofile\AppData\Local\warp\packages\AEMAgent.exe" >nul 2>&1)
REM SysWOW64, just to be 100% sure
if %varKernelVer% geq 5000 if %varArch% equ 64 (rd /s /q "%systemroot%\SysWOW64\config\systemprofile\AppData\Local\CentraStage" >nul 2>&1)
echo - Agent Config file folders removed
REM AEMAgent in Temp dir -- NEW! for Sep 2019
rd /s /q "C:\Windows\Temp\.net\AEMAgent"
echo - AEMAgent Temp directory removed

REM Common AppData config files (ProgramData/All Users)
rd /s /q %varConfig% >nul 2>&1

REM User config files
echo = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =
echo Remove configuration data (saved RDP passwords, window positions)?
set varContinuePrompt3=y
set /p varContinuePrompt3=Press ENTER to confirm or N to decline: 
echo = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =
if /i %varContinuePrompt3% equ N (goto Registry)

if %varKernelVer% lss 5000 (rd /s /q "%userprofile%\Local Settings\Application Data\CentraStage" >nul 2>&1)
if %varKernelVer% geq 5000 (rd /s /q "%userprofile%\AppData\Local\CentraStage" >nul 2>&1)
echo - Agent Auxiliary Data folder removed

:Registry
REM Remove various Agent registry keys
reg delete HKEY_CLASSES_ROOT\cag /f >nul 2>&1
reg delete HKEY_LOCAL_MACHINE\SOFTWARE\CentraStage /f >nul 2>&1
reg delete "%varRegPath%\Microsoft\Windows\CurrentVersion\Run" /v "CentraStage" /f >nul 2>&1
reg delete "%varRegPath%\Microsoft\Windows\CurrentVersion\Run" /v "Panda Cloud Systems Management" /f >nul 2>&1
echo - Agent Registry keys removed

REM Splashtop is over (if you want it)
if not defined varStreamerUID (goto Finished)
echo Splashtop Streamer detected. Remove it? ^(~3 Min.^)
set varContinuePrompt4=y
set /p varContinuePrompt4=Press ENTER to proceed or N to skip: 
if /i %varContinuePrompt4% equ N (goto Finished)

start "" /wait msiexec /x%varStreamerUID%
echo - Splashtop Streamer uninstalled (you may need to reboot)
goto Finished

:Finished
echo.
echo - Total uninstallation routine completed.
echo.
pause
exit