import { 
  type User, type InsertUser, type Connection, type InsertConnection, 
  type IpPool, type InsertIpPool, type Admin, type InsertAdmin,
  type Package, type InsertPackage, type ApiKey, type InsertApiKey,
  users, connections, ipPool, admins, packages, apiKeys, settings 
} from "@shared/schema";
import { db } from "./db";
import { eq, and, isNull, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

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
  
  // API Key management
  getAllApiKeys(): Promise<ApiKey[]>;
  createApiKey(name: string, createdBy: string): Promise<{ id: string; name: string; key: string }>;
  deleteApiKey(id: string): Promise<boolean>;
  updateApiKeyUsage(keyHash: string): Promise<void>;
  
  // Package management
  getAllPackages(): Promise<Package[]>;
  getPackage(id: string): Promise<Package | undefined>;
  createPackage(pkg: InsertPackage): Promise<Package>;
  updatePackage(id: string, updates: Partial<Package>): Promise<Package | undefined>;
  deletePackage(id: string): Promise<boolean>;
  createUserFromPackage(packageId: string, username: string, password: string, ipAddress: string, port: number): Promise<User>;
  
  // Online status management
  updateUserOnlineStatus?(userId: string, isOnline: boolean): Promise<void>;
  getOnlineUsers?(): Promise<User[]>;
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
    const now = Math.floor(Date.now() / 1000);
    
    const [user] = await db.insert(users).values({
      ...insertUser,
      id,
      createdAt: now,
      dataUsed: 0,
      isActive: true,
      lastConnection: null,
      email: insertUser.email || null,
    }).returning();
    
    // Mark IP as assigned (multiple users can share same IP)
    await db.update(ipPool)
      .set({ 
        isAvailable: false,
        assignedUserId: id
      })
      .where(eq(ipPool.ipAddress, insertUser.ipAddress));
    
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
    try {
      // Get user's IP address to update count
      const user = await this.getUser(id);
      if (user) {
        // Release IP assignment (multiple users can share IPs)
        const [ipRecord] = await db.select().from(ipPool).where(eq(ipPool.ipAddress, user.ipAddress));
        if (ipRecord) {
          await db.update(ipPool)
            .set({ isAvailable: true, assignedUserId: null })
            .where(eq(ipPool.ipAddress, user.ipAddress));
        }
      }
      
      // Delete user connections
      await db.delete(connections).where(eq(connections.userId, id));
      
      const result = await db.delete(users).where(eq(users.id, id));
      return result.changes > 0;
    } catch (error) {
      console.error("Error deleting user:", error);
      return false;
    }
  }

  async createConnection(connection: InsertConnection): Promise<Connection> {
    const id = randomUUID();
    const now = Math.floor(Date.now() / 1000);
    const [conn] = await db.insert(connections).values({
      ...connection,
      id,
      startTime: now,
      endTime: null,
      bytesTransferred: 0,
    }).returning();
    
    // Update user's last connection
    await db.update(users)
      .set({ lastConnection: now })
      .where(eq(users.id, connection.userId));
    
    return conn;
  }

  async getActiveConnections(): Promise<Connection[]> {
    return await db.select().from(connections).where(isNull(connections.endTime));
  }

  async getTotalConnectionsCount(): Promise<number> {
    const result = await db.select().from(connections);
    return result.length;
  }

  async getUserConnections(userId: string): Promise<Connection[]> {
    return await db.select().from(connections).where(eq(connections.userId, userId));
  }

  async endConnection(id: string, bytesTransferred: number): Promise<void> {
    const [connection] = await db.update(connections)
      .set({ 
        endTime: Math.floor(Date.now() / 1000), 
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
    // All IPs are always available since multiple users can share them
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
    // Multiple users can share the same IP - no restrictions
    // IPs remain available for other users to use as well
    const [ip] = await db.select().from(ipPool).where(eq(ipPool.id, ipId));
    if (ip) {
      // Update user with the assigned IP address
      await db.update(users)
        .set({ 
          ipAddress: ip.ipAddress,
          outboundIp: ip.ipAddress // Set outbound IP for routing
        })
        .where(eq(users.id, userId));
    }
  }

  async releaseIP(ipId: string): Promise<void> {
    // IPs are never truly "released" since multiple users can share them
    // This is a no-op function to maintain compatibility
    console.log(`IP ${ipId} remains available for sharing among multiple users`);
  }

  async getIPUsageCount(ipAddress: string): Promise<number> {
    const result = await db.select().from(users).where(eq(users.ipAddress, ipAddress));
    return result.length;
  }



  async updateIPAvailability(ipId: string, isAvailable: boolean, assignedUserId?: string): Promise<void> {
    // IPs are always available for sharing - just update the assigned user if needed
    await db.update(ipPool)
      .set({ 
        assignedUserId: assignedUserId || null 
      })
      .where(eq(ipPool.id, ipId));
  }

  async getTotalUsers(): Promise<number> {
    const result = await db.select().from(users);
    return result.length;
  }

  async getActiveConnectionsCount(): Promise<number> {
    const result = await db.select().from(connections).where(isNull(connections.endTime));
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
      createdAt: Math.floor(Date.now() / 1000),
      updatedAt: Math.floor(Date.now() / 1000),
    }).returning();
    
    return newAdmin;
  }

  async updateAdmin(id: string, updates: Partial<Admin>): Promise<Admin | undefined> {
    const [updatedAdmin] = await db.update(admins)
      .set({ ...updates, updatedAt: Math.floor(Date.now() / 1000) })
      .where(eq(admins.id, id))
      .returning();
    
    return updatedAdmin;
  }

  async deleteAdmin(id: string): Promise<boolean> {
    const result = await db.delete(admins).where(eq(admins.id, id));
    return result.changes > 0;
  }

  async deleteIP(id: string): Promise<boolean> {
    try {
      const result = await db.delete(ipPool).where(eq(ipPool.id, id));
      return result.changes > 0;
    } catch (error) {
      console.error("Error deleting IP:", error);
      return false;
    }
  }

  async updateAdminLastLogin(id: string): Promise<void> {
    await db.update(admins)
      .set({ lastLogin: Math.floor(Date.now() / 1000) })
      .where(eq(admins.id, id));
  }

  // API Key management methods
  async getAllApiKeys(): Promise<ApiKey[]> {
    return await db.select().from(apiKeys);
  }

  async createApiKey(name: string, createdBy: string = "system"): Promise<{ id: string; name: string; key: string }> {
    const keyId = randomUUID();
    const apiKey = `sk-${keyId.replace(/-/g, '')}`;
    
    // Hash the API key for storage
    const keyHash = await bcrypt.hash(apiKey, 10);
    
    const [newKey] = await db.insert(apiKeys).values({
      id: keyId,
      name,
      keyHash,
      isActive: true,
      usageCount: 0,
      createdBy
    }).returning();

    return {
      id: newKey.id,
      name: newKey.name,
      key: apiKey
    };
  }

  async deleteApiKey(id: string): Promise<boolean> {
    const result = await db.delete(apiKeys).where(eq(apiKeys.id, id));
    return result.changes > 0;
  }

  async updateApiKeyUsage(keyHash: string): Promise<void> {
    await db.update(apiKeys)
      .set({ 
        usageCount: sql`${apiKeys.usageCount} + 1`,
        lastUsed: Math.floor(Date.now() / 1000)
      })
      .where(eq(apiKeys.keyHash, keyHash));
  }

  // Package management methods
  async getAllPackages(): Promise<Package[]> {
    try {
      return await db.select().from(packages);
    } catch (error) {
      console.error("Error getting packages:", error);
      return [];
    }
  }

  async getPackage(id: string): Promise<Package | undefined> {
    try {
      const [pkg] = await db.select().from(packages).where(eq(packages.id, id));
      return pkg;
    } catch (error) {
      console.error("Error getting package:", error);
      return undefined;
    }
  }

  async createPackage(pkg: InsertPackage): Promise<Package> {
    const [newPackage] = await db.insert(packages).values({
      ...pkg,
      id: randomUUID(),
    }).returning();
    return newPackage;
  }

  async updatePackage(id: string, updates: Partial<Package>): Promise<Package | undefined> {
    try {
      const [updated] = await db.update(packages)
        .set({
          ...updates,
          updatedAt: Math.floor(Date.now() / 1000)
        })
        .where(eq(packages.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error("Error updating package:", error);
      return undefined;
    }
  }

  async deletePackage(id: string): Promise<boolean> {
    try {
      await db.delete(packages).where(eq(packages.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting package:", error);
      return false;
    }
  }

  async createUserFromPackage(packageId: string, username: string, password: string, ipAddress: string, port: number, outboundIp?: string): Promise<User> {
    const pkg = await this.getPackage(packageId);
    if (!pkg) {
      throw new Error("Package not found");
    }

    // Calculate expiration date based on package time limit
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + (pkg.timeLimit * 24 * 60 * 60); // Convert days to seconds

    const userData: Omit<InsertUser, 'confirmPassword'> = {
      username,
      password,
      ipAddress,
      outboundIp,
      port,
      dataLimit: pkg.dataLimitGB * 1024 * 1024 * 1024, // Convert GB to bytes
      daysValid: pkg.timeLimit,
      expiresAt,
      packageId: packageId,
    };

    return await this.createUser(userData);
  }

  // In-memory online status tracking
  private onlineUsers: Set<string> = new Set();

  async updateUserOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    try {
      if (isOnline) {
        this.onlineUsers.add(userId);
      } else {
        this.onlineUsers.delete(userId);
      }
      
      // Update last connection time if user comes online
      if (isOnline) {
        await db.update(users)
          .set({ 
            lastConnection: Math.floor(Date.now() / 1000)
          })
          .where(eq(users.id, userId));
      }
    } catch (error) {
      console.error('Error updating user online status:', error);
    }
  }

  async getOnlineUsers(): Promise<User[]> {
    try {
      if (this.onlineUsers.size === 0) return [];
      
      const onlineUserIds = Array.from(this.onlineUsers);
      const onlineUserData = await Promise.all(
        onlineUserIds.map(userId => this.getUser(userId))
      );
      return onlineUserData.filter(Boolean) as User[];
    } catch (error) {
      console.error('Error getting online users:', error);
      return [];
    }
  }

  getOnlineUserIds(): string[] {
    return Array.from(this.onlineUsers);
  }

  // Enhanced getAllUsers to include online status from memory  
  async getAllUsersWithOnlineStatus(): Promise<User[]> {
    try {
      const allUsers = await db.select().from(users);
      // Add online status from in-memory tracking
      return allUsers.map(user => ({
        ...user,
        isOnline: this.onlineUsers.has(user.id)
      })) as (User & { isOnline: boolean })[];
    } catch (error) {
      console.error('Error fetching all users:', error);
      return [];
    }
  }

  // Get public IPs for routing
  async getPublicIPs(): Promise<Array<{ id: string; ipAddress: string; isAvailable: boolean; assignedUserId?: string }>> {
    try {
      const publicIPs = await db.select().from(ipPool).where(eq(ipPool.isPublic, true));
      return publicIPs.map(ip => ({
        id: ip.id,
        ipAddress: ip.ipAddress,
        isAvailable: ip.isAvailable || true,
        assignedUserId: ip.assignedUserId || undefined
      }));
    } catch (error) {
      console.error('Error fetching public IPs:', error);
      return [];
    }
  }

  // Settings management
  async saveSettings(settingsData: any): Promise<void> {
    try {
      // Save each category of settings
      for (const [category, data] of Object.entries(settingsData)) {
        for (const [key, value] of Object.entries(data as any)) {
          await db.insert(settings)
            .values({
              category,
              key,
              value: JSON.stringify(value)
            })
            .onConflictDoUpdate({
              target: [settings.category, settings.key],
              set: {
                value: JSON.stringify(value),
                updatedAt: Math.floor(Date.now() / 1000)
              }
            });
        }
      }
      console.log('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  }

  async getSettings(): Promise<any> {
    try {
      const allSettings = await db.select().from(settings);
      const organized: any = {};
      
      allSettings.forEach(setting => {
        if (!organized[setting.category]) {
          organized[setting.category] = {};
        }
        try {
          organized[setting.category][setting.key] = JSON.parse(setting.value);
        } catch {
          organized[setting.category][setting.key] = setting.value;
        }
      });
      
      return organized;
    } catch (error) {
      console.error('Error fetching settings:', error);
      return {};
    }
  }
}

export const storage = new DatabaseStorage();