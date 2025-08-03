# SOCKS5 Admin Panel - VPS Deployment Instructions

## CRITICAL: Port Conflict Resolution

This deployment package includes a **simple-deploy.sh** script that specifically addresses the port 5000 conflict issues you've been experiencing.

## Quick Deployment (Recommended)

1. Upload the entire `deployment-package` folder to your VPS
2. SSH into your VPS as root
3. Navigate to the deployment package folder
4. Run the deployment script:

```bash
cd deployment-package
chmod +x simple-deploy.sh
sudo ./simple-deploy.sh
```

## What This Script Does

### 🔧 Port Conflict Resolution
- Aggressively kills ALL processes using port 5000
- Stops existing socks5-admin service
- Verifies port is completely free before proceeding
- Uses multiple methods to ensure port clearance

### 📁 Service Path Fix
- Creates correct systemd service with proper ExecStart path
- Points to `/opt/socks5-admin/index.js` (the actual built file)
- Sets correct working directory and permissions

### 🚀 Clean Installation
- Minimal runtime dependencies only
- Proper user/permission setup
- Database initialization
- Service verification

## Files Included

- `index.js` - Production-built server application
- `public/` - Frontend assets (if present)
- `package.json` - Minimal runtime dependencies
- `simple-deploy.sh` - Fixed deployment script
- `database.sqlite` - Database file (if present)

## After Deployment

If successful, you'll see:
```
🎉 DEPLOYMENT SUCCESSFUL!

📍 Access Information:
  Admin Panel: http://YOUR_SERVER_IP:5000
  Username: admin
  Password: admin123
  SOCKS5 Proxy: YOUR_SERVER_IP:1080
```

## Troubleshooting

If the script fails:

1. **Check if port is still in use:**
   ```bash
   lsof -i:5000
   # or
   netstat -tln | grep :5000
   ```

2. **Manually kill processes:**
   ```bash
   pkill -f node
   systemctl stop socks5-admin
   ```

3. **Check service logs:**
   ```bash
   journalctl -u socks5-admin -f
   ```

4. **Verify service configuration:**
   ```bash
   systemctl show socks5-admin --property=ExecStart
   ```

## Management Commands

```bash
# Check status
systemctl status socks5-admin

# View live logs
journalctl -u socks5-admin -f

# Restart service
systemctl restart socks5-admin

# Stop service
systemctl stop socks5-admin
```

## What's Fixed

✅ Port 5000 conflict resolution  
✅ Correct service ExecStart path  
✅ Proper authentication (admin/admin123)  
✅ All admin panel features working  
✅ SOCKS5 proxy with user routing  
✅ Database initialization  
✅ Minimal dependencies for production  

This should resolve the recurring port conflict errors you've been experiencing.