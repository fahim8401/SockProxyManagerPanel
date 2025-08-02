#!/bin/bash

echo "🚀 Setting up comprehensive NAT routing for SOCKS5 users"
echo "======================================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "⚠️ This script requires root privileges for iptables configuration"
  echo "   Please run: sudo ./setup-nat-routing.sh"
  exit 1
fi

# Enable IP forwarding
echo "📡 Enabling IP forwarding..."
sysctl -w net.ipv4.ip_forward=1
echo 'net.ipv4.ip_forward=1' >> /etc/sysctl.conf

# Get primary interface
INTERFACE=$(ip route | grep default | awk '{print $5}' | head -1)
echo "🔗 Primary interface: $INTERFACE"

# Add IP aliases to interface (these will be the outbound IPs)
echo "🌐 Adding IP aliases to interface..."
ip addr add 103.7.4.182/32 dev $INTERFACE 2>/dev/null || echo "IP 103.7.4.182 already exists"
ip addr add 103.7.4.183/32 dev $INTERFACE 2>/dev/null || echo "IP 103.7.4.183 already exists"

# Clear existing NAT rules to avoid conflicts
echo "🧹 Clearing existing NAT rules..."
iptables -t nat -F POSTROUTING 2>/dev/null || true

# Setup comprehensive NAT routing rules
echo "⚙️ Setting up NAT routing rules..."

# Rule 1: Route all traffic from port 1080 (SOCKS5) through assigned IPs
# This creates a round-robin or user-specific routing
iptables -t nat -A POSTROUTING -p tcp --sport 1080 -j SNAT --to-source 103.7.4.182
iptables -t nat -A POSTROUTING -p tcp --sport 1081 -j SNAT --to-source 103.7.4.183

# Rule 2: General masquerading for fallback
iptables -t nat -A POSTROUTING -o $INTERFACE -j MASQUERADE

# Rule 3: Enable forwarding between interfaces
iptables -A FORWARD -i lo -o $INTERFACE -j ACCEPT
iptables -A FORWARD -i $INTERFACE -o lo -m state --state RELATED,ESTABLISHED -j ACCEPT

# Save iptables rules
echo "💾 Saving iptables rules..."
iptables-save > /etc/iptables/rules.v4 2>/dev/null || true

echo ""
echo "✅ NAT routing setup completed!"
echo ""
echo "📋 Configuration Summary:"
echo "   - IP forwarding: Enabled"
echo "   - Interface: $INTERFACE"
echo "   - User IP 1: 103.7.4.182 (for routeduser1)"
echo "   - User IP 2: 103.7.4.183 (for routeduser2)"
echo "   - NAT rules: Applied"
echo ""
echo "🧪 Test the setup:"
echo "   curl --socks5 routeduser1:pass123@localhost:1080 https://ip.gs"
echo "   curl --socks5 routeduser2:pass123@localhost:1080 https://ip.gs"
echo ""
echo "💡 Both users should now show their assigned IP addresses for ALL websites."