import { spawn, ChildProcess } from 'child_process';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import axios from 'axios';
import { db } from './db';
import { proxyUsers, xrayConfigs } from '../shared/schema';
import { eq } from 'drizzle-orm';

export class XrayManager {
  private xrayProcess: ChildProcess | null = null;
  private configPath: string;
  private binaryPath: string;
  private apiPort: number = 8080;
  private isRestarting: boolean = false;

  constructor() {
    this.configPath = join(process.cwd(), 'xray-config.json');
    this.binaryPath = join(process.cwd(), 'xray', 'xray');
    
    // Ensure xray directory exists
    const xrayDir = join(process.cwd(), 'xray');
    if (!existsSync(xrayDir)) {
      mkdirSync(xrayDir, { recursive: true });
    }
  }

  async downloadXray(): Promise<void> {
    console.log('📥 Downloading Xray-core...');
    
    const arch = this.getArchitecture();
    const version = 'v24.9.30';
    const url = `https://github.com/XTLS/Xray-core/releases/download/${version}/Xray-linux-${arch}.zip`;
    
    try {
      // For now, we'll create a placeholder binary
      // In production, you would download and extract the actual binary
      writeFileSync(this.binaryPath, '#!/bin/bash\necho "Xray binary placeholder"');
      console.log('✅ Xray binary ready');
    } catch (error) {
      console.error('❌ Failed to download Xray:', error);
      throw error;
    }
  }

  private getArchitecture(): string {
    const arch = process.arch;
    switch (arch) {
      case 'x64': return '64';
      case 'arm64': return 'arm64-v8a';
      case 'arm': return 'arm32-v7a';
      default: return '64';
    }
  }

  async generateConfig(): Promise<void> {
    console.log('⚙️ Generating Xray configuration...');
    
    // Get active users from database
    const users = await db.select().from(proxyUsers).where(eq(proxyUsers.isActive, true));
    
    const config = {
      log: {
        access: '/var/log/xray/access.log',
        error: '/var/log/xray/error.log',
        loglevel: 'warning'
      },
      api: {
        tag: 'api',
        services: [
          'HandlerService',
          'LoggerService',
          'StatsService'
        ]
      },
      stats: {},
      policy: {
        levels: {
          '0': {
            handshake: 4,
            connIdle: 300,
            uplinkOnly: 5,
            downlinkOnly: 30,
            statsUserUplink: true,
            statsUserDownlink: true
          }
        },
        system: {
          statsInboundUplink: true,
          statsInboundDownlink: true,
          statsOutboundUplink: true,
          statsOutboundDownlink: true
        }
      },
      inbounds: [
        {
          listen: '127.0.0.1',
          port: this.apiPort,
          protocol: 'dokodemo-door',
          settings: {
            address: '127.0.0.1'
          },
          tag: 'api'
        },
        {
          listen: '0.0.0.0',
          port: 1080,
          protocol: 'socks',
          settings: {
            auth: 'password',
            accounts: users.map(user => ({
              user: user.username,
              pass: user.password
            })),
            udp: true,
            ip: '0.0.0.0'
          },
          streamSettings: {
            network: 'tcp'
          },
          tag: 'socks-in',
          sniffing: {
            enabled: true,
            destOverride: ['http', 'tls']
          }
        }
      ],
      outbounds: [
        {
          protocol: 'freedom',
          settings: {
            domainStrategy: 'UseIP'
          },
          tag: 'direct'
        },
        {
          protocol: 'blackhole',
          settings: {
            response: {
              type: 'http'
            }
          },
          tag: 'blocked'
        }
      ],
      routing: {
        domainStrategy: 'IPIfNonMatch',
        rules: [
          {
            inboundTag: ['api'],
            outboundTag: 'api',
            type: 'field'
          },
          {
            type: 'field',
            protocol: ['bittorrent'],
            outboundTag: 'blocked'
          }
        ]
      }
    };

    writeFileSync(this.configPath, JSON.stringify(config, null, 2));
    
    // Save config to database
    await db.insert(xrayConfigs)
      .values({
        configName: 'main',
        configData: JSON.stringify(config),
        isActive: true
      })
      .onConflictDoUpdate({
        target: xrayConfigs.configName,
        set: {
          configData: JSON.stringify(config),
          updatedAt: new Date()
        }
      });

    console.log('✅ Xray configuration generated');
  }

  async start(): Promise<void> {
    if (this.xrayProcess && !this.xrayProcess.killed) {
      console.log('⚠️ Xray is already running');
      return;
    }

    if (this.isRestarting) {
      console.log('⚠️ Xray is already restarting');
      return;
    }

    try {
      await this.generateConfig();
      
      // For development, we'll simulate Xray process
      console.log('🚀 Starting Xray-core process...');
      
      // In production, this would be:
      // this.xrayProcess = spawn(this.binaryPath, ['run', '-config', this.configPath]);
      
      // For now, simulate the process
      this.xrayProcess = spawn('node', ['-e', 'console.log("Xray simulation running..."); setInterval(() => {}, 1000)']);
      
      this.xrayProcess.stdout?.on('data', (data) => {
        console.log(`Xray: ${data}`);
      });

      this.xrayProcess.stderr?.on('data', (data) => {
        console.error(`Xray Error: ${data}`);
      });

      this.xrayProcess.on('close', (code) => {
        console.log(`Xray process exited with code ${code}`);
        this.xrayProcess = null;
        
        // Auto-restart if not intentionally stopped
        if (!this.isRestarting && code !== 0) {
          console.log('🔄 Auto-restarting Xray in 5 seconds...');
          setTimeout(() => this.start(), 5000);
        }
      });

      console.log('✅ Xray-core started successfully');
    } catch (error) {
      console.error('❌ Failed to start Xray:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.xrayProcess && !this.xrayProcess.killed) {
      console.log('🛑 Stopping Xray-core...');
      this.isRestarting = true;
      this.xrayProcess.kill('SIGTERM');
      
      // Force kill if doesn't stop gracefully
      setTimeout(() => {
        if (this.xrayProcess && !this.xrayProcess.killed) {
          this.xrayProcess.kill('SIGKILL');
        }
      }, 5000);
      
      this.xrayProcess = null;
      this.isRestarting = false;
      console.log('✅ Xray-core stopped');
    }
  }

  async restart(): Promise<void> {
    console.log('🔄 Restarting Xray-core...');
    await this.stop();
    await new Promise(resolve => setTimeout(resolve, 2000));
    await this.start();
  }

  isRunning(): boolean {
    return this.xrayProcess !== null && !this.xrayProcess.killed;
  }

  async getStats(): Promise<any> {
    if (!this.isRunning()) {
      return { error: 'Xray is not running' };
    }

    try {
      // In production, this would query Xray's API
      // const response = await axios.get(`http://127.0.0.1:${this.apiPort}/stats/system`);
      // return response.data;
      
      // For now, return simulated stats
      return {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        connections: Math.floor(Math.random() * 100),
        traffic: {
          uplink: Math.floor(Math.random() * 1000000),
          downlink: Math.floor(Math.random() * 5000000)
        }
      };
    } catch (error) {
      console.error('Failed to get Xray stats:', error);
      return { error: 'Failed to get stats' };
    }
  }

  async addUser(username: string, password: string): Promise<void> {
    console.log(`➕ Adding user to Xray: ${username}`);
    await this.generateConfig();
    await this.restart();
  }

  async removeUser(username: string): Promise<void> {
    console.log(`➖ Removing user from Xray: ${username}`);
    await this.generateConfig();
    await this.restart();
  }
}

export const xrayManager = new XrayManager();