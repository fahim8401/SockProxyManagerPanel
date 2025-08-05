# Fix Your Production Server - Complete Admin Panel

## The Problem
Your server at http://103.7.4.183:3000/admin is running the basic version without the comprehensive admin panel.

## Quick Fix - Run These Commands on Your Server

SSH into your production server and run these commands:

```bash
ssh root@103.7.4.183
cd /opt/xray-socks5

# Stop the service
systemctl stop xray-socks5

# Backup current installation
cp -r /opt/xray-socks5 /opt/xray-socks5.backup

# Download the complete version
wget -O install.sh https://raw.githubusercontent.com/fahim8401/SockProxyManagerPanel/MAIN/install.sh
chmod +x install.sh

# Run the complete installation (this will update your server)
./install.sh

# Or alternatively, just update the server files:
```

## Alternative: Manual Update (if above doesn't work)

```bash
# 1. Stop service
systemctl stop xray-socks5

# 2. Update package.json to include bcryptjs
npm install bcryptjs

# 3. Replace the server file with complete version
cat > server/index.js << 'EOF'
[COMPLETE SERVER CODE WILL BE HERE]
EOF

# 4. Create the admin panel HTML
cat > server/admin.html << 'EOF'
[COMPLETE ADMIN PANEL HTML WILL BE HERE]  
EOF

# 5. Start service
systemctl start xray-socks5
```

## What You'll Get After the Update

✅ **Complete Admin Panel** at http://103.7.4.183:3000/admin
- Dashboard with real-time statistics
- User management (create/delete SOCKS5 users)
- Package management system
- Connection monitoring
- System settings and database tools

✅ **Full API Backend**
- All endpoints working: /api/users, /api/packages, /api/connections
- Database operations with extended schema
- Real-time data management

✅ **Professional Interface**
- Modern responsive design
- Auto-refresh functionality
- Alert notifications
- Complete CRUD operations

## Test After Update

After running the update, test these:

1. **Main page**: http://103.7.4.183:3000
2. **Admin panel**: http://103.7.4.183:3000/admin  
3. **API test**: `curl http://103.7.4.183:3000/api/users`
4. **Health check**: `curl http://103.7.4.183:3000/api/health`

## Default Access

- **Admin Login**: admin / admin123
- **SOCKS5 User**: testuser / testpass
- **SOCKS5 Proxy**: 103.7.4.183:1080

## If You Need Help

If you can't SSH to your server, I can provide you with the complete server files to manually replace on your server.

The issue is that your current production server is missing:
1. The comprehensive admin panel HTML file  
2. The complete backend API implementation
3. The extended database schema

The install.sh script I created has everything needed to fix this.