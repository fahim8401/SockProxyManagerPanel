# URGENT: Fix Your Production Server

## The Issue
Your server at http://103.7.4.183:3000/admin shows a basic page instead of the full admin panel.

## Immediate Solution

SSH to your server and run these exact commands:

```bash
ssh root@103.7.4.183

# Stop the current service
systemctl stop xray-socks5

# Go to installation directory  
cd /opt/xray-socks5

# Install bcryptjs (missing dependency)
npm install bcryptjs

# Replace server with complete version
wget -O complete-admin-server.js https://raw.githubusercontent.com/fahim8401/SockProxyManagerPanel/MAIN/complete-admin-server.js

# Copy the complete server
cp complete-admin-server.js server/index.js

# Start the service
systemctl start xray-socks5

# Check if it's running
systemctl status xray-socks5
```

## Alternative: Manual File Replacement

If the above doesn't work, manually replace the server file:

1. Download the `complete-admin-server.js` file from this project
2. Copy its contents to `/opt/xray-socks5/server/index.js` on your server
3. Make sure bcryptjs is installed: `npm install bcryptjs` 
4. Restart the service: `systemctl restart xray-socks5`

## What This Fixes

After the update, your admin panel at http://103.7.4.183:3000/admin will have:

✅ **Full Dashboard** - Statistics and system monitoring
✅ **User Management** - Create/delete SOCKS5 users  
✅ **Package Management** - Create subscription packages
✅ **Connection Monitoring** - Active connections tracking
✅ **Settings Panel** - Database cleaning and configuration
✅ **Professional Interface** - Modern responsive design
✅ **All API Endpoints** - Complete backend functionality

## Test After Update

1. Visit: http://103.7.4.183:3000/admin
2. You should see the full professional admin panel
3. Test API: `curl http://103.7.4.183:3000/api/users`
4. Should return JSON data instead of HTML

## Current Problem
Your production server is missing:
- The complete admin panel HTML (embedded in server)
- Full backend API implementation  
- bcryptjs dependency for password hashing
- Extended database schema

The `complete-admin-server.js` file contains everything needed to fix this.