import net from 'net';
import dns from 'dns';
import { storage } from '../storage';
import { IPRoutingManager } from './ipRouting';

interface ProxyUser {
  username: string;
  password: string;
  userId: string;
  outboundIp?: string; // The public IP this user's traffic should be routed through
}

export class SocksProxyServer {
  private server: net.Server;
  private users: Map<string, ProxyUser> = new Map();
  private activeConnections: Map<string, { userId: string; bytesTransferred: number }> = new Map();
  private onlineUsers: Set<string> = new Set();
  private routingManager: IPRoutingManager;

  constructor(private port: number = 1080) {
    this.server = net.createServer(this.handleConnection.bind(this));
    this.routingManager = IPRoutingManager.getInstance();
  }

  async start(): Promise<void> {
    await this.loadUsers();
    
    // Initialize routing manager with users that have outbound IPs
    const usersWithRouting = Array.from(this.users.values())
      .filter(user => user.outboundIp)
      .map(user => ({ id: user.userId, outboundIp: user.outboundIp }));
    
    await this.routingManager.initialize(usersWithRouting);
    
    this.server.listen(this.port, '0.0.0.0', () => {
      console.log(`SOCKS5 proxy server listening on port ${this.port}`);
    });
  }

  async loadUsers(): Promise<void> {
    const users = await storage.getAllUsers();
    this.users.clear();
    
    users.forEach(user => {
      if (user.isActive && Math.floor(Date.now() / 1000) < user.expiresAt) {
        this.users.set(user.username, {
          username: user.username,
          password: user.password,
          userId: user.id,
          outboundIp: user.outboundIp || undefined
        });
      }
    });
    console.log(`Loaded ${this.users.size} active users for SOCKS5 proxy`);
  }

