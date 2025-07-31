import { type User, type InsertUser, type Connection, type InsertConnection, type IpPool, type InsertIpPool } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: Omit<InsertUser, 'confirmPassword'>): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  
  // Connection management
  createConnection(connection: InsertConnection): Promise<Connection>;
  getActiveConnections(): Promise<Connection[]>;
  getUserConnections(userId: string): Promise<Connection[]>;
  endConnection(id: string, bytesTransferred: number): Promise<void>;
  
  // IP Pool management
  getAvailableIPs(): Promise<IpPool[]>;
  getAllIPs(): Promise<IpPool[]>;
  addIP(ip: InsertIpPool): Promise<IpPool>;
  assignIP(ipId: string, userId: string): Promise<void>;
  releaseIP(ipId: string): Promise<void>;
  
  // Statistics
  getTotalUsers(): Promise<number>;
  getActiveConnectionsCount(): Promise<number>;
  getTotalDataTransferred(): Promise<number>;
  getAvailableIPsCount(): Promise<number>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private connections: Map<string, Connection> = new Map();
  private ipPool: Map<string, IpPool> = new Map();

  constructor() {
    // Initialize with some default IP addresses
    const defaultIPs = [
      { ipAddress: "192.168.1.15", ipType: "IPv4", isAvailable: true, assignedUserId: null },
      { ipAddress: "192.168.1.16", ipType: "IPv4", isAvailable: true, assignedUserId: null },
      { ipAddress: "192.168.1.17", ipType: "IPv4", isAvailable: true, assignedUserId: null },
      { ipAddress: "10.0.0.45", ipType: "IPv4", isAvailable: true, assignedUserId: null },
      { ipAddress: "2001:db8::1", ipType: "IPv6", isAvailable: true, assignedUserId: null },
      { ipAddress: "2001:db8::2", ipType: "IPv6", isAvailable: true, assignedUserId: null },
    ];

    defaultIPs.forEach(ip => {
      const id = randomUUID();
      this.ipPool.set(id, { id, ...ip });
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values()).sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async createUser(insertUser: Omit<InsertUser, 'confirmPassword'>): Promise<User> {
    const id = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + insertUser.daysValid * 24 * 60 * 60 * 1000);
    
    const user: User = {
      ...insertUser,
      id,
      createdAt: now,
      expiresAt,
      dataUsed: 0,
      isActive: true,
      lastConnection: null,
      email: insertUser.email || null,
    };
    
    this.users.set(id, user);
    
    // Assign IP to user
    const availableIP = Array.from(this.ipPool.values()).find(
      ip => ip.ipAddress === insertUser.ipAddress && ip.isAvailable
    );
    if (availableIP) {
      availableIP.isAvailable = false;
      availableIP.assignedUserId = id;
    }
    
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: string): Promise<boolean> {
    const user = this.users.get(id);
    if (!user) return false;
    
    // Release IP
    const assignedIP = Array.from(this.ipPool.values()).find(ip => ip.assignedUserId === id);
    if (assignedIP) {
      assignedIP.isAvailable = true;
      assignedIP.assignedUserId = null;
    }
    
    // Remove user connections
    const userConnections = Array.from(this.connections.entries()).filter(
      ([_, conn]) => conn.userId === id
    );
    userConnections.forEach(([connId, _]) => this.connections.delete(connId));
    
    this.users.delete(id);
    return true;
  }

  async createConnection(connection: InsertConnection): Promise<Connection> {
    const id = randomUUID();
    const conn: Connection = {
      ...connection,
      id,
      startTime: new Date(),
      endTime: null,
      bytesTransferred: 0,
    };
    
    this.connections.set(id, conn);
    
    // Update user's last connection
    const user = this.users.get(connection.userId);
    if (user) {
      user.lastConnection = new Date();
    }
    
    return conn;
  }

  async getActiveConnections(): Promise<Connection[]> {
    return Array.from(this.connections.values()).filter(conn => !conn.endTime);
  }

  async getUserConnections(userId: string): Promise<Connection[]> {
    return Array.from(this.connections.values()).filter(conn => conn.userId === userId);
  }

  async endConnection(id: string, bytesTransferred: number): Promise<void> {
    const connection = this.connections.get(id);
    if (!connection) return;
    
    connection.endTime = new Date();
    connection.bytesTransferred = bytesTransferred;
    
    // Update user's data usage
    const user = this.users.get(connection.userId);
    if (user) {
      user.dataUsed = (user.dataUsed || 0) + bytesTransferred;
    }
  }

  async getAvailableIPs(): Promise<IpPool[]> {
    return Array.from(this.ipPool.values()).filter(ip => ip.isAvailable);
  }

  async getAllIPs(): Promise<IpPool[]> {
    return Array.from(this.ipPool.values());
  }

  async addIP(ip: InsertIpPool): Promise<IpPool> {
    const id = randomUUID();
    const newIP: IpPool = { 
      ...ip, 
      id,
      isAvailable: ip.isAvailable ?? true,
      assignedUserId: ip.assignedUserId || null
    };
    this.ipPool.set(id, newIP);
    return newIP;
  }

  async assignIP(ipId: string, userId: string): Promise<void> {
    const ip = this.ipPool.get(ipId);
    if (ip) {
      ip.isAvailable = false;
      ip.assignedUserId = userId;
    }
  }

  async releaseIP(ipId: string): Promise<void> {
    const ip = this.ipPool.get(ipId);
    if (ip) {
      ip.isAvailable = true;
      ip.assignedUserId = null;
    }
  }

  async getTotalUsers(): Promise<number> {
    return this.users.size;
  }

  async getActiveConnectionsCount(): Promise<number> {
    return Array.from(this.connections.values()).filter(conn => !conn.endTime).length;
  }

  async getTotalDataTransferred(): Promise<number> {
    return Array.from(this.connections.values())
      .reduce((total, conn) => total + (conn.bytesTransferred || 0), 0);
  }

  async getAvailableIPsCount(): Promise<number> {
    return Array.from(this.ipPool.values()).filter(ip => ip.isAvailable).length;
  }
}

export const storage = new MemStorage();
