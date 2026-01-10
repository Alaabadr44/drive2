#!/bin/bash

# Configuration
BASE_URL="$1"
OUTPUT_DIR="generated_scripts"
CREDENTIALS_FILE="credentials_restored.txt"

# Check arguments
if [ -z "$BASE_URL" ]; then
    echo "❌ Please provide the base URL as an argument (e.g. https://192.168.1.182)"
    exit 1
fi

# Remove trailing slash
CLEAN_BASE_URL=${BASE_URL%/}

# Ensure output directory exists
mkdir -p "$OUTPUT_DIR"
echo "Generating scripts in: $OUTPUT_DIR"
echo "Reading credentials from: $CREDENTIALS_FILE"

if [ ! -f "$CREDENTIALS_FILE" ]; then
    echo "❌ Credentials file not found at $CREDENTIALS_FILE"
    exit 1
fi

# Python script to parse and generate
python3 -c "
import sys
import os
import re
import urllib.parse
from datetime import datetime

base_url = sys.argv[1]
out_dir = sys.argv[2]
cred_file = sys.argv[3]

def clean_filename(name):
    # Lowercase, replace non-alphanum with _
    return re.sub(r'[^a-z0-9]', '_', name.lower())

def generate_bat(type_, name, email, password):
    if not email or not password:
        return

    safe_name = clean_filename(name)
    # Handle 'Screen 1' -> 'Screen_line_1' mapping if needed, or just use 'Screen 1'
    # DB used 'line 1'. File uses 'Screen 1'. 
    # Let's clean the name as is. 'Screen 1' -> 'screen_1'
    
    filename = f'{type_}_{safe_name}.bat'
    
    # URL Encode
    # Keep @ unencoded for cleaner URLs, browsers handle it.
    email_enc = urllib.parse.quote(email, safe='@')
    pass_enc = urllib.parse.quote(password)
    
    login_url = f'{base_url}/login?email={email_enc}&password={pass_enc}&autologin=true'
    
    # ESCAPE % for Windows Batch
    # Batch interprets %40 as a variable. We need %%40.
    # We replace ALL % with %% to handle any encoded chars (like %20 for space) safely.
    login_url_bat = login_url.replace('%', '%%')
    
    content = rf'''@echo off
:: Auto-generated login script for {name} ({type_})
:: Generated on {datetime.now()} from credentials file

REM Check if Google Chrome is installed
set \"chrome_path=\"

if exist \"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe\" (
    set \"chrome_path=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe\"
) else if exist \"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe\" (
    set \"chrome_path=C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe\"
) else if exist \"C:\\Users\\%USERNAME%\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe\" (
    set \"chrome_path=C:\\Users\\%USERNAME%\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe\"
)

if not defined chrome_path (
    echo Google Chrome executable not found in common locations.
    pause
    exit /b 1
)

REM Launch Chrome in kiosk mode
start \"\" \"%chrome_path%\" ^
 --kiosk ^
 --disable-pinch ^
 --overscroll-history-navigation=0 ^
 --ignore-certificate-errors ^
 \"{login_url_bat}\"
exit /b 0
'''
    
    with open(os.path.join(out_dir, filename), 'w') as f:
        f.write(content)
    print(f'✅ Generated: {filename}')

current_type = None
current_name = None
current_email = None
current_pass = None

with open(cred_file, 'r') as f:
    for line in f:
        line = line.strip()
        if not line:
             # End of block, generate if data exists
            if current_type and current_name and current_email and current_pass:
                generate_bat(current_type, current_name, current_email, current_pass)
                # Reset sensitive fields, keep type if needed or reset all
                current_name = None
                current_email = None
                current_pass = None
            continue
            
        if line.startswith('Screen '):
            # Format: 'Screen 1:'
            current_type = 'Screen'
            current_name = line.replace(':', '').strip()
        elif line.startswith('Restaurant:'):
            # Format: 'Restaurant: DAILY DOSE'
            current_type = 'Restaurant'
            current_name = line.split(':', 1)[1].strip()
        elif line.startswith('Email:'):
            current_email = line.split(':', 1)[1].strip()
        elif line.startswith('Password:'):
            current_pass = line.split(':', 1)[1].strip()

    # Handle last block if file doesn't end with empty line
    if current_type and current_name and current_email and current_pass:
        generate_bat(current_type, current_name, current_email, current_pass)

" "$CLEAN_BASE_URL" "$OUTPUT_DIR" "$CREDENTIALS_FILE"

echo ""
echo "🎉 Successfully generated scripts from text file."
