@echo off
:: Auto-generated login script for MEAT BARTY (Restaurant)
:: Generated on 2026-01-10 11:21:45.181027 from credentials file

REM Check if Google Chrome is installed
set "chrome_path="

if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    set "chrome_path=C:\Program Files\Google\Chrome\Application\chrome.exe"
) else if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    set "chrome_path=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
) else if exist "C:\Users\%USERNAME%\AppData\Local\Google\Chrome\Application\chrome.exe" (
    set "chrome_path=C:\Users\%USERNAME%\AppData\Local\Google\Chrome\Application\chrome.exe"
)

if not defined chrome_path (
    echo Google Chrome executable not found in common locations.
    pause
    exit /b 1
)

REM Launch Chrome in kiosk mode
start "" "%chrome_path%" ^
 --kiosk ^
 --disable-pinch ^
 --overscroll-history-navigation=0 ^
 --ignore-certificate-errors ^
 "https://192.168.1.182/login?email=MEATBARTY@RSWaterway.com&password=h5qwpngl&autologin=true"
exit /b 0
