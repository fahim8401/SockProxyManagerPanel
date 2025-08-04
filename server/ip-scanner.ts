import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';

const execAsync = promisify(exec);

export interface SystemIpInfo {
  ipAddress: string;
  interface: string;
  isPublic: boolean;
  country?: string;
  city?: string;
  provider?: string;
}

// Get local IP addresses from system interfaces
export async function getSystemIpAddresses(): Promise<SystemIpInfo[]> {
  const interfaces = os.networkInterfaces();
  const ipAddresses: SystemIpInfo[] = [];
  
  for (const [interfaceName, addresses] of Object.entries(interfaces)) {
    if (!addresses) continue;
    
    for (const addr of addresses) {
      // Skip internal, IPv6, and non-active interfaces
      if (addr.internal || addr.family !== 'IPv4') continue;
      
      const isPublic = !isPrivateIP(addr.address);
      
      ipAddresses.push({
        ipAddress: addr.address,
        interface: interfaceName,
        isPublic,
        country: isPublic ? 'Unknown' : 'Local',
        city: isPublic ? 'Unknown' : 'Local',
        provider: isPublic ? 'VPS/Cloud Provider' : 'Local Network'
      });
    }
  }
  
  return ipAddresses;
}

// Get public IP address using external service
export async function getPublicIpAddress(): Promise<SystemIpInfo | null> {
  try {
    const { stdout } = await execAsync('curl -s -4 ifconfig.me || curl -s -4 icanhazip.com || curl -s -4 ipecho.net/plain');
    const publicIp = stdout.trim();
    
    if (publicIp && isValidIP(publicIp)) {
      return {
        ipAddress: publicIp,
        interface: 'external',
        isPublic: true,
        country: 'Unknown',
        city: 'Unknown', 
        provider: 'Internet Provider'
      };
    }
  } catch (error) {
    console.warn('Failed to get public IP:', error);
  }
  
  return null;
}

// Scan network interfaces and return all available IPs
export async function scanAllSystemIps(): Promise<SystemIpInfo[]> {
  const systemIps = await getSystemIpAddresses();
  const publicIp = await getPublicIpAddress();
  
  const allIps = [...systemIps];
  
  // Add public IP if it's different from local IPs
  if (publicIp && !systemIps.some(ip => ip.ipAddress === publicIp.ipAddress)) {
    allIps.push(publicIp);
  }
  
  return allIps;
}

// Get IP geolocation info (optional enhancement)
export async function getIpGeoInfo(ipAddress: string): Promise<{ country?: string; city?: string; provider?: string }> {
  try {
    // Using free ip-api.com service (limited to 45 requests per minute)
    const { stdout } = await execAsync(`curl -s "http://ip-api.com/json/${ipAddress}?fields=country,city,org"`);
    const data = JSON.parse(stdout);
    
    return {
      country: data.country || 'Unknown',
      city: data.city || 'Unknown',
      provider: data.org || 'Unknown Provider'
    };
  } catch (error) {
    console.warn(`Failed to get geo info for ${ipAddress}:`, error);
    return {};
  }
}

// Helper functions
function isPrivateIP(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  
  // Check for private IP ranges
  return (
    // 10.0.0.0/8
    parts[0] === 10 ||
    // 172.16.0.0/12
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    // 192.168.0.0/16
    (parts[0] === 192 && parts[1] === 168) ||
    // 127.0.0.0/8 (localhost)
    parts[0] === 127 ||
    // 169.254.0.0/16 (link-local)
    (parts[0] === 169 && parts[1] === 254)
  );
}

function isValidIP(ip: string): boolean {
  const parts = ip.split('.');
  return parts.length === 4 && parts.every(part => {
    const num = parseInt(part, 10);
    return num >= 0 && num <= 255 && part === num.toString();
  });
}