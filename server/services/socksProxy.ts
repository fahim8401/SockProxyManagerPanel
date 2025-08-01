import net from 'net';
import { storage } from '../storage';

interface ProxyUser {
  username: string;
  password: string;
  userId: string;
}

export class SocksProxyServer {
  private server: net.Server;
  private users: Map<string, ProxyUser> = new Map();
  private activeConnections: Map<string, { userId: string; bytesTransferred: number }> = new Map();

  constructor(private port: number = 1080) {
    this.server = net.createServer(this.handleConnection.bind(this));
  }

  async start(): Promise<void> {
    await this.loadUsers();
    
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
          userId: user.id
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
            
            // Connect to target
            const targetSocket = net.createConnection(targetPort, targetHost);
            
            targetSocket.on('connect', () => {
              // Send success response
              const response = Buffer.from([0x05, 0x00, 0x00, 0x01, 0, 0, 0, 0, 0, 0]);
              clientSocket.write(response);
              
              // Start proxying data
              clientSocket.pipe(targetSocket);
              targetSocket.pipe(clientSocket);
              
              // Track data transfer
              if (connectionId) {
                clientSocket.on('data', (chunk) => {
                  this.updateDataTransfer(connectionId!, chunk.length);
                });
                
                targetSocket.on('data', (chunk) => {
                  this.updateDataTransfer(connectionId!, chunk.length);
                });
              }
              
              console.log(`✅ SOCKS5 proxy connection established for ${currentUser?.username}`);
            });
            
            targetSocket.on('error', (err) => {
              console.log(`❌ SOCKS5 target connection error to ${targetHost}:${targetPort}:`, err.message);
              
              // Map Node.js errors to SOCKS5 error codes
              let errorCode = 0x01; // General SOCKS server failure
              if (err.message.includes('ENOTFOUND')) {
                errorCode = 0x04; // Host unreachable
              } else if (err.message.includes('ECONNREFUSED')) {
                errorCode = 0x05; // Connection refused
              } else if (err.message.includes('ETIMEDOUT')) {
                errorCode = 0x06; // TTL expired
              }
              
              const response = Buffer.from([0x05, errorCode, 0x00, 0x01, 0, 0, 0, 0, 0, 0]);
              clientSocket.write(response);
              clientSocket.end();
            });
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

  async stop(): Promise<void> {
    this.server.close();
  }
}