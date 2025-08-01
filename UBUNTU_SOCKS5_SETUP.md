# Ubuntu SOCKS5 Proxy Global Access Setup

## Issue: SOCKS5 proxy works locally but not globally

The problem is typically related to firewall configuration on your Ubuntu server.

## Quick Fix

1. **Run the firewall fix script:**
```bash
sudo chmod +x ubuntu-firewall-fix.sh
sudo ./ubuntu-firewall-fix.sh
```

## Manual Steps

If you prefer to configure manually:

### 1. Open Required Ports
```bash
# Open SOCKS5 proxy port
sudo ufw allow 1080/tcp

# Open admin panel port (optional)
sudo ufw allow 5000/tcp

# Enable firewall
sudo ufw --force enable

# Check status
sudo ufw status
```

### 2. Verify Port Listening
```bash
# Check if SOCKS5 server is listening on all interfaces
sudo netstat -tlnp | grep 1080

# Should show: tcp 0 0.0.0.0:1080 0.0.0.0:* LISTEN
```

### 3. Test Connectivity
```bash
# Local test (should work)
curl --socks5 test:1234@127.0.0.1:1080 https://ip.gs

# Global test (replace YOUR_SERVER_IP with actual IP)
curl --socks5 test:1234@YOUR_SERVER_IP:1080 https://ip.gs
```

## VPS Provider Firewall

If the above doesn't work, check your VPS provider's firewall:

### DigitalOcean
- Go to Networking → Firewalls
- Add inbound rule: TCP port 1080

### AWS EC2
- Security Groups → Edit inbound rules
- Add: Custom TCP, Port 1080, Source 0.0.0.0/0

### Vultr/Linode
- Check their firewall dashboard
- Allow port 1080 inbound

## Verification Commands

```bash
# Check server IP
curl ifconfig.me

# Check if ports are open externally (from another machine)
nmap -p 1080 YOUR_SERVER_IP

# Test SOCKS5 connection
curl --socks5 username:password@YOUR_SERVER_IP:1080 https://httpbin.org/ip
```

## Common Issues

1. **UFW not enabled**: Run `sudo ufw --force enable`
2. **VPS provider firewall**: Check cloud provider's security groups
3. **Application not binding to 0.0.0.0**: Already fixed in our code
4. **Port already in use**: Run `sudo lsof -i :1080`

## Security Notes

- Only open port 1080 if you need global SOCKS5 access
- Consider restricting source IPs if you only need specific access
- Use strong passwords for SOCKS5 users
- Monitor connection logs regularly

## Test Users

The system should have these test users by default:
- Username: `testproxy`, Password: `proxy123`
- Username: `test`, Password: `1234`

Create additional users through the admin panel at `http://YOUR_SERVER_IP:5000`