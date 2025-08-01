#!/bin/bash

echo "🔧 Ubuntu SOCKS5 Proxy Global Access Fix"
echo "========================================"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ This script must be run as root (use sudo)"
    exit 1
fi

echo "1. Opening firewall ports..."

# Open port 1080 for SOCKS5 proxy
ufw allow 1080/tcp
echo "✅ Opened port 1080 (SOCKS5 proxy)"

# Open port 5000 for admin panel (optional)
ufw allow 5000/tcp
echo "✅ Opened port 5000 (Admin panel)"

# Enable UFW if not already enabled
ufw --force enable
echo "✅ Firewall enabled"

echo ""
echo "2. Checking current firewall status..."
ufw status numbered

echo ""
echo "3. Testing port connectivity..."

# Check if ports are listening
echo "Checking port 1080:"
netstat -tlnp | grep 1080 || echo "❌ Port 1080 not listening"

echo "Checking port 5000:"
netstat -tlnp | grep 5000 || echo "❌ Port 5000 not listening"

echo ""
echo "4. Network configuration check..."
echo "Server IP addresses:"
ip addr show | grep "inet " | grep -v "127.0.0.1"

echo ""
echo "🎯 SOCKS5 Global Access Configuration Complete!"
echo ""
echo "Your SOCKS5 proxy should now be accessible globally on:"
echo "  IP: $(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_SERVER_IP')"
echo "  Port: 1080"
echo ""
echo "Test command:"
echo "  curl --socks5 test:1234@$(curl -s ifconfig.me):1080 https://ip.gs"
echo ""
echo "If still not working, check your VPS provider's firewall settings."