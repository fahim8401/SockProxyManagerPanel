#!/bin/bash

# Comprehensive NAT Routing Test Script
# Tests if our SOCKS5 implementation properly routes through assigned IPs

red='\033[0;31m'
green='\033[0;32m'
blue='\033[0;34m'
yellow='\033[0;33m'
plain='\033[0m'

echo -e "${blue}SOCKS5 NAT Routing Comprehensive Test${plain}"
echo "=============================================="

# Test 1: Check if SOCKS5 server is running
echo -e "\n${yellow}Test 1: SOCKS5 Server Status${plain}"
if netstat -tlnp 2>/dev/null | grep -q ":1080"; then
    echo -e "${green}✓ SOCKS5 server is running on port 1080${plain}"
else
    echo -e "${red}✗ SOCKS5 server is not running${plain}"
    exit 1
fi

# Test 2: Check IP routing rules
echo -e "\n${yellow}Test 2: IP Routing Rules${plain}"
echo "Current IP routing table:"
ip route show table main | head -10

# Test 3: Check iptables NAT rules
echo -e "\n${yellow}Test 3: NAT Rules${plain}"
if command -v iptables >/dev/null; then
    echo "POSTROUTING rules:"
    iptables -t nat -L POSTROUTING -n --line-numbers | head -10
    echo -e "\nPREROUTING rules:"
    iptables -t nat -L PREROUTING -n --line-numbers | head -10
else
    echo -e "${yellow}iptables not available${plain}"
fi

# Test 4: Test SOCKS5 connection
echo -e "\n${yellow}Test 4: SOCKS5 Connection Test${plain}"
timeout 5 nc -z localhost 1080
if [ $? -eq 0 ]; then
    echo -e "${green}✓ Can connect to SOCKS5 proxy${plain}"
else
    echo -e "${red}✗ Cannot connect to SOCKS5 proxy${plain}"
fi

# Test 5: Check network interfaces
echo -e "\n${yellow}Test 5: Network Interfaces${plain}"
echo "Available network interfaces:"
ip addr show | grep -E "^[0-9]+:|inet " | head -10

# Test 6: Test external IP detection
echo -e "\n${yellow}Test 6: External IP Detection${plain}"
echo "Server's external IP:"
for service in "https://api.ipify.org" "https://4.ident.me" "https://icanhazip.com"; do
    ip=$(curl -s --max-time 3 $service 2>/dev/null)
    if [[ -n "$ip" ]]; then
        echo "  $service: $ip"
        break
    fi
done

# Test 7: DNS resolution
echo -e "\n${yellow}Test 7: DNS Resolution${plain}"
if nslookup google.com >/dev/null 2>&1; then
    echo -e "${green}✓ DNS resolution working${plain}"
else
    echo -e "${red}✗ DNS resolution failed${plain}"
fi

# Test 8: Check if we can reach external sites
echo -e "\n${yellow}Test 8: External Connectivity${plain}"
if curl -s --max-time 5 https://google.com >/dev/null; then
    echo -e "${green}✓ External connectivity working${plain}"
else
    echo -e "${red}✗ External connectivity failed${plain}"
fi

echo -e "\n${blue}Test completed!${plain}"