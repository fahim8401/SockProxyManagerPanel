#!/bin/bash

echo "🔍 Checking current NAT routing status"
echo "====================================="

echo ""
echo "📋 Current iptables NAT rules:"
echo "------------------------------"
sudo iptables -t nat -L POSTROUTING -v -n 2>/dev/null || echo "Cannot access iptables (requires sudo)"

echo ""
echo "🌐 Available IP addresses on interfaces:"
echo "----------------------------------------"
ip addr show | grep 'inet ' | awk '{print $2}' | cut -d'/' -f1

echo ""
echo "📡 IP forwarding status:"
echo "------------------------"
cat /proc/sys/net/ipv4/ip_forward

echo ""
echo "🧪 Testing current external IP (direct connection):"
echo "---------------------------------------------------"
curl -s https://ip.gs --max-time 5 || echo "Failed to get external IP"

echo ""
echo "🎯 Testing SOCKS5 users:"
echo "------------------------"
echo "routeduser1 (should show 103.7.4.182 if NAT working):"
curl --socks5 routeduser1:pass123@localhost:1080 https://ip.gs --max-time 10 2>/dev/null || echo "SOCKS5 connection failed"

echo "routeduser2 (should show 103.7.4.183 if NAT working):"
curl --socks5 routeduser2:pass123@localhost:1080 https://ip.gs --max-time 10 2>/dev/null || echo "SOCKS5 connection failed"

echo ""
echo "💡 Analysis:"
echo "   - If both users show their assigned IPs (103.7.4.182/183), NAT routing is working"
echo "   - If both show the same external IP, NAT routing needs configuration"
echo "   - Run 'sudo ./setup-nat-routing.sh' to configure full NAT routing"