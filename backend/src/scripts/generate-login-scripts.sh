#!/bin/bash

# Configuration
BASE_URL="$1"
OUTPUT_DIR="generated_scripts"
DB_CONTAINER="drive2-postgres-1" # Default, can be overridden or found dynamically
DB_USER="postgres"
DB_NAME="kiosk_db"
SCREEN_PASSWORD="12345678"

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

# Define Password Map Function
get_restaurant_password() {
    local name="$1"
    case "$name" in
        "DAILY DOSE") echo "u94x3n07" ;;
        "DARS") echo "wg3or7ne" ;;
        "HOWLIN BIRDS") echo "4iua4ubh" ;;
        "JAIL BIRD") echo "owzmdrp2" ;;
        "LYCHTEE") echo "h1avbdw8" ;;
        "MAINE") echo "gsuiypk9" ;;
        "MEAT BARTY") echo "h5qwpngl" ;;
        "NUDE BAKERY") echo "qh55mpqm" ;;
        "PAO") echo "qnb7z9ks" ;;
        "SAINTS") echo "uppdvje3" ;;
        *) echo "CHANGE_ME" ;;
    esac
}

# Fetch Users from Database
# We use docker exec to run psql. We assume the container is running.
# We fetch: email, role, username, restaurant.nameEn, screen.name
echo "Fetching users from database..."

# Try to find the actual container name if using compose
AUTO_CONTAINER=$(docker ps --format "{{.Names}}" | grep postgres | head -n 1)
if [ ! -z "$AUTO_CONTAINER" ]; then
    DB_CONTAINER="$AUTO_CONTAINER"
fi

echo "Using DB Container: $DB_CONTAINER"

# SQL Query
# Note: TypeORM usually names tables as "user", "restaurant", "screen".
# Quotation marks around "user" are critical because it's a reserved word.
SQL_QUERY="COPY (
  SELECT 
    u.email, 
    u.role, 
    u.username, 
    COALESCE(r.\"nameEn\", '') as r_name, 
    COALESCE(s.name, '') as s_name 
  FROM \"user\" u 
  LEFT JOIN restaurant r ON u.\"restaurantId\" = r.id 
  LEFT JOIN screen s ON u.\"screenId\" = s.id 
  WHERE u.role IN ('RESTAURANT', 'SCREEN')
) TO STDOUT WITH CSV HEADER;"

# Read line by line
# We use a while loop processing the output of the docker command
# We use ' || true' to prevent script exit if docker command fails deeply, though we should handle it.
QUERY_OUTPUT=$(docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "$SQL_QUERY")

if [ $? -ne 0 ]; then
    echo "❌ Failed to connect to database or execute query."
    echo "Make sure the database container is running."
    exit 1
fi

# Process the CSV output
echo "$QUERY_OUTPUT" | while IFS=',' read -r email role username r_name s_name; do
    # Skip header
    if [[ "$email" == "email" ]]; then continue; fi
    
    # Remove carriage returns if any (from docker output)
    email=$(echo "$email" | tr -d '\r')
    role=$(echo "$role" | tr -d '\r')
    username=$(echo "$username" | tr -d '\r')
    r_name=$(echo "$r_name" | tr -d '\r')
    s_name=$(echo "$s_name" | tr -d '\r')

    # Basic cleaning of CSV quotes if present (psql CSV might add quotes)
    # This simple parsing assumes no commas INSIDE the fields, which is safe for these specific fields (names/emails).
    # true CSV parsing in bash is hard, but we can rely on our specific data structure.

    PASSWORD=""
    NAME=""
    TYPE=""

    if [[ "$role" == "SCREEN" ]]; then
        PASSWORD="$SCREEN_PASSWORD"
        NAME="${s_name}"
        if [ -z "$NAME" ]; then NAME="$username"; fi
        TYPE="Screen"
    elif [[ "$role" == "RESTAURANT" ]]; then
        NAME="${r_name}"
        if [ -z "$NAME" ]; then NAME="$username"; fi
        PASSWORD=$(get_restaurant_password "$NAME")
        TYPE="Restaurant"
    fi

    # Sanitize Filename: lowercase, replace non-alphanum with _
    SAFE_NAME=$(echo "$NAME" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/_/g')
    FILENAME="${TYPE}_${SAFE_NAME}.bat"
    FILEPATH="$OUTPUT_DIR/$FILENAME"

    # URL Encoding (Basic bash implementation)
    # Python is usually available on Mac/Linux, used for reliable encoding
    encode_uri() {
        # Fallback to python if possible, or simple sed
        # Using python3 for reliability
        python3 -c "import urllib.parse; print(urllib.parse.quote('''$1'''))" 2>/dev/null || \
        echo "$1" # Fallback if python missing (unsafe but usually works for simple emails)
    }

    EMAIL_ENC=$(encode_uri "$email")
    PASS_ENC=$(encode_uri "$PASSWORD")
    
    LOGIN_URL="${CLEAN_BASE_URL}/login?email=${EMAIL_ENC}&password=${PASS_ENC}&autologin=true"

    # Generate BAT Content
    # Using 'cat <<EOF' to variable
    
    cat > "$FILEPATH" <<EOF
@echo off
:: Auto-generated login script for ${NAME} (${TYPE})
:: Generated on $(date)

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

REM Launch Chrome in kiosk mode with touch gesture fixes
start "" "%chrome_path%" ^
 --kiosk ^
 --disable-pinch ^
 --overscroll-history-navigation=0 ^
 --ignore-certificate-errors ^
 "${LOGIN_URL}"
exit /b 0
EOF

    echo "✅ Generated: $FILENAME"

done

echo ""
echo "🎉 Successfully generated scripts."