  private async handleConnection(clientSocket: net.Socket): Promise<void> {
    let authBuffer = Buffer.alloc(0);
    let authenticated = false;
    let authMethodSent = false;
    let currentUser: ProxyUser | null = null;
    let connectionId: string | null = null;

    clientSocket.on('data', async (data) => {
      try {
        if (!authenticated) {
          authBuffer = Buffer.concat([authBuffer, data]);
          
          // Handle initial version negotiation
          if (!authMethodSent && authBuffer.length >= 3) {
            const version = authBuffer[0];
            const nmethods = authBuffer[1];
            
            if (version !== 0x05) {
              clientSocket.end();
              return;
            }

            // Send auth method response (username/password)
            clientSocket.write(Buffer.from([0x05, 0x02]));
            authMethodSent = true;
            
            // Clear processed data
            authBuffer = authBuffer.slice(2 + nmethods);
          }
          
          // Handle authentication subnegotiation
          if (authMethodSent && authBuffer.length >= 3) {
            const credVersion = authBuffer[0];
            if (credVersion === 0x01) {
              const usernameLen = authBuffer[1];
              
              if (authBuffer.length >= 2 + usernameLen + 1) {
                const username = authBuffer.slice(2, 2 + usernameLen).toString();
                const passwordLen = authBuffer[2 + usernameLen];
                
                if (authBuffer.length >= 3 + usernameLen + passwordLen) {
                  const password = authBuffer.slice(
                    3 + usernameLen,
                    3 + usernameLen + passwordLen
                  ).toString();
                  
                  console.log(`SOCKS5 auth attempt - Username: '${username}', Password: '${password}'`);
                  console.log(`Available users:`, Array.from(this.users.keys()));
                  
                  const user = this.users.get(username);
                  console.log(`User found:`, !!user, user ? `Password match: ${user.password === password}` : 'No user');
                  
                  if (user && user.password === password) {
                    // Check quota and expiration
                    const userRecord = await storage.getUser(user.userId);
                    if (userRecord && userRecord.isActive && 
                        Math.floor(Date.now() / 1000) < userRecord.expiresAt &&
                        (userRecord.dataUsed || 0) < userRecord.dataLimit) {
                      
                      authenticated = true;
                      currentUser = user;
                      clientSocket.write(Buffer.from([0x01, 0x00])); // Auth success
                      console.log(`✅ SOCKS5 authentication successful for user: ${username}`);
                      
                      // Mark user as online
                      this.onlineUsers.add(user.userId);
                      if (storage.updateUserOnlineStatus) {
                        await storage.updateUserOnlineStatus(user.userId, true);
                      }
                      
                      // Create connection record
                      connectionId = (await storage.createConnection({
                        userId: user.userId,
                        ipAddress: clientSocket.remoteAddress || 'unknown',
                        endTime: null,
                        bytesTransferred: 0
                      })).id;
                      
                      this.activeConnections.set(connectionId, {
                        userId: user.userId,
                        bytesTransferred: 0
                      });
                    } else {
                      console.log(`❌ SOCKS5 auth failed - User quota/expiration check failed`);
                      clientSocket.write(Buffer.from([0x01, 0x01])); // Auth failed
                      clientSocket.end();
                    }
                  } else {
                    console.log(`❌ SOCKS5 auth failed - Invalid credentials`);
                    clientSocket.write(Buffer.from([0x01, 0x01])); // Auth failed
                    clientSocket.end();
                  }
                  // Clear auth buffer after processing
                  authBuffer = Buffer.alloc(0);
                }
              }
            }
          }
        } else {
          // Handle SOCKS5 connection request
          if (data.length >= 4 && data[0] === 0x05 && data[1] === 0x01) {
            const addressType = data[3];
            let targetHost: string;
            let targetPort: number;
            
            console.log(`SOCKS5 connection request - Address type: 0x${addressType.toString(16).padStart(2, '0')}`);
            
            if (addressType === 0x01) { // IPv4
              if (data.length < 10) {
                console.log('❌ SOCKS5 IPv4 request too short');
                const response = Buffer.from([0x05, 0x01, 0x00, 0x01, 0, 0, 0, 0, 0, 0]);
                clientSocket.write(response);
                clientSocket.end();
                return;
              }
              targetHost = `${data[4]}.${data[5]}.${data[6]}.${data[7]}`;
              targetPort = data.readUInt16BE(8);
            } else if (addressType === 0x03) { // Domain name
              if (data.length < 5) {
                console.log('❌ SOCKS5 domain request too short');
                const response = Buffer.from([0x05, 0x01, 0x00, 0x01, 0, 0, 0, 0, 0, 0]);
                clientSocket.write(response);
                clientSocket.end();
                return;
              }
              const domainLen = data[4];
              if (data.length < 7 + domainLen) {
                console.log('❌ SOCKS5 domain request incomplete');
                const response = Buffer.from([0x05, 0x01, 0x00, 0x01, 0, 0, 0, 0, 0, 0]);
                clientSocket.write(response);
                clientSocket.end();
                return;
              }
              targetHost = data.slice(5, 5 + domainLen).toString();
              targetPort = data.readUInt16BE(5 + domainLen);
            } else if (addressType === 0x04) { // IPv6
              if (data.length < 22) {
                console.log('❌ SOCKS5 IPv6 request too short');
                const response = Buffer.from([0x05, 0x01, 0x00, 0x01, 0, 0, 0, 0, 0, 0]);
                clientSocket.write(response);
                clientSocket.end();
                return;
              }
              // Parse IPv6 address (16 bytes starting at position 4)
              const ipv6Parts = [];
              for (let i = 0; i < 16; i += 2) {
                const part = data.readUInt16BE(4 + i).toString(16);
                ipv6Parts.push(part);
              }
              targetHost = `[${ipv6Parts.join(':')}]`;
              targetPort = data.readUInt16BE(20);
            } else {
              // Unsupported address type
              console.log(`❌ SOCKS5 unsupported address type: 0x${addressType.toString(16).padStart(2, '0')}`);
              const response = Buffer.from([0x05, 0x08, 0x00, 0x01, 0, 0, 0, 0, 0, 0]);
              clientSocket.write(response);
              clientSocket.end();
              return;
            }
            
            console.log(`SOCKS5 connecting to ${targetHost}:${targetPort}`);
            
            // For domain names, resolve DNS first to handle IPv6 properly
            if (addressType === 0x03) {
              this.resolveDomainAndConnect(targetHost, targetPort, clientSocket, connectionId, currentUser);
            } else {
              // Direct connection for IP addresses
              this.connectToTarget(targetHost, targetPort, clientSocket, connectionId, currentUser);
            }
          }
        }
      } catch (error) {
        console.error('SOCKS5 connection handling error:', error);
        clientSocket.end();
      }
    });

    clientSocket.on('close', async () => {
      if (connectionId && this.activeConnections.has(connectionId)) {
        const connData = this.activeConnections.get(connectionId)!;
        await storage.endConnection(connectionId, connData.bytesTransferred);
        this.activeConnections.delete(connectionId);
        
        // Check if user has other active connections
        const hasOtherConnections = Array.from(this.activeConnections.values())
          .some(conn => conn.userId === currentUser?.userId);
        
        if (!hasOtherConnections && currentUser) {
          this.onlineUsers.delete(currentUser.userId);
          if (storage.updateUserOnlineStatus) {
            await storage.updateUserOnlineStatus(currentUser.userId, false);
          }
        }
        
        console.log(`SOCKS5 connection closed for ${currentUser?.username}`);
      }
    });

    clientSocket.on('error', (err) => {
      console.log('SOCKS5 client socket error:', err.message);
    });
  }

