# SOCKS5 Proxy Management System - Update Guide

## Quick Update for Existing Installations

This update adds critical IPv6 support and fixes connectivity issues with WhatsApp Business and other modern applications.

### What's New in This Update

1. **IPv6 SOCKS5 Support** - Fixes "Address type not supported" errors
2. **Enhanced Error Handling** - Better logging and error codes  
3. **WhatsApp Business Compatibility** - Full support for WhatsApp connections
4. **Firewall Configuration Tools** - Automated scripts for global access
5. **Regional Settings Improvements** - Enhanced timezone and language options

### How to Update

#### Option 1: Automated Update (Recommended)
```bash
# Download and run the update script
chmod +x update-installation.sh
./update-installation.sh
```

#### Option 2: Manual Update
```bash
# 1. Backup your current installation
mkdir backup-$(date +%Y%m%d)
cp -r server/ shared/ client/ backup-$(date +%Y%m%d)/

# 2. Update SOCKS5 proxy server file
# Replace server/services/socksProxy.ts with the new version

# 3. Install dependencies
npm install

# 4. Restart your service
sudo systemctl restart your-socks5-service
# OR if using PM2: pm2 restart socks5-proxy
# OR if running manually: Kill process and run 'npm run dev'
```

### After Update - Enable Global Access

If your SOCKS5 proxy should be accessible from the internet:

```bash
# Run the firewall configuration
sudo ./ubuntu-firewall-fix.sh
```

### Testing the Update

#### Test IPv6 Support (WhatsApp Business)
```bash
# This should now work without "Address type not supported" error
curl --socks5 username:password@YOUR_SERVER_IP:1080 https://g.whatsapp.net
```

#### Test Basic Connectivity
```bash
# Test local connection
curl --socks5 test:1234@127.0.0.1:1080 https://ip.gs

# Test global connection
curl --socks5 test:1234@YOUR_SERVER_IP:1080 https://ip.gs
```

### Troubleshooting

#### WhatsApp Business Still Not Working?
1. Check logs for "SOCKS5 connection request - Address type" messages
2. Verify user credentials exist in admin panel
3. Ensure firewall ports are open (1080/tcp)

#### Global Access Not Working?
1. Run `sudo ./ubuntu-firewall-fix.sh`
2. Check VPS provider's security groups/firewall
3. Verify application is binding to 0.0.0.0:1080

#### Service Won't Start?
1. Check for syntax errors: `npm run build`
2. Verify database connectivity
3. Check port conflicts: `sudo netstat -tlnp | grep 1080`

### Rollback Instructions

If you encounter issues, you can rollback:

```bash
# Stop current service
sudo systemctl stop your-socks5-service

# Restore from backup
cp -r backup-YYYYMMDD/* ./

# Restart service
sudo systemctl start your-socks5-service
```

### Support Files Created

The update creates these helpful files:
- `ubuntu-firewall-fix.sh` - Firewall configuration
- `WHATSAPP_SOCKS5_FIX.md` - WhatsApp-specific troubleshooting
- `GLOBAL_ACCESS_TROUBLESHOOTING.md` - Network connectivity help

### What Changed Technically

#### SOCKS5 Protocol Improvements
- Added IPv6 address type (0x04) support
- Enhanced domain name (0x03) handling
- Better IPv4 (0x01) validation
- Improved error code mapping

#### Error Handling
- Proper SOCKS5 error responses
- Better connection validation
- Enhanced logging for debugging

#### Network Compatibility
- Full IPv6 stack support
- Improved DNS resolution handling
- Better handling of modern application protocols

This update ensures your SOCKS5 proxy works with modern applications that require IPv6 connectivity, including WhatsApp Business, modern web browsers, and other applications that prefer IPv6 connections.