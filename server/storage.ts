import { type User, type InsertUser, type Connection, type InsertConnection, type IpPool, type InsertIpPool, type Admin, type InsertAdmin, users, connections, ipPool, admins } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
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
  
  // User portal specific methods
  getUserAssignedIP(userId: string): Promise<string | null>;
  
  // Admin management
  getAdmin(id: string): Promise<Admin | undefined>;
  getAdminByUsername(username: string): Promise<Admin | undefined>;
  getAllAdmins(): Promise<Admin[]>;
  createAdmin(admin: Omit<InsertAdmin, 'confirmPassword'>, createdBy: string): Promise<Admin>;
  updateAdmin(id: string, updates: Partial<Admin>): Promise<Admin | undefined>;
  deleteAdmin(id: string): Promise<boolean>;
  updateAdminLastLogin(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    // Initialize with default IP addresses if none exist
    this.initializeDefaultIPs();
  }

  private async initializeDefaultIPs(): Promise<void> {
    try {
      const existingIPs = await db.select().from(ipPool).limit(1);
      if (existingIPs.length === 0) {
        const defaultIPs = [
          { ipAddress: "192.168.1.15", ipType: "IPv4" as const, isAvailable: true, assignedUserId: null },
          { ipAddress: "192.168.1.16", ipType: "IPv4" as const, isAvailable: true, assignedUserId: null },
          { ipAddress: "192.168.1.17", ipType: "IPv4" as const, isAvailable: true, assignedUserId: null },
          { ipAddress: "10.0.0.45", ipType: "IPv4" as const, isAvailable: true, assignedUserId: null },
          { ipAddress: "2001:db8::1", ipType: "IPv6" as const, isAvailable: true, assignedUserId: null },
          { ipAddress: "2001:db8::2", ipType: "IPv6" as const, isAvailable: true, assignedUserId: null },
        ];

        for (const ip of defaultIPs) {
          await db.insert(ipPool).values({
            id: randomUUID(),
            ...ip
          }).onConflictDoNothing();
        }
      }
    } catch (error) {
      console.error('Error initializing default IPs:', error);
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.createdAt);
  }

  async createUser(insertUser: Omit<InsertUser, 'confirmPassword'>): Promise<User> {
    const id = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + insertUser.daysValid * 24 * 60 * 60 * 1000);
    
    const [user] = await db.insert(users).values({
      ...insertUser,
      id,
      createdAt: now,
      expiresAt,
      dataUsed: 0,
      isActive: true,
      lastConnection: null,
      email: insertUser.email || null,
    }).returning();
    
    // Assign IP to user
    await db.update(ipPool)
      .set({ isAvailable: false, assignedUserId: id })
      .where(and(
        eq(ipPool.ipAddress, insertUser.ipAddress),
        eq(ipPool.isAvailable, true)
      ));
    
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    
    return user || undefined;
  }

  async deleteUser(id: string): Promise<boolean> {
    // Release IP
    await db.update(ipPool)
      .set({ isAvailable: true, assignedUserId: null })
      .where(eq(ipPool.assignedUserId, id));
    
    // Delete user connections
    await db.delete(connections).where(eq(connections.userId, id));
    
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount! > 0;
  }

  async createConnection(connection: InsertConnection): Promise<Connection> {
    const id = randomUUID();
    const [conn] = await db.insert(connections).values({
      ...connection,
      id,
      startTime: new Date(),
      endTime: null,
      bytesTransferred: 0,
    }).returning();
    
    // Update user's last connection
    await db.update(users)
      .set({ lastConnection: new Date() })
      .where(eq(users.id, connection.userId));
    
    return conn;
  }

  async getActiveConnections(): Promise<Connection[]> {
    return await db.select().from(connections).where(eq(connections.endTime, null));
  }

  async getUserConnections(userId: string): Promise<Connection[]> {
    return await db.select().from(connections).where(eq(connections.userId, userId));
  }

  async endConnection(id: string, bytesTransferred: number): Promise<void> {
    const [connection] = await db.update(connections)
      .set({ 
        endTime: new Date(), 
        bytesTransferred 
      })
      .where(eq(connections.id, id))
      .returning();
    
    if (connection) {
      // Update user's data usage
      const [user] = await db.select().from(users).where(eq(users.id, connection.userId));
      if (user) {
        await db.update(users)
          .set({ dataUsed: (user.dataUsed || 0) + bytesTransferred })
          .where(eq(users.id, connection.userId));
      }
    }
  }

  async getAvailableIPs(): Promise<IpPool[]> {
    return await db.select().from(ipPool).where(eq(ipPool.isAvailable, true));
  }

  async getAllIPs(): Promise<IpPool[]> {
    return await db.select().from(ipPool);
  }

  async addIP(ip: InsertIpPool): Promise<IpPool> {
    const [newIP] = await db.insert(ipPool).values({
      ...ip,
      id: randomUUID(),
      isAvailable: ip.isAvailable ?? true,
      assignedUserId: ip.assignedUserId || null
    }).returning();
    
    return newIP;
  }

  async assignIP(ipId: string, userId: string): Promise<void> {
    await db.update(ipPool)
      .set({ isAvailable: false, assignedUserId: userId })
      .where(eq(ipPool.id, ipId));
  }

  async releaseIP(ipId: string): Promise<void> {
    await db.update(ipPool)
      .set({ isAvailable: true, assignedUserId: null })
      .where(eq(ipPool.id, ipId));
  }

  async deleteIP(ipId: string): Promise<boolean> {
    const result = await db.delete(ipPool).where(eq(ipPool.id, ipId));
    return result.rowCount > 0;
  }

  async getTotalUsers(): Promise<number> {
    const result = await db.select().from(users);
    return result.length;
  }

  async getActiveConnectionsCount(): Promise<number> {
    const result = await db.select().from(connections).where(eq(connections.endTime, null));
    return result.length;
  }

  async getTotalDataTransferred(): Promise<number> {
    const result = await db.select().from(connections);
    return result.reduce((total, conn) => total + (conn.bytesTransferred || 0), 0);
  }

  async getAvailableIPsCount(): Promise<number> {
    const result = await db.select().from(ipPool).where(eq(ipPool.isAvailable, true));
    return result.length;
  }

  async getUserAssignedIP(userId: string): Promise<string | null> {
    const [assignedIP] = await db.select().from(ipPool).where(eq(ipPool.assignedUserId, userId));
    return assignedIP ? assignedIP.ipAddress : null;
  }

  // Admin management methods
  async getAdmin(id: string): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.id, id));
    return admin;
  }

  async getAdminByUsername(username: string): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.username, username));
    return admin;
  }

  async getAllAdmins(): Promise<Admin[]> {
    return await db.select().from(admins);
  }

  async createAdmin(admin: Omit<InsertAdmin, 'confirmPassword'>, createdBy: string): Promise<Admin> {
    const [newAdmin] = await db.insert(admins).values({
      ...admin,
      id: randomUUID(),
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    
    return newAdmin;
  }

  async updateAdmin(id: string, updates: Partial<Admin>): Promise<Admin | undefined> {
    const [updatedAdmin] = await db.update(admins)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(admins.id, id))
      .returning();
    
    return updatedAdmin;
  }

  async deleteAdmin(id: string): Promise<boolean> {
    const result = await db.delete(admins).where(eq(admins.id, id));
    return result.rowCount > 0;
  }

  async updateAdminLastLogin(id: string): Promise<void> {
    await db.update(admins)
      .set({ lastLogin: new Date() })
      .where(eq(admins.id, id));
  }
}

export const storage = new DatabaseStorage();