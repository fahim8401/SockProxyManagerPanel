#!/bin/bash

# Test IP routing functionality for SOCKS5 proxy users

echo "🧪 Testing IP Routing for SOCKS5 Proxy Users"
echo "============================================"

# Test routeduser1 (should route through 103.7.4.182)
echo "Testing routeduser1 (expected outbound IP: 103.7.4.182)"
RESULT1=$(curl -s --socks5 routeduser1:pass123@localhost:1080 https://ip.gs)
echo "Actual IP: $RESULT1"

if [ "$RESULT1" = "103.7.4.182" ]; then
    echo "✅ routeduser1 routing SUCCESS - traffic routed through correct IP"
else
    echo "❌ routeduser1 routing FAILED - expected 103.7.4.182, got $RESULT1"
fi

echo ""

# Test routeduser2 (should route through 103.7.4.183)  
echo "Testing routeduser2 (expected outbound IP: 103.7.4.183)"
RESULT2=$(curl -s --socks5 routeduser2:pass123@localhost:1080 https://ip.gs)
echo "Actual IP: $RESULT2"

if [ "$RESULT2" = "103.7.4.183" ]; then
    echo "✅ routeduser2 routing SUCCESS - traffic routed through correct IP"
else
    echo "❌ routeduser2 routing FAILED - expected 103.7.4.183, got $RESULT2"
fi

echo ""
echo "============================================"
echo "🏁 IP Routing Test Complete"