# SOCKS5 Global Access Troubleshooting

## Your Issue: `curl --socks5 test:1234@103.7.4.183:1080 https://ip.gs` not working

This is a common networking issue. Here's the complete solution:

## ✅ Quick Fix (Run on your Ubuntu 22 server)

```bash
# 1. Download and run the firewall fix
sudo chmod +x ubuntu-firewall-fix.sh
sudo ./ubuntu-firewall-fix.sh

# 2. Restart your application
sudo systemctl restart YOUR_APP_SERVICE
# OR if running manually:
# Kill the current process and restart
```

## 🔍 Root Cause Analysis

The SOCKS5 server is correctly configured to listen on `0.0.0.0:1080`, but Ubuntu's firewall (UFW) is blocking external connections.

## 📋 Step-by-Step Manual Fix

### 1. Check Current Status
```bash
# Check if SOCKS5 is running
sudo netstat -tlnp | grep 1080

# Check firewall status
sudo ufw status
```

### 2. Open Required Ports
```bash
# Allow SOCKS5 proxy port
sudo ufw allow 1080/tcp

# Allow admin panel (optional)
sudo ufw allow 5000/tcp

# Enable firewall
sudo ufw --force enable
```

### 3. Verify Configuration
```bash
# Check listening ports
sudo netstat -tlnp | grep 1080
# Should show: tcp 0 0.0.0.0:1080 0.0.0.0:* LISTEN

# Test locally first
curl --socks5 test:1234@127.0.0.1:1080 https://ip.gs

# Test globally
curl --socks5 test:1234@103.7.4.183:1080 https://ip.gs
```

## 🔧 Additional Checks

### A. VPS Provider Firewall
Check your cloud provider's security groups/firewall:

**DigitalOcean:**
- Networking → Firewalls → Add rule: TCP 1080

**AWS EC2:**
- Security Groups → Inbound Rules → Custom TCP 1080

**Vultr/Linode:**
- Check firewall settings in control panel

### B. Verify User Exists
The `test:1234` user has been created. You can verify at:
```
http://103.7.4.183:5000
```

### C. Alternative Test Commands
```bash
# Test with different user
curl --socks5 testproxy:proxy123@103.7.4.183:1080 https://ip.gs

# Test connectivity without SOCKS5
curl https://ip.gs

# Check if port is reachable
telnet 103.7.4.183 1080
```

## ⚡ Expected Results

After applying the fix, these commands should work:
```bash
curl --socks5 test:1234@103.7.4.183:1080 https://ip.gs
curl --socks5 testproxy:proxy123@103.7.4.183:1080 https://httpbin.org/ip
```

## 🚨 If Still Not Working

1. **Check application is running:**
   ```bash
   ps aux | grep node
   ```

2. **Check logs for errors:**
   ```bash
   tail -f /var/log/syslog | grep socks
   ```

3. **Restart the SOCKS5 service:**
   ```bash
   # Kill current process
   sudo pkill -f "tsx server/index.ts"
   
   # Restart application
   npm run dev
   ```

4. **Test from a different network:**
   - Try from your phone's mobile data
   - Try from a different computer/VPS

## 📊 Success Verification

Once fixed, you should see:
- External IP address from `https://ip.gs` 
- SOCKS5 authentication logs in your application
- Connection tracking in the admin dashboard

The system is fully configured and ready - it just needs the firewall opened!