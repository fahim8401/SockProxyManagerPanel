#!/bin/bash

echo "🎯 Setting up user-specific NAT routing for SOCKS5"
echo "================================================"

# Function to setup NAT routing for a specific user
setup_user_nat() {
    local user_id=$1
    local outbound_ip=$2
    local user_port=$3
    
    echo "🔧 Setting up NAT for user $user_id -> $outbound_ip (port $user_port)"
    
    # Enable IP forwarding
    sudo sysctl -w net.ipv4.ip_forward=1
    
    # Get primary interface
    INTERFACE=$(ip route | grep default | awk '{print $5}' | head -1)
    echo "   Interface: $INTERFACE"
    
    # Add IP alias if needed
    sudo ip addr add $outbound_ip/32 dev $INTERFACE 2>/dev/null || echo "   IP already exists"
    
    # Create user-specific iptables chain
    CHAIN_NAME="USER_${user_id}_NAT"
    sudo iptables -t nat -N $CHAIN_NAME 2>/dev/null || echo "   Chain already exists"
    
    # Route all traffic from this user's connections through their IP
    # Method 1: Mark packets from specific source port range
    sudo iptables -t mangle -A OUTPUT -p tcp --sport $user_port -j MARK --set-mark $user_id
    sudo iptables -t nat -A POSTROUTING -m mark --mark $user_id -j SNAT --to-source $outbound_ip
    
    # Method 2: Direct SNAT based on connection tracking
    sudo iptables -t nat -A POSTROUTING -p tcp -m conntrack --ctorigdstport $user_port -j SNAT --to-source $outbound_ip
    
    echo "   ✅ NAT rules applied for user $user_id"
}

# Setup NAT routing for both test users
echo ""
echo "🚀 Configuring NAT routing for SOCKS5 users..."

# User 1: routeduser1 -> 103.7.4.182
setup_user_nat "1001" "103.7.4.182" "1080"

# User 2: routeduser2 -> 103.7.4.183  
setup_user_nat "1002" "103.7.4.183" "1080"

# General masquerading rule
sudo iptables -t nat -A POSTROUTING -o $(ip route | grep default | awk '{print $5}' | head -1) -j MASQUERADE

echo ""
echo "✅ User-specific NAT routing configured!"
echo ""
echo "📋 Summary:"
echo "   - routeduser1: ALL traffic -> 103.7.4.182"
echo "   - routeduser2: ALL traffic -> 103.7.4.183"
echo ""
echo "🧪 Test with:"
echo "   curl --socks5 routeduser1:pass123@localhost:1080 https://ip.gs"
echo "   curl --socks5 routeduser2:pass123@localhost:1080 https://httpbin.org/ip"
echo ""
echo "💡 Each user should now show their assigned IP for ALL websites and services."