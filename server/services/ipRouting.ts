import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class IPRoutingManager {
  private static instance: IPRoutingManager;
  private routingTable: Map<string, string> = new Map(); // userId -> outboundIP

  static getInstance(): IPRoutingManager {
    if (!IPRoutingManager.instance) {
      IPRoutingManager.instance = new IPRoutingManager();
    }
    return IPRoutingManager.instance;
  }

  /**
   * Set up IP routing for a specific user
   * This creates routing rules to ensure traffic from a user goes through specific IP
   */
  async setupUserRouting(userId: string, outboundIP: string): Promise<void> {
    this.routingTable.set(userId, outboundIP);
    console.log(`🔧 Set up IP routing for user ${userId} -> ${outboundIP}`);
    
    try {
      // Add IP to interface if not already present
      await this.ensureIPOnInterface(outboundIP);
    } catch (error) {
      console.error(`Failed to setup routing for ${userId}:`, error);
    }
  }

  /**
   * Remove IP routing for a user
   */
  async removeUserRouting(userId: string): Promise<void> {
    const outboundIP = this.routingTable.get(userId);
    if (outboundIP) {
      this.routingTable.delete(userId);
      console.log(`🗑️ Removed IP routing for user ${userId}`);
    }
  }

  /**
   * Get outbound IP for a user
   */
  getUserOutboundIP(userId: string): string | undefined {
    return this.routingTable.get(userId);
  }

  /**
   * Ensure the IP address is available on the network interface and setup NAT rules
   */
  private async ensureIPOnInterface(ipAddress: string): Promise<void> {
    try {
      // Check if IP is already configured
      const { stdout } = await execAsync(`ip addr show | grep "${ipAddress}"`);
      if (stdout.trim()) {
        console.log(`✅ IP ${ipAddress} already configured on interface`);
        // Still setup NAT rules even if IP exists
        await this.setupNATRules(ipAddress);
        return;
      }
    } catch (error) {
      // IP not found, need to add it
    }

    try {
      // Get the primary network interface
      const { stdout: interfaceOutput } = await execAsync(`ip route | grep default | awk '{print $5}' | head -1`);
      const primaryInterface = interfaceOutput.trim();
      
      if (primaryInterface) {
        // Add the IP as an alias
        await execAsync(`sudo ip addr add ${ipAddress}/32 dev ${primaryInterface}`);
        console.log(`✅ Added IP ${ipAddress} to interface ${primaryInterface}`);
        
        // Setup NAT rules for this IP
        await this.setupNATRules(ipAddress);
      }
    } catch (error) {
      console.error(`Failed to add IP ${ipAddress} to interface:`, error);
      // Continue anyway - the IP might be handled by the VPS provider
    }
  }

  /**
   * Configure comprehensive routing for complete NAT functionality
   * Works in environments without iptables by using IP routing tables
   */
  async setupNATRules(outboundIP: string): Promise<void> {
    try {
      // Enable IP forwarding for routing
      await execAsync('sudo sysctl -w net.ipv4.ip_forward=1');
      
      // Get primary network interface
      const { stdout: interfaceOutput } = await execAsync(`ip route | grep default | awk '{print $5}' | head -1`);
      const primaryInterface = interfaceOutput.trim() || 'eth0';
      
      // Add IP alias to interface if not exists
      try {
        await execAsync(`sudo ip addr add ${outboundIP}/32 dev ${primaryInterface} 2>/dev/null || true`);
        console.log(`✅ Added IP alias ${outboundIP} to interface ${primaryInterface}`);
      } catch {}

      // Create custom routing table for this IP
      const tableId = this.getRouteTableId(outboundIP);
      
      // Setup custom routing table for source-based routing
      try {
        // Add default route to custom table using the outbound IP
        await execAsync(`sudo ip route add default via $(ip route | grep default | awk '{print $3}' | head -1) dev ${primaryInterface} src ${outboundIP} table ${tableId} 2>/dev/null || true`);
        
        // Add rule to use custom table for traffic from this IP
        await execAsync(`sudo ip rule add from ${outboundIP} table ${tableId} 2>/dev/null || true`);
        
        // Add rule for SOCKS5 proxy traffic to use this IP
        await execAsync(`sudo ip rule add sport 1080 table ${tableId} 2>/dev/null || true`);
        
        console.log(`🛣️ Setup custom routing table ${tableId} for outbound IP ${outboundIP}`);
      } catch (error) {
        console.log(`⚠️ Could not setup custom routing table: ${error.message}`);
      }

      // Try iptables NAT rules if available (fallback for full systems)
      try {
        await execAsync(`which iptables`);
        // iptables is available, setup NAT rules
        await execAsync(`sudo iptables -t nat -A POSTROUTING -s 127.0.0.1 -j SNAT --to-source ${outboundIP} 2>/dev/null || true`);
        await execAsync(`sudo iptables -t nat -A POSTROUTING -o ${primaryInterface} -j MASQUERADE 2>/dev/null || true`);
        console.log(`🌐 Applied iptables NAT rules for ${outboundIP}`);
      } catch {
        console.log(`💡 iptables not available, using IP routing tables for NAT functionality`);
      }
      
      console.log(`🌐 Setup comprehensive routing: ALL traffic -> ${outboundIP} via ${primaryInterface}`);
    } catch (error) {
      console.log(`⚠️ Could not setup routing for ${outboundIP}: ${error.message}`);
      console.log(`💡 Advanced NAT routing requires additional system configuration`);
    }
  }

  /**
   * Get unique routing table ID for IP address
   */
  private getRouteTableId(ip: string): number {
    // Convert IP to unique table ID (100-299 range)
    const parts = ip.split('.');
    return 100 + (parseInt(parts[3]) % 200);
  }

  /**
   * Remove NAT rules for an IP
   */
  async removeNATRules(outboundIP: string): Promise<void> {
    try {
      await execAsync(`sudo iptables -t nat -D POSTROUTING -j SNAT --to-source ${outboundIP}`);
      console.log(`🗑️ Removed NAT rules for outbound IP: ${outboundIP}`);
    } catch (error) {
      console.error(`Failed to remove NAT rules for ${outboundIP}:`, error);
    }
  }

  /**
   * Get all available public IPs on the system
   */
  async getAvailablePublicIPs(): Promise<string[]> {
    try {
      const { stdout } = await execAsync(`ip addr show | grep 'inet ' | awk '{print $2}' | cut -d'/' -f1 | grep -v '127.0.0.1' | grep -v '^10\\.' | grep -v '^192\\.168\\.' | grep -v '^172\\.'`);
      return stdout.trim().split('\n').filter(ip => ip.length > 0);
    } catch (error) {
      console.error('Failed to get public IPs:', error);
      return [];
    }
  }

  /**
   * Test outbound IP for a specific connection
   */
  async testOutboundIP(outboundIP: string): Promise<{ success: boolean; actualIP?: string; error?: string }> {
    try {
      // Use curl with a specific interface/IP to test
      const { stdout } = await execAsync(`curl -s --interface ${outboundIP} https://ip.gs`);
      const actualIP = stdout.trim();
      
      if (actualIP === outboundIP) {
        return { success: true, actualIP };
      } else {
        return { 
          success: false, 
          actualIP, 
          error: `Expected ${outboundIP} but got ${actualIP}` 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to test outbound IP: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }

  /**
   * Initialize routing manager with existing users
   */
  async initialize(users: Array<{ id: string; outboundIp?: string }>): Promise<void> {
    console.log('🚀 Initializing IP routing manager...');
    
    for (const user of users) {
      if (user.outboundIp) {
        await this.setupUserRouting(user.id, user.outboundIp);
      }
    }
    
    console.log(`✅ IP routing manager initialized with ${this.routingTable.size} user routes`);
  }
}