@echo off
setlocal enabledelayedexpansion
title Tiketa 2.0 - 1-Click Terminal PC Setup

echo ================================================================
echo       FIVE STAR BUS CO. - TIKETA 2.0 PC ENROLLMENT TOOL
echo ================================================================
echo.

:: 1. Configuration (Set your internal server IP or hostname)
set "TIKETA_SERVER=http://localhost:8000"
set "SETUP_KEY=five_star_it_provisioning_key_2026"

:: 2. Auto-detect Computer Name
set "PC_NAME=%COMPUTERNAME%"
echo [*] Detected Computer Name: %PC_NAME%
echo.

:: 3. Select Terminal Hub
echo [?] Select Terminal Location:
echo     [1] Pasay Terminal (PSY)
echo     [2] Cubao Maya (CMA)
echo     [3] Caloocan Terminal (CAL)
echo     [4] Avenida Terminal (AVN)
echo     [5] Meycauayan (MEY)
echo     [6] San Carlos (SNC)
set /p LOC_CHOICE="Enter number (1-6): "

if "%LOC_CHOICE%"=="1" (set "LOC_ID=1" & set "LOC_NAME=Pasay Terminal")
if "%LOC_CHOICE%"=="2" (set "LOC_ID=2" & set "LOC_NAME=Cubao Maya")
if "%LOC_CHOICE%"=="3" (set "LOC_ID=3" & set "LOC_NAME=Caloocan Terminal")
if "%LOC_CHOICE%"=="4" (set "LOC_ID=4" & set "LOC_NAME=Avenida Terminal")
if "%LOC_CHOICE%"=="5" (set "LOC_ID=5" & set "LOC_NAME=Meycauayan")
if "%LOC_CHOICE%"=="6" (set "LOC_ID=6" & set "LOC_NAME=San Carlos")

:: 4. Select Department
echo.
echo [?] Select Department:
echo     [1] Dispatch Office
echo     [2] Cashier / Ticketing Booth
echo     [3] Maintenance / Shop
echo     [4] Accounting
set /p DEPT_CHOICE="Enter number (1-4): "

if "%DEPT_CHOICE%"=="1" (set "DEPT_ID=1" & set "DEPT_NAME=Dispatch")
if "%DEPT_CHOICE%"=="2" (set "DEPT_ID=2" & set "DEPT_NAME=Ticketing Booth")
if "%DEPT_CHOICE%"=="3" (set "DEPT_ID=3" & set "DEPT_NAME=Maintenance Shop")
if "%DEPT_CHOICE%"=="4" (set "DEPT_ID=4" & set "DEPT_NAME=Accounting")

echo.
echo [*] Enrolling %PC_NAME% for %LOC_NAME% - %DEPT_NAME%...

:: 5. Call Tiketa API using built-in Windows curl.exe
set "PAYLOAD={\"device_name\":\"%PC_NAME%\",\"location_id\":%LOC_ID%,\"department_id\":%DEPT_ID%}"

for /f "tokens=*" %%a in ('curl -s -X POST "%TIKETA_SERVER%/api/v1/auth/enroll-device-cli" -H "Content-Type: application/json" -H "X-Setup-Key: %SETUP_KEY%" -d "%PAYLOAD%"') do (
    set "API_RESPONSE=%%a"
)

echo [*] API Response: !API_RESPONSE!

:: 6. Create Desktop Shortcut on Public Desktop (Appears for all user profiles)
set "PUBLIC_DESKTOP=%PUBLIC%\Desktop"
if not exist "%PUBLIC_DESKTOP%" set "PUBLIC_DESKTOP=%USERPROFILE%\Desktop"
set "SHORTCUT_PATH=%PUBLIC_DESKTOP%\🚨 REPORT IT PROBLEM.url"

echo [InternetShortcut] > "%SHORTCUT_PATH%"
echo URL=%TIKETA_SERVER%/report >> "%SHORTCUT_PATH%"
echo IconIndex=0 >> "%SHORTCUT_PATH%"
echo IconFile=C:\Windows\System32\shell32.dll >> "%SHORTCUT_PATH%"

echo.
echo ================================================================
echo    [SUCCESS] %PC_NAME% successfully enrolled!
echo    [SUCCESS] Shortcut placed on Public Desktop:
echo              "%SHORTCUT_PATH%"
echo ================================================================
echo.

:: 7. Launch immediately to verify
start "" "%SHORTCUT_PATH%"

timeout /t 3 >nul
exit /b 0
