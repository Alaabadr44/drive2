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
echo "🚀 Starting Docker Compose with APP_URL=https://$HOST_IP"

# Export the variable so docker-compose can see it
export HOST_IP=$HOST_IP

# Run docker-compose
docker-compose up -d --build
