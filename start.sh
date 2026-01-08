#!/bin/bash

# Detect OS
OS="$(uname)"
HOST_IP=""

if [ "$OS" = "Darwin" ]; then
    # macOS
    HOST_IP=$(ipconfig getifaddr en0)
    # If en0 is empty (e.g. using WiFi on en1 or other), try to find any inet that isn't localhost
    if [ -z "$HOST_IP" ]; then
        HOST_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)
    fi
else
    # Linux (Raspberry Pi, Ubuntu, etc.)
    HOST_IP=$(hostname -I | awk '{print $1}')
fi

if [ -z "$HOST_IP" ]; then
    echo "❌ Could not detect Local IP. Please set HOST_IP manually."
    exit 1
fi

echo "✅ Detected Local IP: $HOST_IP"

# Generate Self-Signed SSL Certificates for this IP
echo "🔒 Generating SSL Certificates for $HOST_IP..."
rm -rf backend/nginx/ssl
mkdir -p backend/nginx/ssl

# Check for openssl
if ! command -v openssl &> /dev/null; then
    echo "❌ Error: 'openssl' is not installed. Cannot generate SSL certificates."
    echo "   Please install openssl (e.g. sudo apt install openssl)"
    exit 1
fi

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout backend/nginx/ssl/server.key \
  -out backend/nginx/ssl/server.crt \
  -subj "/C=US/ST=State/L=City/O=Kiosk/CN=$HOST_IP" \
  -addext "subjectAltName=IP:$HOST_IP" 2>/dev/null || echo "⚠️  OpenSSL modern flags failed, trying legacy..." && \
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout backend/nginx/ssl/server.key \
  -out backend/nginx/ssl/server.crt \
  -subj "/CN=$HOST_IP" 2>/dev/null

# Verify Certificates Exist
if [ ! -f "backend/nginx/ssl/server.crt" ] || [ ! -f "backend/nginx/ssl/server.key" ]; then
    echo "❌ Error: SSL Certificate generation failed!"
    exit 1
fi
echo "✅ SSL Certificates ready."

echo "🚀 Starting Docker Compose with APP_URL=https://$HOST_IP"

# Export the variable so docker-compose can see it
export HOST_IP=$HOST_IP

# Check if user has docker permissions
USE_SUDO=""
if ! docker info > /dev/null 2>&1; then
    echo "⚠️  Docker permission denied. Retrying with sudo..."
    USE_SUDO="sudo"
fi

# Interactive Menu
echo "---------------------------------------"
echo "Select Build Option:"
echo "1) 🎨 Frontend Only  (Safe, keeps data)"
echo "2) ⚙️  Backend Only   (Re-seeds database!)"
echo "3) 🚀 Full Rebuild   (Re-seeds database!)"
echo "4) 🚪 Exit           (Do nothing)"
echo "---------------------------------------"
read -r -p "Enter choice [1-4]: " choice

# Check if docker-compose exists, otherwise use "docker compose"
DOCKER_CMD="docker compose"
if command -v docker-compose &> /dev/null; then
    DOCKER_CMD="docker-compose"
fi

case "$choice" in
    1)
        echo "🎨 Building Frontend (No Cache)..."
        # Force rebuild of frontend to ensure new index.html is picked up
        $USE_SUDO $DOCKER_CMD build --no-cache frontend
        # Start nginx and frontend
        $USE_SUDO $DOCKER_CMD up -d frontend nginx
        ;;
    2)
        echo "⚙️  Building Backend..."
        # We start nginx too to ensure it picks up new SSL certs
        $USE_SUDO $DOCKER_CMD up -d --build backend nginx
        ;;
    3)
        echo "🚀 Full Rebuild..."
        $USE_SUDO $DOCKER_CMD up -d --build
        ;;
    4)
        echo "👋 Exiting."
        exit 0
        ;;
    *)
        echo "❌ Invalid choice. Exiting."
        exit 1
        ;;
esac