  private updateDataTransfer(connectionId: string, bytes: number): void {
    const connData = this.activeConnections.get(connectionId);
    if (connData) {
      connData.bytesTransferred += bytes;
    }
  }

  private async resolveDomainAndConnect(
    domain: string, 
    port: number, 
    clientSocket: net.Socket, 
    connectionId: string | null, 
    currentUser: ProxyUser | null
  ): Promise<void> {
    console.log(`🔍 Resolving domain: ${domain} for port ${port}`);
    
    // Enhanced DNS resolution with better error handling
    const resolvePromise = new Promise<string>((resolve, reject) => {
      // Try IPv4 first (most common)
      dns.resolve4(domain, { ttl: true }, (err4, addresses4) => {
        if (!err4 && addresses4.length > 0) {
          const ip = typeof addresses4[0] === 'string' ? addresses4[0] : addresses4[0].address;
          console.log(`✅ Resolved ${domain} to IPv4: ${ip} (TTL: ${typeof addresses4[0] === 'object' ? addresses4[0].ttl : 'N/A'})`);
          resolve(ip);
          return;
        }
        
        console.log(`⚠️ IPv4 resolution failed for ${domain}: ${err4?.message || 'Unknown error'}`);
        
        // Try IPv6 if IPv4 fails
        dns.resolve6(domain, { ttl: true }, (err6, addresses6) => {
          if (!err6 && addresses6.length > 0) {
            const ip = typeof addresses6[0] === 'string' ? addresses6[0] : addresses6[0].address;
            console.log(`✅ Resolved ${domain} to IPv6: ${ip} (TTL: ${typeof addresses6[0] === 'object' ? addresses6[0].ttl : 'N/A'})`);
            resolve(`[${ip}]`);
            return;
          }
          
          console.log(`⚠️ IPv6 resolution failed for ${domain}: ${err6?.message || 'Unknown error'}`);
          
          // Both failed - reject with the IPv4 error (more common issue)
          reject(err4 || new Error('DNS resolution failed for both IPv4 and IPv6'));
        });
      });
    });
    
    try {
      const resolvedIP = await resolvePromise;
      this.connectToTarget(resolvedIP, port, clientSocket, connectionId, currentUser);
    } catch (dnsError: any) {
      console.log(`❌ Complete DNS resolution failure for ${domain}: ${dnsError.message}`);
      
      // Try direct connection as last resort (in case it's already an IP)
      console.log(`🔄 Attempting direct connection to ${domain} as fallback`);
      this.connectToTarget(domain, port, clientSocket, connectionId, currentUser);
    }
  }

