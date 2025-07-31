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
      if (user.isActive && new Date() < new Date(user.expiresAt)) {
        this.users.set(user.username, {
          username: user.username,
          password: user.password,
          userId: user.id
        });
      }
    });
  }

  private async handleConnection(clientSocket: net.Socket): Promise<void> {
    let authBuffer = Buffer.alloc(0);
    let authenticated = false;
    let currentUser: ProxyUser | null = null;
    let connectionId: string | null = null;

    clientSocket.on('data', async (data) => {
      if (!authenticated) {
        authBuffer = Buffer.concat([authBuffer, data]);
        
        if (authBuffer.length >= 3) {
          const version = authBuffer[0];
          const nmethods = authBuffer[1];
          
          if (version !== 0x05) {
            clientSocket.end();
            return;
          }

          // Send auth method response (username/password)
          clientSocket.write(Buffer.from([0x05, 0x02]));
          
          // Wait for credentials
          if (authBuffer.length >= 3 + nmethods) {
            const credStart = 3 + nmethods;
            if (authBuffer.length >= credStart + 3) {
              const credVersion = authBuffer[credStart];
              const usernameLen = authBuffer[credStart + 1];
              
              if (authBuffer.length >= credStart + 2 + usernameLen + 1) {
                const username = authBuffer.slice(credStart + 2, credStart + 2 + usernameLen).toString();
                const passwordLen = authBuffer[credStart + 2 + usernameLen];
                
                if (authBuffer.length >= credStart + 3 + usernameLen + passwordLen) {
                  const password = authBuffer.slice(
                    credStart + 3 + usernameLen,
                    credStart + 3 + usernameLen + passwordLen
                  ).toString();
                  
                  const user = this.users.get(username);
                  if (user && user.password === password) {
                    // Check quota and expiration
                    const userRecord = await storage.getUser(user.userId);
                    if (userRecord && userRecord.isActive && 
                        new Date() < new Date(userRecord.expiresAt) &&
                        (userRecord.dataUsed || 0) < userRecord.dataLimit) {
                      
                      authenticated = true;
                      currentUser = user;
                      clientSocket.write(Buffer.from([0x01, 0x00])); // Auth success
                      
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
                      clientSocket.write(Buffer.from([0x01, 0x01])); // Auth failed
                      clientSocket.end();
                    }
                  } else {
                    clientSocket.write(Buffer.from([0x01, 0x01])); // Auth failed
                    clientSocket.end();
                  }
                }
              }
            }
          }
        }
      } else {
        // Handle SOCKS5 connection request
        if (data.length >= 10 && data[0] === 0x05 && data[1] === 0x01) {
          const addressType = data[3];
          let targetHost: string;
          let targetPort: number;
          
          if (addressType === 0x01) { // IPv4
            targetHost = `${data[4]}.${data[5]}.${data[6]}.${data[7]}`;
            targetPort = data.readUInt16BE(8);
          } else if (addressType === 0x03) { // Domain name
            const domainLen = data[4];
            targetHost = data.slice(5, 5 + domainLen).toString();
            targetPort = data.readUInt16BE(5 + domainLen);
          } else {
            // Unsupported address type
            const response = Buffer.from([0x05, 0x08, 0x00, 0x01, 0, 0, 0, 0, 0, 0]);
            clientSocket.write(response);
            clientSocket.end();
            return;
          }
          
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
          });
          
          targetSocket.on('error', () => {
            const response = Buffer.from([0x05, 0x01, 0x00, 0x01, 0, 0, 0, 0, 0, 0]);
            clientSocket.write(response);
            clientSocket.end();
          });
        }
      }
    });

    clientSocket.on('close', async () => {
      if (connectionId && this.activeConnections.has(connectionId)) {
        const connData = this.activeConnections.get(connectionId)!;
        await storage.endConnection(connectionId, connData.bytesTransferred);
        this.activeConnections.delete(connectionId);
      }
    });

    clientSocket.on('error', () => {
      // Handle socket errors
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
