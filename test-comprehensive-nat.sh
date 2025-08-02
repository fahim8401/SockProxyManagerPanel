#!/bin/bash

echo "🧪 Testing Comprehensive NAT Routing for SOCKS5 Users"
echo "===================================================="

# Test multiple services to verify ALL traffic goes through assigned IPs
echo ""
echo "🌐 Testing routeduser1 (should show 103.7.4.182 for ALL services):"
echo "------------------------------------------------------------"

echo "📍 Testing ip.gs:"
curl --socks5 routeduser1:pass123@localhost:1080 https://ip.gs --max-time 10 2>/dev/null || echo "Failed"

echo "📍 Testing httpbin.org/ip:"
curl --socks5 routeduser1:pass123@localhost:1080 https://httpbin.org/ip --max-time 10 2>/dev/null | grep origin || echo "Failed"

echo "📍 Testing ifconfig.me:"
curl --socks5 routeduser1:pass123@localhost:1080 https://ifconfig.me --max-time 10 2>/dev/null || echo "Failed"

echo "📍 Testing ipinfo.io:"
curl --socks5 routeduser1:pass123@localhost:1080 https://ipinfo.io/ip --max-time 10 2>/dev/null || echo "Failed"

echo ""
echo "🌐 Testing routeduser2 (should show 103.7.4.183 for ALL services):"
echo "------------------------------------------------------------"

echo "📍 Testing ip.gs:"
curl --socks5 routeduser2:pass123@localhost:1080 https://ip.gs --max-time 10 2>/dev/null || echo "Failed"

echo "📍 Testing httpbin.org/ip:"
curl --socks5 routeduser2:pass123@localhost:1080 https://httpbin.org/ip --max-time 10 2>/dev/null | grep origin || echo "Failed"

echo "📍 Testing ifconfig.me:"
curl --socks5 routeduser2:pass123@localhost:1080 https://ifconfig.me --max-time 10 2>/dev/null || echo "Failed"

echo "📍 Testing ipinfo.io:"
curl --socks5 routeduser2:pass123@localhost:1080 https://ipinfo.io/ip --max-time 10 2>/dev/null || echo "Failed"

echo ""
echo "✅ Test completed. All services should show the same assigned IP for each user."
echo "💡 If all services show the same IP for each user, NAT routing is working correctly."
echo "⚠️ If different IPs are shown, traffic is not going through assigned IPs properly."