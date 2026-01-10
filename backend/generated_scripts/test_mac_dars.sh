#!/bin/bash

# Test script for Mac (DARS Restaurant)
# Uses the same logic as the generated Windows scripts but adapted for macOS zsh

URL="https://172.20.10.2/login?email=DARS%40RSWaterway.com&password=wg3or7ne&autologin=true"

CONFIG_FILE="$(dirname "$0")/.browser_pref"
CHROME_USER_DATA="/tmp/chrome_kiosk_test_$(date +%s)"

# Check for existing config
if [ -f "$CONFIG_FILE" ]; then
    BROWSER_CHOICE=$(cat "$CONFIG_FILE")
else
    # Ask user
    echo "=========================================="
    echo "  Select Browser for Test"
    echo "=========================================="
    echo ""
    echo "[1] Google Chrome (Auto-Login & Bypasses SSL Error) <- CHOOSE THIS"
    echo "[2] Default Browser (Safari/Other - WILL SHOW SSL ERROR)"
    echo ""
    read -p "Enter choice (1 or 2): " CHOICE

    if [ "$CHOICE" == "1" ]; then
        BROWSER_CHOICE="chrome"
        echo "chrome" > "$CONFIG_FILE"
    else
        BROWSER_CHOICE="default"
        echo "default" > "$CONFIG_FILE"
    fi
fi

if [ "$BROWSER_CHOICE" == "chrome" ]; then
    echo "Launching Chrome in Kiosk Mode..."
    open -n -a "Google Chrome" --args --kiosk "$URL" --ignore-certificate-errors --user-data-dir="$CHROME_USER_DATA" --use-fake-ui-for-media-stream
else
    echo "Launching Default Browser..."
    open "$URL"
fi
