@echo off
:: Auto-generated login script for SAINTS (Restaurant)
:: Generated on 2026-01-09T20:50:46.827Z

set "ConfigFile=%~dp0browser_choice.txt"
set "ChromeUserDataDir=%TEMP%\ChromeKioskUser_saints"

:CHECK_CONFIG
if exist "%ConfigFile%" (
    set /p BROWSER_CHOICE=<"%ConfigFile%"
) else (
    goto :l_ask_browser
)

:l_launch
:: Clean up temp user dir to ensure flags work
rmdir /s /q "%ChromeUserDataDir%" >nul 2>&1

echo Launching Kiosk Mode for SAINTS...
if /i "%BROWSER_CHOICE%"=="edge" goto :l_edge
if /i "%BROWSER_CHOICE%"=="chrome" goto :l_chrome

:: If invalid choice in file, ask again
goto :l_ask_browser

:l_ask_browser
cls
echo ==========================================
echo   Select Browser for SAINTS
echo ==========================================
echo.
echo [1] Microsoft Edge
echo [2] Google Chrome
echo.
set /p CHOICE="Enter choice (1 or 2): "

if "%CHOICE%"=="1" (
    echo edge > "%ConfigFile%"
    set "BROWSER_CHOICE=edge"
    goto :l_launch
)
if "%CHOICE%"=="2" (
    echo chrome > "%ConfigFile%"
    set "BROWSER_CHOICE=chrome"
    goto :l_launch
)
echo Invalid choice.
goto :l_ask_browser

:l_edge
start msedge --kiosk "https://172.20.10.2/login?email=SAINTS%40RSWaterway.com&password=uppdvje3&autologin=true" --edge-kiosk-type=fullscreen --no-first-run --ignore-certificate-errors --user-data-dir="%ChromeUserDataDir%" --use-fake-ui-for-media-stream
exit

:l_chrome
start chrome --kiosk "https://172.20.10.2/login?email=SAINTS%40RSWaterway.com&password=uppdvje3&autologin=true" --ignore-certificate-errors --user-data-dir="%ChromeUserDataDir%" --use-fake-ui-for-media-stream
exit