  private connectToTarget(
    targetHost: string, 
    targetPort: number, 
    clientSocket: net.Socket, 
    connectionId: string | null, 
    currentUser: ProxyUser | null
  ): void {
    // Start with clean connection options - no IP binding in Replit environment
    const connectionOptions: net.NetConnectOpts = {
      port: targetPort,
      host: targetHost,
      // For HTTPS connections, ensure proper socket handling
      allowHalfOpen: false,
      timeout: 15000 // 15 second connection timeout
    };

    // In Replit environment, we can't bind to specific IPs directly
    // Instead, log the user's assigned IP for monitoring purposes
    if (currentUser?.outboundIp) {
      console.log(`🌐 User ${currentUser.username} assigned IP: ${currentUser.outboundIp} (routing via network layer)`);
      
      // Apply NAT routing asynchronously - don't block the connection
      import('./ipRouting.js').then(ipRoutingModule => {
        const ipRouting = ipRoutingModule.IPRoutingManager.getInstance();
        ipRouting.setupNATRules(currentUser.outboundIp || '').catch(natError => {
          console.log(`⚠️ NAT routing setup failed (non-blocking): ${natError.message}`);
        });
      }).catch(() => {
        // NAT routing module unavailable - this is non-critical
      });
    }
    
    console.log(`🔌 Creating connection to ${targetHost}:${targetPort}${currentUser ? ` for ${currentUser.username}` : ''}`);
    const targetSocket = net.createConnection(connectionOptions);
    
    // Set proper timeouts for HTTPS connections
    targetSocket.setTimeout(30000); // 30 second timeout
    
    targetSocket.on('connect', () => {
      console.log(`✅ SOCKS5 target connection established to ${targetHost}:${targetPort} (${targetPort === 443 ? 'HTTPS' : 'HTTP'})`);
      
      // Send proper SOCKS5 success response with bound address and port
      const response = Buffer.alloc(10);
      response[0] = 0x05; // SOCKS version
      response[1] = 0x00; // Success
      response[2] = 0x00; // Reserved
      response[3] = 0x01; // IPv4 address type
      // Bound IP address (0.0.0.0)
      response[4] = 0x00;
      response[5] = 0x00;
      response[6] = 0x00;
      response[7] = 0x00;
      // Bound port (use target port in network byte order)
      response.writeUInt16BE(targetPort, 8);
      
      clientSocket.write(response);
      console.log(`📤 Sent SOCKS5 success response for ${currentUser?.username} (port ${targetPort})`);
      
      // Start proxying data between client and target
      clientSocket.pipe(targetSocket, { end: false });
      targetSocket.pipe(clientSocket, { end: false });
      
      // Track data transfer for billing/quota
      if (connectionId) {
        let clientToTargetBytes = 0;
        let targetToClientBytes = 0;
        
        clientSocket.on('data', (chunk) => {
          clientToTargetBytes += chunk.length;
          this.updateDataTransfer(connectionId!, chunk.length);
        });
        
        targetSocket.on('data', (chunk) => {
          targetToClientBytes += chunk.length;
          this.updateDataTransfer(connectionId!, chunk.length);
        });
        
        // Log data transfer periodically
        const logInterval = setInterval(() => {
          if (clientToTargetBytes > 0 || targetToClientBytes > 0) {
            console.log(`📊 Data transfer for ${currentUser?.username}: ${clientToTargetBytes} up, ${targetToClientBytes} down`);
            clientToTargetBytes = 0;
            targetToClientBytes = 0;
          }
        }, 30000);
        
        // Clean up interval when connection closes
        const cleanup = () => {
          clearInterval(logInterval);
        };
        clientSocket.once('close', cleanup);
        targetSocket.once('close', cleanup);
      }
      
      console.log(`🔗 SOCKS5 proxy tunnel active for ${currentUser?.username} to ${targetHost}:${targetPort}`);
    });
    
    targetSocket.on('error', (err) => {
      console.log(`❌ SOCKS5 target connection error to ${targetHost}:${targetPort}:`, err.message);
      console.log(`❌ Error details: ${err.name}, Code: ${(err as any).code}, Errno: ${(err as any).errno}`);
      
      // Map Node.js errors to SOCKS5 error codes
      let errorCode = 0x01; // General SOCKS server failure
      const errorMessage = err.message.toLowerCase();
      const errorCode_lookup = (err as any).code;
      
      if (errorMessage.includes('enotfound') || errorCode_lookup === 'ENOTFOUND') {
        errorCode = 0x04; // Host unreachable (DNS resolution failed)
        console.log(`🔍 DNS resolution failed for ${targetHost}`);
      } else if (errorMessage.includes('econnrefused') || errorCode_lookup === 'ECONNREFUSED') {
        errorCode = 0x05; // Connection refused by target server
        console.log(`🚫 Connection refused by ${targetHost}:${targetPort}`);
      } else if (errorMessage.includes('etimedout') || errorCode_lookup === 'ETIMEDOUT') {
        errorCode = 0x06; // TTL expired / Connection timeout
        console.log(`⏰ Connection timeout to ${targetHost}:${targetPort}`);
      } else if (errorMessage.includes('ehostunreach') || errorCode_lookup === 'EHOSTUNREACH') {
        errorCode = 0x04; // Host unreachable (network unreachable)
        console.log(`🌐 Network unreachable to ${targetHost}:${targetPort}`);
      } else if (errorMessage.includes('enetunreach') || errorCode_lookup === 'ENETUNREACH') {
        errorCode = 0x04; // Host unreachable (network unreachable)
        console.log(`🌐 Network unreachable to ${targetHost}:${targetPort}`);
      }
      
      console.log(`📤 Sending SOCKS5 error code 0x${errorCode.toString(16).padStart(2, '0')} to client`);
      this.sendSocksError(clientSocket, errorCode);
    });

    targetSocket.on('timeout', () => {
      console.log(`⏰ SOCKS5 connection timeout to ${targetHost}:${targetPort}`);
      targetSocket.destroy();
      this.sendSocksError(clientSocket, 0x06); // TTL expired
    });
  }

  private sendSocksError(clientSocket: net.Socket, errorCode: number): void {
    const response = Buffer.from([0x05, errorCode, 0x00, 0x01, 0, 0, 0, 0, 0, 0]);
    clientSocket.write(response);
    clientSocket.end();
  }

  getOnlineUsers(): string[] {
    return Array.from(this.onlineUsers);
  }

  async stop(): Promise<void> {
    // Mark all users offline when stopping
    if (storage.updateUserOnlineStatus) {
      for (const userId of Array.from(this.onlineUsers)) {
        await storage.updateUserOnlineStatus(userId, false);
      }
    }
    this.onlineUsers.clear();
    this.server.close();
  }
}