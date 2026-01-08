#!/bin/bash

# Detect OS
OS="$(uname)"
HOST_IP=""

# IP Detection Table
echo "---------------------------------------"
echo "📡 Available IP Addresses:"
hostname -I | tr ' ' '\n' | grep -v '^$' | nl -w2 -s') '
echo "---------------------------------------"
read -r -p "Enter the Number of the IP to use (or type a manual IP): " ip_choice

# Logic to pick IP
detected_ips=($(hostname -I))
if [[ "$ip_choice" =~ ^[0-9]+$ ]] && [ "$ip_choice" -le "${#detected_ips[@]}" ] && [ "$ip_choice" -gt 0 ]; then
    HOST_IP=${detected_ips[$((ip_choice-1))]}
elif [[ "$ip_choice" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    HOST_IP=$ip_choice
else
    # Default to first IP if invalid
    HOST_IP=${detected_ips[0]}
    echo "⚠️  Invalid choice. Defaulting to $HOST_IP"
fi

echo "✅ Selected IP: $HOST_IP"

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
echo "4) � Restart All    (No Build, Fast)"
echo "5) �🚪 Exit           (Do nothing)"
echo "---------------------------------------"
read -r -p "Enter choice [1-5]: " choice

# Check if docker-compose exists, otherwise use "docker compose"
DOCKER_CMD="docker compose"
if command -v docker-compose &> /dev/null; then
    DOCKER_CMD="docker-compose"
fi

case "$choice" in
    1)
        echo "🎨 Building Frontend (No Cache, Forced Recreate)..."
        # Force rebuild of frontend to ensure new index.html is picked up
        $USE_SUDO HOST_IP=$HOST_IP $DOCKER_CMD build --no-cache frontend
        
        # Force recreate containers to apply config changes (ports) and SSL
        $USE_SUDO HOST_IP=$HOST_IP $DOCKER_CMD up -d --force-recreate frontend nginx
        ;;
    2)
        echo "⚙️  Building Backend..."
        # We start nginx too to ensure it picks up new SSL certs
        $USE_SUDO HOST_IP=$HOST_IP $DOCKER_CMD up -d --force-recreate --build backend nginx
        ;;
    3)
        echo "🚀 Full Rebuild..."
        $USE_SUDO HOST_IP=$HOST_IP $DOCKER_CMD up -d --force-recreate --build
        ;;
    4)
        echo "� Restarting Services..."
        $USE_SUDO HOST_IP=$HOST_IP $DOCKER_CMD restart
        ;;
    5)
        echo "�👋 Exiting."
        exit 0
        ;;
    *)
        echo "❌ Invalid choice. Exiting."
        exit 1
        ;;
esac

echo "⏳ Waiting for services to stabilize..."
sleep 5

echo "📊 Container Status:"
$USE_SUDO docker ps

# Check if nginx is running
if ! $USE_SUDO docker ps | grep -q "nginx"; then
    echo "❌ Error: Nginx container is NOT running!"
    echo "📜 Nginx Logs:"
    $USE_SUDO docker logs drive2-nginx-1
fi

echo "✅ Done! Access at https://$HOST_IP"
