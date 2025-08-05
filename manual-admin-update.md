# Manual Admin Panel Update for Production Server

## Current Issue
Your production server at 103.7.4.183:3000 is serving a basic landing page instead of the comprehensive admin panel at `/admin`.

## Solution: Manual Update Commands

SSH into your server and run these commands:

```bash
ssh root@103.7.4.183
cd /opt/xray-socks5

# Stop the service
systemctl stop xray-socks5

# Check current server structure
ls -la

# Update the server.js with comprehensive admin panel
# Replace the current admin route with the full admin panel
```

## Alternative: Quick Admin Panel Test

Try accessing these URLs directly:

1. **Main site**: http://103.7.4.183:3000/
2. **Admin panel**: http://103.7.4.183:3000/admin
3. **API test**: http://103.7.4.183:3000/api/health

## Current Status Check

Let me verify what API endpoints are working: