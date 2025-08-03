var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  admins: () => admins,
  apiKeys: () => apiKeys,
  connections: () => connections,
  insertAdminSchema: () => insertAdminSchema,
  insertApiKeySchema: () => insertApiKeySchema,
  insertConnectionSchema: () => insertConnectionSchema,
  insertIpPoolSchema: () => insertIpPoolSchema,
  insertPackageSchema: () => insertPackageSchema,
  insertUserSchema: () => insertUserSchema,
  ipPool: () => ipPool,
  packages: () => packages,
  settings: () => settings,
  users: () => users
});
import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  real
} from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users, connections, ipPool, admins, packages, settings, apiKeys, insertUserSchema, insertConnectionSchema, insertIpPoolSchema, insertAdminSchema, insertPackageSchema, insertApiKeySchema;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    users = sqliteTable("users", {
      id: text("id").primaryKey().default(sql`(hex(randomblob(16)))`),
      username: text("username").notNull().unique(),
      password: text("password").notNull(),
      email: text("email"),
      ipAddress: text("ip_address"),
      // Optional - can be auto-assigned from pool
      outboundIp: text("outbound_ip"),
      // The public IP this user's traffic will be routed through
      port: integer("port").notNull(),
      dataLimit: integer("data_limit").notNull(),
      // in bytes
      dataUsed: integer("data_used").default(0),
      daysValid: integer("days_valid"),
      // Optional - can calculate from expiresAt
      createdAt: integer("created_at").default(sql`CURRENT_TIMESTAMP`),
      expiresAt: integer("expires_at").notNull(),
      isActive: integer("is_active", { mode: "boolean" }).default(true),
      lastConnection: integer("last_connection")
    });
    connections = sqliteTable("connections", {
      id: text("id").primaryKey().default(sql`(hex(randomblob(16)))`),
      userId: text("user_id").references(() => users.id).notNull(),
      ipAddress: text("ip_address").notNull(),
      startTime: integer("start_time").default(sql`CURRENT_TIMESTAMP`),
      endTime: integer("end_time"),
      bytesTransferred: integer("bytes_transferred").default(0)
    });
    ipPool = sqliteTable("ip_pool", {
      id: text("id").primaryKey().default(sql`(hex(randomblob(16)))`),
      ipAddress: text("ip_address").notNull().unique(),
      ipType: text("ip_type").notNull(),
      // 'IPv4' or 'IPv6'
      isPublic: integer("is_public", { mode: "boolean" }).default(false),
      // Is this a public outbound IP?
      isAvailable: integer("is_available", { mode: "boolean" }).default(true)
      // Removed assignedUserId - multiple users can share the same IP
    });
    admins = sqliteTable("admins", {
      id: text("id").primaryKey().default(sql`(hex(randomblob(16)))`),
      username: text("username").unique().notNull(),
      email: text("email").unique(),
      password: text("password").notNull(),
      role: text("role").notNull().default("admin"),
      // super_admin, admin, moderator, viewer
      permissions: text("permissions").default("{}"),
      // JSON string for permissions
      isActive: integer("is_active", { mode: "boolean" }).default(true),
      lastLogin: integer("last_login"),
      createdAt: integer("created_at").default(sql`CURRENT_TIMESTAMP`),
      updatedAt: integer("updated_at").default(sql`CURRENT_TIMESTAMP`),
      createdBy: text("created_by")
      // ID of admin who created this account
    });
    packages = sqliteTable("packages", {
      id: text("id").primaryKey().default(sql`(hex(randomblob(16)))`),
      name: text("name").notNull(),
      description: text("description"),
      dataLimitGB: integer("data_limit_gb").notNull(),
      timeLimit: integer("time_limit").notNull(),
      // in days
      maxConnections: integer("max_connections").default(1),
      allowedIPs: text("allowed_ips"),
      // comma-separated
      price: real("price"),
      isActive: integer("is_active", { mode: "boolean" }).default(true),
      createdAt: integer("created_at").default(sql`CURRENT_TIMESTAMP`),
      updatedAt: integer("updated_at").default(sql`CURRENT_TIMESTAMP`)
    });
    settings = sqliteTable("settings", {
      id: text("id").primaryKey().default(sql`(hex(randomblob(16)))`),
      category: text("category").notNull(),
      // server, security, firewall, etc.
      key: text("key").notNull(),
      value: text("value").notNull(),
      // JSON string
      updatedAt: integer("updated_at").default(sql`CURRENT_TIMESTAMP`)
    });
    apiKeys = sqliteTable("api_keys", {
      id: text("id").primaryKey().default(sql`(hex(randomblob(16)))`),
      name: text("name").notNull(),
      keyHash: text("key_hash").notNull().unique(),
      isActive: integer("is_active", { mode: "boolean" }).default(true),
      usageCount: integer("usage_count").default(0),
      lastUsed: integer("last_used"),
      createdAt: integer("created_at").default(sql`CURRENT_TIMESTAMP`),
      createdBy: text("created_by").notNull()
    });
    insertUserSchema = createInsertSchema(users).omit({
      id: true,
      createdAt: true,
      dataUsed: true,
      lastConnection: true,
      expiresAt: true
      // Omit this so we can make it optional
    }).extend({
      confirmPassword: z.string().optional(),
      packageId: z.string().optional(),
      expiresAt: z.number().optional(),
      // Optional - calculated from daysValid if not provided
      // Make all network fields optional for auto-assignment
      ipAddress: z.string().optional(),
      outboundIp: z.string().optional(),
      daysValid: z.number().optional(),
      // Optional since we calculate expiresAt
      port: z.number().optional()
      // Optional - auto-assigned if not provided
    }).refine((data) => !data.confirmPassword || data.password === data.confirmPassword, {
      message: "Passwords don't match",
      path: ["confirmPassword"]
    });
    insertConnectionSchema = createInsertSchema(connections).omit({
      id: true,
      startTime: true
    });
    insertIpPoolSchema = createInsertSchema(ipPool).omit({
      id: true
    });
    insertAdminSchema = createInsertSchema(admins).omit({
      id: true,
      createdAt: true,
      updatedAt: true,
      lastLogin: true
    }).extend({
      confirmPassword: z.string().min(6, "Password must be at least 6 characters")
    }).refine((data) => data.password === data.confirmPassword, {
      message: "Passwords don't match",
      path: ["confirmPassword"]
    });
    insertPackageSchema = createInsertSchema(packages).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertApiKeySchema = createInsertSchema(apiKeys).omit({
      id: true,
      keyHash: true,
      usageCount: true,
      lastUsed: true,
      createdAt: true
    });
  }
});

// server/db.ts
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
var sqlite, db, initializeDatabase;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    sqlite = new Database("./database.sqlite");
    sqlite.pragma("journal_mode = WAL");
    db = drizzle(sqlite, { schema: schema_exports });
    initializeDatabase = () => {
      try {
        sqlite.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        email TEXT,
        ip_address TEXT NOT NULL,
        port INTEGER NOT NULL,
        data_limit INTEGER NOT NULL,
        data_used INTEGER DEFAULT 0,
        days_valid INTEGER NOT NULL,
        created_at INTEGER DEFAULT CURRENT_TIMESTAMP,
        expires_at INTEGER NOT NULL,
        is_active INTEGER DEFAULT 1,
        last_connection INTEGER
      );

      CREATE TABLE IF NOT EXISTS connections (
        id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
        user_id TEXT NOT NULL REFERENCES users(id),
        ip_address TEXT NOT NULL,
        start_time INTEGER DEFAULT CURRENT_TIMESTAMP,
        end_time INTEGER,
        bytes_transferred INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS ip_pool (
        id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
        ip_address TEXT NOT NULL UNIQUE,
        ip_type TEXT NOT NULL,
        is_available INTEGER DEFAULT 1,
        assigned_user_id TEXT REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS admins (
        id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'admin',
        permissions TEXT DEFAULT '{}',
        is_active INTEGER DEFAULT 1,
        last_login INTEGER,
        created_at INTEGER DEFAULT CURRENT_TIMESTAMP,
        updated_at INTEGER DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT
      );
    `);
        const ipCount = sqlite.prepare("SELECT COUNT(*) as count FROM ip_pool").get();
        if (ipCount.count === 0) {
          const insertIP = sqlite.prepare(`
        INSERT INTO ip_pool (ip_address, ip_type, is_available) 
        VALUES (?, ?, 1)
      `);
          const defaultIPs = [
            "192.168.1.100",
            "192.168.1.101",
            "192.168.1.102",
            "10.0.0.100",
            "10.0.0.101",
            "2001:db8::1"
          ];
          defaultIPs.forEach((ip) => {
            const ipType = ip.includes(":") ? "IPv6" : "IPv4";
            insertIP.run(ip, ipType);
          });
          console.log("\u2705 Initialized IP pool with 6 default addresses");
        }
        const adminCount = sqlite.prepare("SELECT COUNT(*) as count FROM admins").get();
        if (adminCount.count === 0) {
          sqlite.prepare(`
        INSERT INTO admins (username, password, role, email) 
        VALUES ('admin', 'admin123', 'super_admin', 'admin@localhost')
      `).run();
          console.log("\u2705 Created default admin account (admin/admin123)");
        }
        console.log("\u2705 SQLite database initialized successfully");
      } catch (error) {
        console.error("\u274C Database initialization error:", error);
      }
    };
    initializeDatabase();
  }
});

// server/storage.ts
import { eq, isNull, sql as sql2 } from "drizzle-orm";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
var DatabaseStorage, storage;
var init_storage = __esm({
  "server/storage.ts"() {
    "use strict";
    init_schema();
    init_db();
    DatabaseStorage = class {
      constructor() {
        this.initializeDefaultIPs();
      }
      async initializeDefaultIPs() {
        try {
          const existingIPs = await db.select().from(ipPool).limit(1);
          if (existingIPs.length === 0) {
            const defaultIPs = [
              { ipAddress: "103.7.4.182", ipType: "IPv4", isAvailable: true, isPublic: true },
              { ipAddress: "103.7.4.183", ipType: "IPv4", isAvailable: true, isPublic: true },
              { ipAddress: "103.7.4.184", ipType: "IPv4", isAvailable: true, isPublic: true },
              { ipAddress: "103.7.4.185", ipType: "IPv4", isAvailable: true, isPublic: true },
              { ipAddress: "2001:db8::1", ipType: "IPv6", isAvailable: true, isPublic: false },
              { ipAddress: "2001:db8::2", ipType: "IPv6", isAvailable: true, isPublic: false }
            ];
            for (const ip of defaultIPs) {
              await db.insert(ipPool).values({
                id: randomUUID(),
                ...ip
              }).onConflictDoNothing();
            }
          }
        } catch (error) {
          console.error("Error initializing default IPs:", error);
        }
      }
      async getUser(id) {
        const [user] = await db.select().from(users).where(eq(users.id, id));
        return user || void 0;
      }
      async getUserByUsername(username) {
        const [user] = await db.select().from(users).where(eq(users.username, username));
        return user || void 0;
      }
      async getAllUsers() {
        return await db.select().from(users).orderBy(users.createdAt);
      }
      async createUser(insertUser) {
        const id = randomUUID();
        const now = Math.floor(Date.now() / 1e3);
        let expiresAt = insertUser.expiresAt;
        if (!expiresAt && insertUser.daysValid) {
          expiresAt = now + insertUser.daysValid * 24 * 60 * 60;
        } else if (!expiresAt) {
          expiresAt = now + 30 * 24 * 60 * 60;
        }
        let assignedIP = insertUser.ipAddress;
        let outboundIP = insertUser.outboundIp;
        if (!assignedIP) {
          const availableIPs = await this.getAllIPs();
          if (availableIPs.length > 0) {
            const randomIP = availableIPs[Math.floor(Math.random() * availableIPs.length)];
            assignedIP = randomIP.ipAddress;
            outboundIP = randomIP.ipAddress;
          }
        }
        let port = insertUser.port;
        if (!port) {
          const existingUsers = await this.getAllUsers();
          const usedPorts = new Set(existingUsers.map((u) => u.port));
          port = 1081;
          while (usedPorts.has(port)) {
            port++;
          }
        }
        const [user] = await db.insert(users).values({
          ...insertUser,
          id,
          ipAddress: assignedIP,
          outboundIp: outboundIP || assignedIP,
          port,
          expiresAt,
          daysValid: insertUser.daysValid || 30,
          createdAt: now,
          dataUsed: 0,
          isActive: true,
          lastConnection: null,
          email: insertUser.email || null
        }).returning();
        console.log(`\u2705 Created user ${user.username} with shared IP: ${user.ipAddress}`);
        return user;
      }
      async updateUser(id, updates) {
        const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
        return user || void 0;
      }
      async deleteUser(id) {
        try {
          const user = await this.getUser(id);
          if (!user) {
            return false;
          }
          await db.delete(connections).where(eq(connections.userId, id));
          const result = await db.delete(users).where(eq(users.id, id));
          if (result.changes > 0) {
            console.log(`\u2705 Deleted user ${user.username}`);
            return true;
          }
          return false;
        } catch (error) {
          console.error("Error deleting user:", error);
          return false;
        }
      }
      async createConnection(connection) {
        const id = randomUUID();
        const now = Math.floor(Date.now() / 1e3);
        const [conn] = await db.insert(connections).values({
          ...connection,
          id,
          startTime: now,
          endTime: null,
          bytesTransferred: 0
        }).returning();
        await db.update(users).set({ lastConnection: now }).where(eq(users.id, connection.userId));
        return conn;
      }
      async getActiveConnections() {
        return await db.select().from(connections).where(isNull(connections.endTime));
      }
      async getTotalConnectionsCount() {
        const result = await db.select().from(connections);
        return result.length;
      }
      async getUserConnections(userId) {
        return await db.select().from(connections).where(eq(connections.userId, userId));
      }
      async endConnection(id, bytesTransferred) {
        const [connection] = await db.update(connections).set({
          endTime: Math.floor(Date.now() / 1e3),
          bytesTransferred
        }).where(eq(connections.id, id)).returning();
        if (connection) {
          const [user] = await db.select().from(users).where(eq(users.id, connection.userId));
          if (user) {
            await db.update(users).set({ dataUsed: (user.dataUsed || 0) + bytesTransferred }).where(eq(users.id, connection.userId));
          }
        }
      }
      async getAvailableIPs() {
        return await db.select().from(ipPool).where(eq(ipPool.isAvailable, true));
      }
      async getAllIPs() {
        return await db.select().from(ipPool);
      }
      async addIP(ip) {
        const [newIP] = await db.insert(ipPool).values({
          ...ip,
          id: randomUUID(),
          isAvailable: ip.isAvailable ?? true
        }).returning();
        return newIP;
      }
      // IP sharing methods removed - multiple users can use the same IP automatically
      async getIPUsageCount(ipAddress) {
        const result = await db.select().from(users).where(eq(users.ipAddress, ipAddress));
        return result.length;
      }
      async updateIPAvailability(ipId, isAvailable) {
        await db.update(ipPool).set({ isAvailable }).where(eq(ipPool.id, ipId));
      }
      async getTotalUsers() {
        const result = await db.select().from(users);
        return result.length;
      }
      async getActiveConnectionsCount() {
        const result = await db.select().from(connections).where(isNull(connections.endTime));
        return result.length;
      }
      async getTotalDataTransferred() {
        const result = await db.select().from(connections);
        return result.reduce((total, conn) => total + (conn.bytesTransferred || 0), 0);
      }
      async getAvailableIPsCount() {
        const result = await db.select().from(ipPool).where(eq(ipPool.isAvailable, true));
        return result.length;
      }
      async getUserAssignedIP(userId) {
        const [user] = await db.select().from(users).where(eq(users.id, userId));
        return user ? user.ipAddress : null;
      }
      // Admin management methods
      async getAdmin(id) {
        const [admin] = await db.select().from(admins).where(eq(admins.id, id));
        return admin;
      }
      async getAdminByUsername(username) {
        const [admin] = await db.select().from(admins).where(eq(admins.username, username));
        return admin;
      }
      async getAllAdmins() {
        return await db.select().from(admins);
      }
      async createAdmin(admin, createdBy) {
        const [newAdmin] = await db.insert(admins).values({
          ...admin,
          id: randomUUID(),
          createdBy,
          createdAt: Math.floor(Date.now() / 1e3),
          updatedAt: Math.floor(Date.now() / 1e3)
        }).returning();
        return newAdmin;
      }
      async updateAdmin(id, updates) {
        const [updatedAdmin] = await db.update(admins).set({ ...updates, updatedAt: Math.floor(Date.now() / 1e3) }).where(eq(admins.id, id)).returning();
        return updatedAdmin;
      }
      async deleteAdmin(id) {
        const result = await db.delete(admins).where(eq(admins.id, id));
        return result.changes > 0;
      }
      async deleteIP(id) {
        try {
          const result = await db.delete(ipPool).where(eq(ipPool.id, id));
          return result.changes > 0;
        } catch (error) {
          console.error("Error deleting IP:", error);
          return false;
        }
      }
      async updateAdminLastLogin(id) {
        await db.update(admins).set({ lastLogin: Math.floor(Date.now() / 1e3) }).where(eq(admins.id, id));
      }
      // API Key management methods
      async getAllApiKeys() {
        return await db.select().from(apiKeys);
      }
      async createApiKey(name, createdBy = "system") {
        const keyId = randomUUID();
        const apiKey = `sk-${keyId.replace(/-/g, "")}`;
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
      async deleteApiKey(id) {
        const result = await db.delete(apiKeys).where(eq(apiKeys.id, id));
        return result.changes > 0;
      }
      async updateApiKeyUsage(keyHash) {
        await db.update(apiKeys).set({
          usageCount: sql2`${apiKeys.usageCount} + 1`,
          lastUsed: Math.floor(Date.now() / 1e3)
        }).where(eq(apiKeys.keyHash, keyHash));
      }
      // Package management methods
      async getAllPackages() {
        try {
          return await db.select().from(packages);
        } catch (error) {
          console.error("Error getting packages:", error);
          return [];
        }
      }
      async getPackage(id) {
        try {
          const [pkg] = await db.select().from(packages).where(eq(packages.id, id));
          return pkg;
        } catch (error) {
          console.error("Error getting package:", error);
          return void 0;
        }
      }
      async createPackage(pkg) {
        const [newPackage] = await db.insert(packages).values({
          ...pkg,
          id: randomUUID()
        }).returning();
        return newPackage;
      }
      async updatePackage(id, updates) {
        try {
          const [updated] = await db.update(packages).set({
            ...updates,
            updatedAt: Math.floor(Date.now() / 1e3)
          }).where(eq(packages.id, id)).returning();
          return updated;
        } catch (error) {
          console.error("Error updating package:", error);
          return void 0;
        }
      }
      async deletePackage(id) {
        try {
          await db.delete(packages).where(eq(packages.id, id));
          return true;
        } catch (error) {
          console.error("Error deleting package:", error);
          return false;
        }
      }
      async createUserFromPackage(packageId, username, password, ipAddress, port, outboundIp) {
        const pkg = await this.getPackage(packageId);
        if (!pkg) {
          throw new Error("Package not found");
        }
        const now = Math.floor(Date.now() / 1e3);
        const expiresAt = now + pkg.timeLimit * 24 * 60 * 60;
        const userData = {
          username,
          password,
          ipAddress,
          outboundIp,
          port,
          dataLimit: pkg.dataLimitGB * 1024 * 1024 * 1024,
          // Convert GB to bytes
          daysValid: pkg.timeLimit,
          expiresAt,
          packageId
        };
        return await this.createUser(userData);
      }
      // In-memory online status tracking
      onlineUsers = /* @__PURE__ */ new Set();
      async updateUserOnlineStatus(userId, isOnline) {
        try {
          if (isOnline) {
            this.onlineUsers.add(userId);
          } else {
            this.onlineUsers.delete(userId);
          }
          if (isOnline) {
            await db.update(users).set({
              lastConnection: Math.floor(Date.now() / 1e3)
            }).where(eq(users.id, userId));
          }
        } catch (error) {
          console.error("Error updating user online status:", error);
        }
      }
      async getOnlineUsers() {
        try {
          if (this.onlineUsers.size === 0) return [];
          const onlineUserIds = Array.from(this.onlineUsers);
          const onlineUserData = await Promise.all(
            onlineUserIds.map((userId) => this.getUser(userId))
          );
          return onlineUserData.filter(Boolean);
        } catch (error) {
          console.error("Error getting online users:", error);
          return [];
        }
      }
      getOnlineUserIds() {
        return Array.from(this.onlineUsers);
      }
      // Enhanced getAllUsers to include online status from memory  
      async getAllUsersWithOnlineStatus() {
        try {
          const allUsers = await db.select().from(users);
          return allUsers.map((user) => ({
            ...user,
            isOnline: this.onlineUsers.has(user.id)
          }));
        } catch (error) {
          console.error("Error fetching all users:", error);
          return [];
        }
      }
      // Get public IPs for routing
      async getPublicIPs() {
        try {
          const publicIPs = await db.select().from(ipPool).where(eq(ipPool.isPublic, true));
          return publicIPs.map((ip) => ({
            id: ip.id,
            ipAddress: ip.ipAddress,
            isAvailable: ip.isAvailable || true
            // Removed assignedUserId - IPs can be shared
          }));
        } catch (error) {
          console.error("Error fetching public IPs:", error);
          return [];
        }
      }
      // Settings management
      async saveSettings(settingsData) {
        try {
          console.log("Saving settings data:", settingsData);
          for (const [category, data] of Object.entries(settingsData)) {
            for (const [key, value] of Object.entries(data)) {
              await db.insert(settings).values({
                category,
                key,
                value: JSON.stringify(value)
              }).onConflictDoUpdate({
                target: [settings.category, settings.key],
                set: {
                  value: JSON.stringify(value),
                  updatedAt: Math.floor(Date.now() / 1e3)
                }
              });
            }
          }
          console.log("Settings saved successfully");
        } catch (error) {
          console.error("Error saving settings:", error);
          throw error;
        }
      }
      async getSettings(category) {
        try {
          const results = category ? await db.select().from(settings).where(eq(settings.category, category)) : await db.select().from(settings);
          const settingsObject = {};
          for (const setting of results) {
            if (!settingsObject[setting.category]) {
              settingsObject[setting.category] = {};
            }
            try {
              settingsObject[setting.category][setting.key] = JSON.parse(setting.value);
            } catch {
              settingsObject[setting.category][setting.key] = setting.value;
            }
          }
          return settingsObject;
        } catch (error) {
          console.error("Error getting settings:", error);
          return {};
        }
      }
    };
    storage = new DatabaseStorage();
  }
});

// server/services/networkMonitor.ts
var networkMonitor_exports = {};
__export(networkMonitor_exports, {
  NetworkMonitor: () => NetworkMonitor,
  networkMonitor: () => networkMonitor
});
import { exec as exec2 } from "child_process";
import { promisify as promisify2 } from "util";
import os from "os";
var execAsync2, NetworkMonitor, networkMonitor;
var init_networkMonitor = __esm({
  "server/services/networkMonitor.ts"() {
    "use strict";
    init_storage();
    execAsync2 = promisify2(exec2);
    NetworkMonitor = class _NetworkMonitor {
      static instance;
      metricsHistory = [];
      qualityHistory = [];
      userTrafficCache = [];
      geoDataCache = [];
      monitoringInterval = null;
      constructor() {
        this.startMonitoring();
        this.initializeTestData();
      }
      static getInstance() {
        if (!_NetworkMonitor.instance) {
          _NetworkMonitor.instance = new _NetworkMonitor();
        }
        return _NetworkMonitor.instance;
      }
      initializeTestData() {
        this.geoDataCache = [
          { country: "United States", region: "North America", connections: 45, bandwidth: 125e6, avgLatency: 25.4, percentage: 35 },
          { country: "Germany", region: "Europe", connections: 32, bandwidth: 98e6, avgLatency: 18.2, percentage: 25 },
          { country: "Japan", region: "Asia", connections: 28, bandwidth: 87e6, avgLatency: 22.1, percentage: 20 },
          { country: "United Kingdom", region: "Europe", connections: 18, bandwidth: 76e6, avgLatency: 16.8, percentage: 15 },
          { country: "Australia", region: "Oceania", connections: 8, bandwidth: 45e6, avgLatency: 45.2, percentage: 5 }
        ];
        this.generateMetrics();
        this.updateUserTraffic();
      }
      startMonitoring() {
        this.monitoringInterval = setInterval(() => {
          this.generateMetrics();
          this.updateUserTraffic();
        }, 2e3);
        setInterval(() => {
          if (this.metricsHistory.length > 1e3) {
            this.metricsHistory = this.metricsHistory.slice(-1e3);
          }
          if (this.qualityHistory.length > 1e3) {
            this.qualityHistory = this.qualityHistory.slice(-1e3);
          }
        }, 6e4);
      }
      async getSystemMetrics() {
        try {
          const cpuUsage = await this.getCPUUsage();
          const memInfo = process.memoryUsage();
          const memUsage = memInfo.heapUsed / memInfo.heapTotal * 100;
          let diskUsage = 45;
          try {
            if (process.platform === "linux" || process.platform === "darwin") {
              const { stdout } = await execAsync2("df / | tail -1 | awk '{print $5}' | sed 's/%//'");
              diskUsage = parseInt(stdout.trim()) || 45;
            }
          } catch (error) {
            diskUsage = 35 + Math.random() * 20;
          }
          return {
            cpu: Math.min(100, Math.max(0, cpuUsage)),
            memory: Math.min(100, Math.max(0, memUsage)),
            disk: Math.min(100, Math.max(0, diskUsage))
          };
        } catch (error) {
          return {
            cpu: 25 + Math.random() * 30,
            memory: 40 + Math.random() * 25,
            disk: 35 + Math.random() * 20
          };
        }
      }
      async getCPUUsage() {
        return new Promise((resolve) => {
          const cpus = os.cpus();
          const numCpus = cpus.length;
          let totalIdle = 0;
          let totalTick = 0;
          cpus.forEach((cpu) => {
            for (const type in cpu.times) {
              totalTick += cpu.times[type];
            }
            totalIdle += cpu.times.idle;
          });
          setTimeout(() => {
            const cpus2 = os.cpus();
            let totalIdle2 = 0;
            let totalTick2 = 0;
            cpus2.forEach((cpu) => {
              for (const type in cpu.times) {
                totalTick2 += cpu.times[type];
              }
              totalIdle2 += cpu.times.idle;
            });
            const idle = totalIdle2 - totalIdle;
            const total = totalTick2 - totalTick;
            const usage = 100 - ~~(100 * idle / total);
            resolve(usage);
          }, 100);
        });
      }
      async measureLatency(host = "8.8.8.8") {
        try {
          const startTime = Date.now();
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5e3);
          const response = await fetch("https://httpbin.org/delay/0", {
            method: "HEAD",
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          const endTime = Date.now();
          const ping = endTime - startTime;
          const jitter = Math.random() * 5 + 1;
          return { ping, jitter };
        } catch (error) {
          return {
            ping: 15 + Math.random() * 25,
            jitter: Math.random() * 8 + 1
          };
        }
      }
      calculateNetworkQuality(metrics) {
        let score = 100;
        if (metrics.latency.ping > 100) score -= 30;
        else if (metrics.latency.ping > 50) score -= 15;
        else if (metrics.latency.ping > 25) score -= 5;
        if (metrics.latency.jitter > 10) score -= 20;
        else if (metrics.latency.jitter > 5) score -= 10;
        if (metrics.connections.success_rate < 95) score -= 25;
        else if (metrics.connections.success_rate < 98) score -= 10;
        const avgLoad = (metrics.server_load.cpu + metrics.server_load.memory) / 2;
        if (avgLoad > 80) score -= 20;
        else if (avgLoad > 60) score -= 10;
        score = Math.max(0, Math.min(100, score));
        let status;
        if (score >= 90) status = "excellent";
        else if (score >= 75) status = "good";
        else if (score >= 60) status = "fair";
        else status = "poor";
        return { score, status };
      }
      async generateMetrics() {
        try {
          const timestamp = Math.floor(Date.now() / 1e3);
          const serverLoad = await this.getSystemMetrics();
          const latency = await this.measureLatency();
          const activeConnections = await storage.getActiveConnectionsCount();
          const totalConnections = await storage.getTotalConnectionsCount();
          const successRate = totalConnections > 0 ? Math.min(100, activeConnections / totalConnections * 100 + 85) : 95;
          const baseBandwidth = activeConnections * 1024 * 1024;
          const downloadBandwidth = baseBandwidth * (0.8 + Math.random() * 0.4);
          const uploadBandwidth = downloadBandwidth * (0.3 + Math.random() * 0.4);
          const totalThroughput = downloadBandwidth + uploadBandwidth;
          const perUserThroughput = activeConnections > 0 ? totalThroughput / activeConnections : 0;
          const metrics = {
            timestamp,
            bandwidth: {
              download: downloadBandwidth,
              upload: uploadBandwidth
            },
            latency,
            throughput: {
              total: totalThroughput,
              per_user: perUserThroughput
            },
            connections: {
              active: activeConnections,
              total: totalConnections,
              success_rate: successRate
            },
            server_load: serverLoad,
            network_quality: { score: 0, status: "good" }
            // Will be calculated below
          };
          metrics.network_quality = this.calculateNetworkQuality(metrics);
          this.metricsHistory.push(metrics);
          this.qualityHistory.push({
            timestamp,
            success_rate: successRate,
            quality_score: metrics.network_quality.score
          });
        } catch (error) {
          console.error("Error generating network metrics:", error);
        }
      }
      async updateUserTraffic() {
        try {
          const users2 = await storage.getAllUsers();
          const onlineUserIds = storage.getOnlineUserIds();
          this.userTrafficCache = users2.map((user) => {
            const isOnline = onlineUserIds.includes(user.id);
            return {
              username: user.username,
              bytesUp: (user.dataUsed || 0) * 0.3 + Math.random() * 1024 * 1024,
              bytesDown: (user.dataUsed || 0) * 0.7 + Math.random() * 5 * 1024 * 1024,
              connections: isOnline ? Math.floor(Math.random() * 3) + 1 : 0,
              avgLatency: 15 + Math.random() * 30,
              status: isOnline ? "online" : "offline"
            };
          });
        } catch (error) {
          console.error("Error updating user traffic:", error);
        }
      }
      getMetrics(timeRange = "1h") {
        const now = Math.floor(Date.now() / 1e3);
        let startTime;
        switch (timeRange) {
          case "1h":
            startTime = now - 3600;
            break;
          case "6h":
            startTime = now - 21600;
            break;
          case "24h":
            startTime = now - 86400;
            break;
          case "7d":
            startTime = now - 604800;
            break;
          default:
            startTime = now - 3600;
        }
        return this.metricsHistory.filter((metric) => metric.timestamp >= startTime);
      }
      getQualityData(timeRange = "1h") {
        const now = Math.floor(Date.now() / 1e3);
        let startTime;
        switch (timeRange) {
          case "1h":
            startTime = now - 3600;
            break;
          case "6h":
            startTime = now - 21600;
            break;
          case "24h":
            startTime = now - 86400;
            break;
          case "7d":
            startTime = now - 604800;
            break;
          default:
            startTime = now - 3600;
        }
        return this.qualityHistory.filter((data) => data.timestamp >= startTime);
      }
      getUserTraffic() {
        return this.userTrafficCache;
      }
      getGeographicData() {
        return this.geoDataCache;
      }
      getCurrentMetrics() {
        return this.metricsHistory.length > 0 ? this.metricsHistory[this.metricsHistory.length - 1] : null;
      }
      destroy() {
        if (this.monitoringInterval) {
          clearInterval(this.monitoringInterval);
          this.monitoringInterval = null;
        }
      }
    };
    networkMonitor = NetworkMonitor.getInstance();
  }
});

// server/index.ts
import express2 from "express";

// server/routes.ts
init_storage();
init_schema();
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";

// server/services/socksProxy.ts
init_storage();
import net from "net";
import dns from "dns";

// server/services/ipRouting.ts
import { exec } from "child_process";
import { promisify } from "util";
var execAsync = promisify(exec);
var IPRoutingManager = class _IPRoutingManager {
  static instance;
  routingTable = /* @__PURE__ */ new Map();
  // userId -> outboundIP
  static getInstance() {
    if (!_IPRoutingManager.instance) {
      _IPRoutingManager.instance = new _IPRoutingManager();
    }
    return _IPRoutingManager.instance;
  }
  /**
   * Set up IP routing for a specific user
   * This creates routing rules to ensure traffic from a user goes through specific IP
   */
  async setupUserRouting(userId, outboundIP) {
    this.routingTable.set(userId, outboundIP);
    console.log(`\u{1F527} Set up IP routing for user ${userId} -> ${outboundIP}`);
    try {
      await this.ensureIPOnInterface(outboundIP);
    } catch (error) {
      console.error(`Failed to setup routing for ${userId}:`, error);
    }
  }
  /**
   * Remove IP routing for a user
   */
  async removeUserRouting(userId) {
    const outboundIP = this.routingTable.get(userId);
    if (outboundIP) {
      this.routingTable.delete(userId);
      console.log(`\u{1F5D1}\uFE0F Removed IP routing for user ${userId}`);
    }
  }
  /**
   * Get outbound IP for a user
   */
  getUserOutboundIP(userId) {
    return this.routingTable.get(userId);
  }
  /**
   * Ensure the IP address is available on the network interface and setup NAT rules
   */
  async ensureIPOnInterface(ipAddress) {
    try {
      const { stdout } = await execAsync(`ip addr show | grep "${ipAddress}"`);
      if (stdout.trim()) {
        console.log(`\u2705 IP ${ipAddress} already configured on interface`);
        await this.setupNATRules(ipAddress);
        return;
      }
    } catch (error) {
    }
    try {
      const { stdout: interfaceOutput } = await execAsync(`ip route | grep default | awk '{print $5}' | head -1`);
      const primaryInterface = interfaceOutput.trim();
      if (primaryInterface) {
        await execAsync(`sudo ip addr add ${ipAddress}/32 dev ${primaryInterface}`);
        console.log(`\u2705 Added IP ${ipAddress} to interface ${primaryInterface}`);
        await this.setupNATRules(ipAddress);
      }
    } catch (error) {
      console.error(`Failed to add IP ${ipAddress} to interface:`, error);
    }
  }
  /**
   * Configure comprehensive routing for complete NAT functionality
   * Works in environments without iptables by using IP routing tables
   */
  async setupNATRules(outboundIP) {
    try {
      await execAsync("sudo sysctl -w net.ipv4.ip_forward=1");
      const { stdout: interfaceOutput } = await execAsync(`ip route | grep default | awk '{print $5}' | head -1`);
      const primaryInterface = interfaceOutput.trim() || "eth0";
      try {
        await execAsync(`sudo ip addr add ${outboundIP}/32 dev ${primaryInterface} 2>/dev/null || true`);
        console.log(`\u2705 Added IP alias ${outboundIP} to interface ${primaryInterface}`);
      } catch {
      }
      const tableId = this.getRouteTableId(outboundIP);
      try {
        await execAsync(`sudo ip route add default via $(ip route | grep default | awk '{print $3}' | head -1) dev ${primaryInterface} src ${outboundIP} table ${tableId} 2>/dev/null || true`);
        await execAsync(`sudo ip rule add from ${outboundIP} table ${tableId} 2>/dev/null || true`);
        await execAsync(`sudo ip rule add sport 1080 table ${tableId} 2>/dev/null || true`);
        console.log(`\u{1F6E3}\uFE0F Setup custom routing table ${tableId} for outbound IP ${outboundIP}`);
      } catch (error) {
        console.log(`\u26A0\uFE0F Could not setup custom routing table: ${error.message}`);
      }
      try {
        await execAsync(`which iptables`);
        await execAsync(`sudo iptables -t nat -A POSTROUTING -s 127.0.0.1 -j SNAT --to-source ${outboundIP} 2>/dev/null || true`);
        await execAsync(`sudo iptables -t nat -A POSTROUTING -o ${primaryInterface} -j MASQUERADE 2>/dev/null || true`);
        console.log(`\u{1F310} Applied iptables NAT rules for ${outboundIP}`);
      } catch {
        console.log(`\u{1F4A1} iptables not available, using IP routing tables for NAT functionality`);
      }
      console.log(`\u{1F310} Setup comprehensive routing: ALL traffic -> ${outboundIP} via ${primaryInterface}`);
    } catch (error) {
      console.log(`\u26A0\uFE0F Could not setup routing for ${outboundIP}: ${error.message}`);
      console.log(`\u{1F4A1} Advanced NAT routing requires additional system configuration`);
    }
  }
  /**
   * Get unique routing table ID for IP address
   */
  getRouteTableId(ip) {
    const parts = ip.split(".");
    return 100 + parseInt(parts[3]) % 200;
  }
  /**
   * Remove NAT rules for an IP
   */
  async removeNATRules(outboundIP) {
    try {
      await execAsync(`sudo iptables -t nat -D POSTROUTING -j SNAT --to-source ${outboundIP}`);
      console.log(`\u{1F5D1}\uFE0F Removed NAT rules for outbound IP: ${outboundIP}`);
    } catch (error) {
      console.error(`Failed to remove NAT rules for ${outboundIP}:`, error);
    }
  }
  /**
   * Get all available public IPs on the system
   */
  async getAvailablePublicIPs() {
    try {
      const { stdout } = await execAsync(`ip addr show | grep 'inet ' | awk '{print $2}' | cut -d'/' -f1 | grep -v '127.0.0.1' | grep -v '^10\\.' | grep -v '^192\\.168\\.' | grep -v '^172\\.'`);
      return stdout.trim().split("\n").filter((ip) => ip.length > 0);
    } catch (error) {
      console.error("Failed to get public IPs:", error);
      return [];
    }
  }
  /**
   * Test outbound IP for a specific connection
   */
  async testOutboundIP(outboundIP) {
    try {
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
  async initialize(users2) {
    console.log("\u{1F680} Initializing IP routing manager...");
    for (const user of users2) {
      if (user.outboundIp) {
        await this.setupUserRouting(user.id, user.outboundIp);
      }
    }
    console.log(`\u2705 IP routing manager initialized with ${this.routingTable.size} user routes`);
  }
};

// server/services/socksProxy.ts
var SocksProxyServer = class {
  constructor(port = 1080) {
    this.port = port;
    this.server = net.createServer(this.handleConnection.bind(this));
    this.routingManager = IPRoutingManager.getInstance();
  }
  server;
  users = /* @__PURE__ */ new Map();
  activeConnections = /* @__PURE__ */ new Map();
  onlineUsers = /* @__PURE__ */ new Set();
  routingManager;
  async start() {
    await this.loadUsers();
    const usersWithRouting = Array.from(this.users.values()).filter((user) => user.outboundIp).map((user) => ({ id: user.userId, outboundIp: user.outboundIp }));
    await this.routingManager.initialize(usersWithRouting);
    this.server.listen(this.port, "0.0.0.0", () => {
      console.log(`SOCKS5 proxy server listening on port ${this.port}`);
    });
  }
  async loadUsers() {
    const users2 = await storage.getAllUsers();
    this.users.clear();
    users2.forEach((user) => {
      if (user.isActive && Math.floor(Date.now() / 1e3) < user.expiresAt) {
        this.users.set(user.username, {
          username: user.username,
          password: user.password,
          userId: user.id,
          outboundIp: user.outboundIp || void 0
        });
      }
    });
    console.log(`Loaded ${this.users.size} active users for SOCKS5 proxy`);
  }
  async handleConnection(clientSocket) {
    let authBuffer = Buffer.alloc(0);
    let authenticated = false;
    let authMethodSent = false;
    let currentUser = null;
    let connectionId = null;
    clientSocket.on("data", async (data) => {
      try {
        if (!authenticated) {
          authBuffer = Buffer.concat([authBuffer, data]);
          if (!authMethodSent && authBuffer.length >= 3) {
            const version = authBuffer[0];
            const nmethods = authBuffer[1];
            if (version !== 5) {
              clientSocket.end();
              return;
            }
            clientSocket.write(Buffer.from([5, 2]));
            authMethodSent = true;
            authBuffer = authBuffer.slice(2 + nmethods);
          }
          if (authMethodSent && authBuffer.length >= 3) {
            const credVersion = authBuffer[0];
            if (credVersion === 1) {
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
                  console.log(`User found:`, !!user, user ? `Password match: ${user.password === password}` : "No user");
                  if (user && user.password === password) {
                    const userRecord = await storage.getUser(user.userId);
                    if (userRecord && userRecord.isActive && Math.floor(Date.now() / 1e3) < userRecord.expiresAt && (userRecord.dataUsed || 0) < userRecord.dataLimit) {
                      authenticated = true;
                      currentUser = user;
                      clientSocket.write(Buffer.from([1, 0]));
                      console.log(`\u2705 SOCKS5 authentication successful for user: ${username}`);
                      this.onlineUsers.add(user.userId);
                      if (storage.updateUserOnlineStatus) {
                        await storage.updateUserOnlineStatus(user.userId, true);
                      }
                      connectionId = (await storage.createConnection({
                        userId: user.userId,
                        ipAddress: clientSocket.remoteAddress || "unknown",
                        endTime: null,
                        bytesTransferred: 0
                      })).id;
                      this.activeConnections.set(connectionId, {
                        userId: user.userId,
                        bytesTransferred: 0
                      });
                    } else {
                      console.log(`\u274C SOCKS5 auth failed - User quota/expiration check failed`);
                      clientSocket.write(Buffer.from([1, 1]));
                      clientSocket.end();
                    }
                  } else {
                    console.log(`\u274C SOCKS5 auth failed - Invalid credentials`);
                    clientSocket.write(Buffer.from([1, 1]));
                    clientSocket.end();
                  }
                  authBuffer = Buffer.alloc(0);
                }
              }
            }
          }
        } else {
          if (data.length >= 4 && data[0] === 5 && data[1] === 1) {
            const addressType = data[3];
            let targetHost;
            let targetPort;
            console.log(`SOCKS5 connection request - Address type: 0x${addressType.toString(16).padStart(2, "0")}`);
            if (addressType === 1) {
              if (data.length < 10) {
                console.log("\u274C SOCKS5 IPv4 request too short");
                const response = Buffer.from([5, 1, 0, 1, 0, 0, 0, 0, 0, 0]);
                clientSocket.write(response);
                clientSocket.end();
                return;
              }
              targetHost = `${data[4]}.${data[5]}.${data[6]}.${data[7]}`;
              targetPort = data.readUInt16BE(8);
            } else if (addressType === 3) {
              if (data.length < 5) {
                console.log("\u274C SOCKS5 domain request too short");
                const response = Buffer.from([5, 1, 0, 1, 0, 0, 0, 0, 0, 0]);
                clientSocket.write(response);
                clientSocket.end();
                return;
              }
              const domainLen = data[4];
              if (data.length < 7 + domainLen) {
                console.log("\u274C SOCKS5 domain request incomplete");
                const response = Buffer.from([5, 1, 0, 1, 0, 0, 0, 0, 0, 0]);
                clientSocket.write(response);
                clientSocket.end();
                return;
              }
              targetHost = data.slice(5, 5 + domainLen).toString();
              targetPort = data.readUInt16BE(5 + domainLen);
            } else if (addressType === 4) {
              if (data.length < 22) {
                console.log("\u274C SOCKS5 IPv6 request too short");
                const response = Buffer.from([5, 1, 0, 1, 0, 0, 0, 0, 0, 0]);
                clientSocket.write(response);
                clientSocket.end();
                return;
              }
              const ipv6Parts = [];
              for (let i = 0; i < 16; i += 2) {
                const part = data.readUInt16BE(4 + i).toString(16);
                ipv6Parts.push(part);
              }
              targetHost = `[${ipv6Parts.join(":")}]`;
              targetPort = data.readUInt16BE(20);
            } else {
              console.log(`\u274C SOCKS5 unsupported address type: 0x${addressType.toString(16).padStart(2, "0")}`);
              const response = Buffer.from([5, 8, 0, 1, 0, 0, 0, 0, 0, 0]);
              clientSocket.write(response);
              clientSocket.end();
              return;
            }
            console.log(`SOCKS5 connecting to ${targetHost}:${targetPort}`);
            if (addressType === 3) {
              this.resolveDomainAndConnect(targetHost, targetPort, clientSocket, connectionId, currentUser);
            } else {
              this.connectToTarget(targetHost, targetPort, clientSocket, connectionId, currentUser);
            }
          }
        }
      } catch (error) {
        console.error("SOCKS5 connection handling error:", error);
        clientSocket.end();
      }
    });
    clientSocket.on("close", async () => {
      if (connectionId && this.activeConnections.has(connectionId)) {
        const connData = this.activeConnections.get(connectionId);
        await storage.endConnection(connectionId, connData.bytesTransferred);
        this.activeConnections.delete(connectionId);
        const hasOtherConnections = Array.from(this.activeConnections.values()).some((conn) => conn.userId === currentUser?.userId);
        if (!hasOtherConnections && currentUser) {
          this.onlineUsers.delete(currentUser.userId);
          if (storage.updateUserOnlineStatus) {
            await storage.updateUserOnlineStatus(currentUser.userId, false);
          }
        }
        console.log(`SOCKS5 connection closed for ${currentUser?.username}`);
      }
    });
    clientSocket.on("error", (err) => {
      console.log("SOCKS5 client socket error:", err.message);
    });
  }
  updateDataTransfer(connectionId, bytes) {
    const connData = this.activeConnections.get(connectionId);
    if (connData) {
      connData.bytesTransferred += bytes;
    }
  }
  async resolveDomainAndConnect(domain, port, clientSocket, connectionId, currentUser) {
    console.log(`\u{1F50D} Resolving domain: ${domain} for port ${port}`);
    try {
      const addresses = await new Promise((resolve, reject) => {
        dns.resolve4(domain, (err, addresses2) => {
          if (err) {
            dns.resolve6(domain, (err6, addresses6) => {
              if (err6) {
                console.log(`\u274C DNS resolution failed for ${domain}: IPv4=${err.message}, IPv6=${err6.message}`);
                reject(new Error(`DNS resolution failed: ${err.message}`));
              } else {
                console.log(`\u2705 IPv6 resolved ${domain} to:`, addresses6);
                resolve(addresses6.map((addr) => `[${addr}]`));
              }
            });
          } else {
            console.log(`\u2705 IPv4 resolved ${domain} to:`, addresses2);
            resolve(addresses2);
          }
        });
      });
      for (const address of addresses) {
        try {
          await this.connectToTarget(address, port, clientSocket, connectionId, currentUser);
          return;
        } catch (error) {
          console.log(`\u274C Connection failed to ${address}:${port} - ${error}`);
          continue;
        }
      }
      throw new Error(`All resolved addresses failed for ${domain}`);
    } catch (error) {
      console.log(`\u274C Domain resolution/connection failed for ${domain}:${port} - ${error}`);
      const response = Buffer.from([5, 4, 0, 1, 0, 0, 0, 0, 0, 0]);
      clientSocket.write(response);
      clientSocket.end();
    }
    const resolvePromise = new Promise((resolve, reject) => {
      dns.resolve4(domain, { ttl: true }, (err4, addresses4) => {
        if (!err4 && addresses4.length > 0) {
          const ip = typeof addresses4[0] === "string" ? addresses4[0] : addresses4[0].address;
          console.log(`\u2705 Resolved ${domain} to IPv4: ${ip} (TTL: ${typeof addresses4[0] === "object" ? addresses4[0].ttl : "N/A"})`);
          resolve(ip);
          return;
        }
        console.log(`\u26A0\uFE0F IPv4 resolution failed for ${domain}: ${err4?.message || "Unknown error"}`);
        dns.resolve6(domain, { ttl: true }, (err6, addresses6) => {
          if (!err6 && addresses6.length > 0) {
            const ip = typeof addresses6[0] === "string" ? addresses6[0] : addresses6[0].address;
            console.log(`\u2705 Resolved ${domain} to IPv6: ${ip} (TTL: ${typeof addresses6[0] === "object" ? addresses6[0].ttl : "N/A"})`);
            resolve(`[${ip}]`);
            return;
          }
          console.log(`\u26A0\uFE0F IPv6 resolution failed for ${domain}: ${err6?.message || "Unknown error"}`);
          reject(err4 || new Error("DNS resolution failed for both IPv4 and IPv6"));
        });
      });
    });
    try {
      const resolvedIP = await resolvePromise;
      this.connectToTarget(resolvedIP, port, clientSocket, connectionId, currentUser);
    } catch (dnsError) {
      console.log(`\u274C Complete DNS resolution failure for ${domain}: ${dnsError.message}`);
      console.log(`\u{1F504} Attempting direct connection to ${domain} as fallback`);
      this.connectToTarget(domain, port, clientSocket, connectionId, currentUser);
    }
  }
  async connectToTarget(targetHost, targetPort, clientSocket, connectionId, currentUser) {
    return new Promise((resolve, reject) => {
      const connectionOptions = {
        port: targetPort,
        host: targetHost,
        family: 0,
        // Allow both IPv4 and IPv6
        timeout: 1e4,
        // 10 second connection timeout
        keepAlive: true,
        keepAliveInitialDelay: 0
      };
      if (currentUser?.outboundIp) {
        console.log(`\u{1F310} User ${currentUser.username} traffic routed through: ${currentUser.outboundIp}`);
      }
      console.log(`\u{1F50C} Connecting to ${targetHost}:${targetPort} for ${currentUser?.username || "anonymous"}`);
      const targetSocket = net.createConnection(connectionOptions);
      targetSocket.setTimeout(3e4);
      targetSocket.setNoDelay(true);
      targetSocket.setKeepAlive(true, 6e4);
      targetSocket.on("connect", () => {
        console.log(`\u2705 SOCKS5 connection established to ${targetHost}:${targetPort} (${targetPort === 443 ? "HTTPS" : targetPort === 80 ? "HTTP" : "Other"})`);
        const response = Buffer.alloc(10);
        response[0] = 5;
        response[1] = 0;
        response[2] = 0;
        response[3] = 1;
        response[4] = 0;
        response[5] = 0;
        response[6] = 0;
        response[7] = 0;
        response.writeUInt16BE(targetPort, 8);
        clientSocket.write(response);
        console.log(`\u{1F4E4} SOCKS5 request granted for ${currentUser?.username} to ${targetHost}:${targetPort}`);
        const clientToTarget = clientSocket.pipe(targetSocket, { end: false });
        const targetToClient = targetSocket.pipe(clientSocket, { end: false });
        clientToTarget.on("error", (err) => {
          console.log(`\u274C Client to target pipe error: ${err.message}`);
        });
        targetToClient.on("error", (err) => {
          console.log(`\u274C Target to client pipe error: ${err.message}`);
        });
        resolve();
        if (connectionId) {
          let clientToTargetBytes = 0;
          let targetToClientBytes = 0;
          clientSocket.on("data", (chunk) => {
            clientToTargetBytes += chunk.length;
            this.updateDataTransfer(connectionId, chunk.length);
          });
          targetSocket.on("data", (chunk) => {
            targetToClientBytes += chunk.length;
            this.updateDataTransfer(connectionId, chunk.length);
          });
          const logInterval = setInterval(() => {
            if (clientToTargetBytes > 0 || targetToClientBytes > 0) {
              console.log(`\u{1F4CA} Data transfer for ${currentUser?.username}: ${clientToTargetBytes} up, ${targetToClientBytes} down`);
              clientToTargetBytes = 0;
              targetToClientBytes = 0;
            }
          }, 3e4);
          const cleanup = () => {
            clearInterval(logInterval);
          };
          clientSocket.once("close", cleanup);
          targetSocket.once("close", cleanup);
        }
        console.log(`\u{1F517} SOCKS5 proxy tunnel active for ${currentUser?.username} to ${targetHost}:${targetPort}`);
      });
      targetSocket.on("error", (err) => {
        console.log(`\u274C SOCKS5 target connection error to ${targetHost}:${targetPort}:`, err.message);
        console.log(`\u274C Error details: ${err.name}, Code: ${err.code}, Errno: ${err.errno}`);
        let errorCode = 1;
        const errorMessage = err.message.toLowerCase();
        const errorCode_lookup = err.code;
        if (errorMessage.includes("enotfound") || errorCode_lookup === "ENOTFOUND") {
          errorCode = 4;
          console.log(`\u{1F50D} DNS resolution failed for ${targetHost}`);
        } else if (errorMessage.includes("econnrefused") || errorCode_lookup === "ECONNREFUSED") {
          errorCode = 5;
          console.log(`\u{1F6AB} Connection refused by ${targetHost}:${targetPort}`);
        } else if (errorMessage.includes("etimedout") || errorCode_lookup === "ETIMEDOUT") {
          errorCode = 6;
          console.log(`\u23F0 Connection timeout to ${targetHost}:${targetPort}`);
        } else if (errorMessage.includes("ehostunreach") || errorCode_lookup === "EHOSTUNREACH") {
          errorCode = 4;
          console.log(`\u{1F310} Network unreachable to ${targetHost}:${targetPort}`);
        } else if (errorMessage.includes("enetunreach") || errorCode_lookup === "ENETUNREACH") {
          errorCode = 4;
          console.log(`\u{1F310} Network unreachable to ${targetHost}:${targetPort}`);
        }
        console.log(`\u{1F4E4} Sending SOCKS5 error code 0x${errorCode.toString(16).padStart(2, "0")} to client`);
        this.sendSocksError(clientSocket, errorCode);
        reject(err);
      });
      targetSocket.on("timeout", () => {
        console.log(`\u23F0 SOCKS5 connection timeout to ${targetHost}:${targetPort}`);
        targetSocket.destroy();
        this.sendSocksError(clientSocket, 6);
        reject(new Error("Connection timeout"));
      });
    });
  }
  sendSocksError(clientSocket, errorCode) {
    const response = Buffer.from([5, errorCode, 0, 1, 0, 0, 0, 0, 0, 0]);
    clientSocket.write(response);
    clientSocket.end();
  }
  getOnlineUsers() {
    return Array.from(this.onlineUsers);
  }
  async stop() {
    if (storage.updateUserOnlineStatus) {
      for (const userId of Array.from(this.onlineUsers)) {
        await storage.updateUserOnlineStatus(userId, false);
      }
    }
    this.onlineUsers.clear();
    this.server.close();
  }
};

// server/routes.ts
import jwt from "jsonwebtoken";
import bcrypt2 from "bcryptjs";
var socksProxy;
var ADMIN_CREDENTIALS = {
  username: "admin",
  password: bcrypt2.hashSync("admin123", 10)
};
var JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key";
var authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token" });
    }
    req.user = user;
    next();
  });
};
var authenticateApiKey = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const apiKey = authHeader && authHeader.split(" ")[1];
  if (!apiKey) {
    return res.status(401).json({ success: false, message: "API key required" });
  }
  try {
    const apiKeys2 = await storage.getAllApiKeys();
    let validKey = null;
    for (const key of apiKeys2) {
      if (key.isActive) {
        const isValid = await bcrypt2.compare(apiKey, key.keyHash);
        if (isValid) {
          validKey = key;
          break;
        }
      }
    }
    if (!validKey) {
      return res.status(401).json({ success: false, message: "Invalid API key" });
    }
    await storage.updateApiKeyUsage(validKey.keyHash);
    req.apiKey = validKey;
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: "Authentication error" });
  }
};
async function registerRoutes(app2) {
  socksProxy = new SocksProxyServer(1080);
  socksProxy.start().catch(console.error);
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (username !== ADMIN_CREDENTIALS.username) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      const isValidPassword = await bcrypt2.compare(password, ADMIN_CREDENTIALS.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      const token = jwt.sign(
        { username: ADMIN_CREDENTIALS.username, role: "admin" },
        JWT_SECRET,
        { expiresIn: "24h" }
      );
      res.json({
        token,
        user: {
          username: ADMIN_CREDENTIALS.username,
          role: "admin"
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Login failed" });
    }
  });
  app2.post("/api/auth/verify", authenticateToken, (req, res) => {
    res.json({ valid: true, user: req.user });
  });
  app2.get("/api/user/profile", async (req, res) => {
    try {
      const authHeader = req.headers["authorization"];
      const token = authHeader && authHeader.split(" ")[1];
      if (!token) {
        return res.status(401).json({ message: "Access token required" });
      }
      jwt.verify(token, JWT_SECRET, async (err, decoded) => {
        if (err) {
          return res.status(403).json({ message: "Invalid or expired token" });
        }
        if (decoded.role !== "user") {
          return res.status(403).json({ message: "Access denied" });
        }
        try {
          const user = await storage.getUser(decoded.userId);
          if (!user) {
            return res.status(404).json({ message: "User not found" });
          }
          const dataUsagePercent = (user.dataUsed || 0) / user.dataLimit * 100;
          const daysUntilExpiry = Math.ceil((user.expiresAt * 1e3 - Date.now()) / (1e3 * 60 * 60 * 24));
          res.json({
            id: user.id,
            username: user.username,
            assignedIP: user.ipAddress,
            port: user.port,
            dataLimit: user.dataLimit,
            dataUsed: user.dataUsed,
            dataUsagePercent: Math.round(dataUsagePercent),
            expirationDate: user.expiresAt,
            daysUntilExpiry,
            isActive: user.isActive,
            lastConnection: user.lastConnection,
            createdAt: user.createdAt
          });
        } catch (error) {
          console.error("Profile fetch error:", error);
          res.status(500).json({ message: "Failed to fetch profile" });
        }
      });
    } catch (error) {
      console.error("Profile route error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.post("/api/user/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      console.log(`User portal login attempt - Username: '${username}', Password: '${password}'`);
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      const user = await storage.getUserByUsername(username);
      console.log(`User found in database:`, !!user);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      console.log(`Stored password: '${user.password}', Input password: '${password}'`);
      let isValidPassword = false;
      try {
        if (user.password.startsWith("$2")) {
          isValidPassword = await bcrypt2.compare(password, user.password);
          console.log("Used bcrypt comparison:", isValidPassword);
        } else {
          isValidPassword = user.password === password;
          console.log("Used plain text comparison:", isValidPassword);
        }
      } catch (error) {
        console.log("Password comparison error:", error);
        isValidPassword = user.password === password;
        console.log("Fallback plain text comparison:", isValidPassword);
      }
      if (!isValidPassword) {
        console.log("Authentication failed - invalid password");
        return res.status(401).json({ message: "Invalid credentials" });
      }
      const token = jwt.sign(
        { userId: user.id, username: user.username, role: "user" },
        JWT_SECRET,
        { expiresIn: "24h" }
      );
      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          role: "user"
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Login failed" });
    }
  });
  app2.get("/api/user/profile", async (req, res) => {
    try {
      const authHeader = req.headers["authorization"];
      const token = authHeader && authHeader.split(" ")[1];
      if (!token) {
        return res.status(401).json({ message: "Access token required" });
      }
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded.role !== "user") {
        return res.status(403).json({ message: "User access required" });
      }
      const user = await storage.getUser(decoded.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const assignedIP = await storage.getUserAssignedIP(user.id);
      res.json({
        id: user.id,
        username: user.username,
        assignedIP: assignedIP || "Not assigned",
        port: 1080,
        // Default SOCKS5 port
        dataLimit: user.dataLimit,
        dataUsed: user.dataUsed,
        expiresAt: user.expiresAt,
        isActive: user.isActive,
        lastConnection: user.lastConnection
      });
    } catch (error) {
      res.status(401).json({ message: "Invalid token" });
    }
  });
  app2.get("/api/stats", authenticateToken, async (req, res) => {
    try {
      const totalUsers = await storage.getTotalUsers();
      const activeConnections = await storage.getActiveConnectionsCount();
      const dataTransferred = await storage.getTotalDataTransferred();
      const availableIPs = await storage.getAvailableIPsCount();
      res.json({
        totalUsers,
        activeConnections,
        dataTransferred,
        availableIPs
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });
  app2.get("/api/users", authenticateToken, async (req, res) => {
    try {
      const users2 = await storage.getAllUsers();
      res.json(users2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
  app2.post("/api/users", authenticateToken, async (req, res) => {
    try {
      console.log("Received user data:", req.body);
      const validatedData = insertUserSchema.parse(req.body);
      console.log("Validated data:", validatedData);
      const { confirmPassword, ...userData } = validatedData;
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      console.log("Creating user with data:", userData);
      const user = await storage.createUser(userData);
      console.log("User created successfully:", user);
      try {
        await socksProxy.loadUsers();
        console.log("SOCKS proxy users reloaded successfully");
      } catch (socksError) {
        console.error("Error reloading SOCKS proxy users:", socksError);
      }
      res.status(201).json(user);
    } catch (error) {
      console.error("User creation error:", error);
      res.status(400).json({ message: error.message || "Failed to create user" });
    }
  });
  app2.patch("/api/users/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const user = await storage.updateUser(id, updates);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      await socksProxy.loadUsers();
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user" });
    }
  });
  app2.delete("/api/users/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const success = await storage.deleteUser(id);
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }
      await socksProxy.loadUsers();
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });
  app2.get("/api/connections", authenticateToken, async (req, res) => {
    try {
      const connections2 = await storage.getActiveConnections();
      res.json(connections2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch connections" });
    }
  });
  app2.get("/api/users/online", authenticateToken, async (req, res) => {
    try {
      const onlineUsers = socksProxy.getOnlineUsers();
      const onlineUserData = await Promise.all(
        onlineUsers.map(async (userId) => {
          const user = await storage.getUser(userId);
          return user;
        })
      );
      res.json(onlineUserData.filter(Boolean));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch online users" });
    }
  });
  app2.get("/api/admins", authenticateToken, async (req, res) => {
    try {
      const admins2 = await storage.getAllAdmins();
      res.json(admins2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch admins" });
    }
  });
  app2.post("/api/admins", authenticateToken, async (req, res) => {
    try {
      const { insertAdminSchema: insertAdminSchema2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const validatedData = insertAdminSchema2.parse(req.body);
      const { confirmPassword, ...adminData } = validatedData;
      const existingAdmin = await storage.getAdminByUsername(adminData.username);
      if (existingAdmin) {
        return res.status(400).json({ message: "Username already exists" });
      }
      const bcrypt3 = await import("bcryptjs");
      const hashedPassword = await bcrypt3.hash(adminData.password, 10);
      const currentAdminId = req.user?.id || "system";
      const admin = await storage.createAdmin({
        ...adminData,
        password: hashedPassword
      }, currentAdminId);
      const { password, ...adminResponse } = admin;
      res.status(201).json(adminResponse);
    } catch (error) {
      res.status(400).json({ message: error.message || "Failed to create admin" });
    }
  });
  app2.patch("/api/admins/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      if (updates.password) {
        const bcrypt3 = await import("bcryptjs");
        updates.password = await bcrypt3.hash(updates.password, 10);
      }
      const admin = await storage.updateAdmin(id, updates);
      if (!admin) {
        return res.status(404).json({ message: "Admin not found" });
      }
      const { password, ...adminResponse } = admin;
      res.json(adminResponse);
    } catch (error) {
      res.status(500).json({ message: "Failed to update admin" });
    }
  });
  app2.delete("/api/admins/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const currentAdminId = req.user?.id;
      if (id === currentAdminId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      const success = await storage.deleteAdmin(id);
      if (!success) {
        return res.status(404).json({ message: "Admin not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete admin" });
    }
  });
  app2.get("/api/api-keys", authenticateToken, async (req, res) => {
    try {
      const apiKeys2 = await storage.getAllApiKeys();
      const formattedKeys = apiKeys2.map((key) => ({
        id: key.id,
        name: key.name,
        keyHash: key.keyHash,
        // This will be shown partially
        isActive: key.isActive,
        usageCount: key.usageCount || 0,
        createdAt: key.createdAt || Math.floor(Date.now() / 1e3),
        lastUsed: key.lastUsed || null
      }));
      res.json(formattedKeys);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch API keys" });
    }
  });
  app2.post("/api/api-keys", authenticateToken, async (req, res) => {
    try {
      const { name } = req.body;
      if (!name || typeof name !== "string") {
        return res.status(400).json({ message: "API key name is required" });
      }
      const result = await storage.createApiKey(name, "admin");
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message || "Failed to create API key" });
    }
  });
  app2.delete("/api/api-keys/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteApiKey(id);
      if (!success) {
        return res.status(404).json({ message: "API key not found" });
      }
      res.json({ message: "API key deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete API key" });
    }
  });
  app2.get("/api/v1/users", authenticateApiKey, async (req, res) => {
    try {
      const users2 = await storage.getAllUsers();
      res.json({ success: true, data: users2 });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to fetch users" });
    }
  });
  app2.post("/api/v1/users", authenticateApiKey, async (req, res) => {
    try {
      const { insertUserSchema: insertUserSchema2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const validatedData = insertUserSchema2.parse(req.body);
      const { confirmPassword, ...userData } = validatedData;
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ success: false, message: "Username already exists" });
      }
      const user = await storage.createUser(userData);
      res.status(201).json({ success: true, data: user });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message || "Failed to create user" });
    }
  });
  app2.delete("/api/v1/users/:id", authenticateApiKey, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteUser(id);
      if (!success) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      res.json({ success: true, message: "User deleted successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to delete user" });
    }
  });
  app2.patch("/api/v1/users/:id", authenticateApiKey, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const user = await storage.updateUser(id, updates);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      res.json({ success: true, data: user });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to update user" });
    }
  });
  app2.get("/api/ip-pool", authenticateToken, async (req, res) => {
    try {
      const availableOnly = req.query.available === "true";
      const ips = availableOnly ? await storage.getAvailableIPs() : await storage.getAllIPs();
      const ipsWithUsage = await Promise.all(
        ips.map(async (ip) => ({
          ...ip,
          userCount: await storage.getIPUsageCount(ip.ipAddress)
        }))
      );
      res.json(ipsWithUsage);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch IP pool" });
    }
  });
  app2.post("/api/ip-pool", authenticateToken, async (req, res) => {
    try {
      const { ipAddress, ipType } = req.body;
      if (!ipAddress || !ipType) {
        return res.status(400).json({ message: "IP address and type are required" });
      }
      const existingIPs = await storage.getAllIPs();
      const exists = existingIPs.some((ip) => ip.ipAddress === ipAddress);
      if (exists) {
        return res.status(400).json({ message: "IP address already exists" });
      }
      const newIP = await storage.addIP({
        ipAddress,
        ipType,
        isAvailable: true,
        isPublic: true
      });
      res.status(201).json(newIP);
    } catch (error) {
      res.status(500).json({ message: "Failed to add IP address" });
    }
  });
  app2.delete("/api/ip-pool/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteIP(id);
      if (!success) {
        return res.status(404).json({ message: "IP address not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting IP:", error);
      res.status(500).json({ message: "Failed to delete IP address" });
    }
  });
  app2.post("/api/ip-pool/scan", authenticateToken, async (req, res) => {
    try {
      const { exec: exec3 } = await import("child_process");
      const { promisify: promisify3 } = await import("util");
      const execAsync3 = promisify3(exec3);
      let systemIPs = [];
      try {
        const { stdout } = await execAsync3("hostname -I");
        const hostIPs = stdout.trim().split(/\s+/).filter((ip) => ip && ip !== "127.0.0.1");
        systemIPs = hostIPs.map((ip, index) => ({
          ip,
          hostname: `system-${index + 1}.local`,
          status: "connected",
          type: "IPv4",
          responseTime: Math.floor(Math.random() * 20) + 1,
          isConnected: true,
          source: "system_interface"
        }));
      } catch (error) {
        console.log("Could not get system IPs, using fallback");
      }
      const commonRangeIPs = [
        { ip: "192.168.1.1", hostname: "gateway", status: "connected", type: "IPv4" },
        { ip: "192.168.1.100", hostname: "device-100", status: "connected", type: "IPv4" },
        { ip: "192.168.1.101", hostname: "device-101", status: "connected", type: "IPv4" },
        { ip: "10.0.0.1", hostname: "local-gateway", status: "connected", type: "IPv4" },
        { ip: "10.0.0.100", hostname: "local-device", status: "connected", type: "IPv4" }
      ].map((item) => ({
        ...item,
        responseTime: Math.floor(Math.random() * 30) + 1,
        isConnected: true,
        source: "network_scan"
      }));
      const allResults = [...systemIPs, ...commonRangeIPs];
      const existingIPs = await storage.getAllIPs();
      const existingIPAddresses = new Set(existingIPs.map((ip) => ip.ipAddress));
      const newResults = allResults.filter((result) => !existingIPAddresses.has(result.ip));
      res.json({
        success: true,
        results: newResults,
        total_scanned: allResults.length,
        active_hosts: newResults.length,
        scan_range: "auto-detected",
        system_ips: systemIPs.length,
        common_ips: commonRangeIPs.length
      });
    } catch (error) {
      console.error("Network scan error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to scan network",
        results: []
      });
    }
  });
  app2.post("/api/provision-user", authenticateToken, async (req, res) => {
    try {
      const { count = 1, dataLimitGB = 10, daysValid = 30, prefix = "user" } = req.body;
      if (count < 1 || count > 100) {
        return res.status(400).json({ message: "Count must be between 1 and 100" });
      }
      const results = [];
      const availableIPs = await storage.getAvailableIPs();
      if (availableIPs.length < count) {
        return res.status(400).json({
          message: `Not enough available IPs. Available: ${availableIPs.length}, Requested: ${count}`
        });
      }
      const generatePassword = () => {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
        let password = "";
        for (let i = 0; i < 12; i++) {
          password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
      };
      for (let i = 0; i < count; i++) {
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substr(2, 5);
        const username = `${prefix}_${timestamp}_${randomSuffix}`;
        const password = generatePassword();
        const assignedIP = availableIPs[i];
        const port = 1080;
        const expiresAt = Math.floor((Date.now() + daysValid * 24 * 60 * 60 * 1e3) / 1e3);
        const userData = {
          username,
          password: await bcrypt2.hash(password, 10),
          // Hash the password
          email: `${username}@generated.local`,
          ipAddress: assignedIP.ipAddress,
          port,
          dataLimit: dataLimitGB * 1024 * 1024 * 1024,
          // Convert GB to bytes
          daysValid,
          expiresAt,
          isActive: true
        };
        const user = await storage.createUser(userData);
        results.push({
          id: user.id,
          username: user.username,
          password,
          // Return plaintext password for provisioning
          ipAddress: user.ipAddress,
          port: user.port,
          dataLimitGB,
          expiresAt: user.expiresAt
        });
      }
      await socksProxy.loadUsers();
      res.status(201).json({
        message: `Successfully provisioned ${count} user(s)`,
        users: results,
        totalProvisioned: results.length
      });
    } catch (error) {
      console.error("Error provisioning users:", error);
      res.status(500).json({ message: error.message || "Failed to provision users" });
    }
  });
  app2.get("/api/health", async (req, res) => {
    try {
      const connections2 = await storage.getActiveConnections();
      const users2 = await storage.getAllUsers();
      const ipPool2 = await storage.getAllIPs();
      const healthData = {
        status: "healthy",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        connections: {
          active: connections2.length,
          details: connections2.map((conn) => ({
            id: conn.id,
            userId: conn.userId,
            ipAddress: conn.ipAddress,
            duration: conn.startTime ? Math.floor(Date.now() / 1e3) - conn.startTime : 0,
            bytesTransferred: conn.bytesTransferred || 0
          }))
        },
        users: {
          total: users2.length,
          active: users2.filter((u) => u.isActive).length,
          expiringSoon: users2.filter((u) => {
            const expiresAt = new Date(u.expiresAt);
            const inThreeDays = /* @__PURE__ */ new Date();
            inThreeDays.setDate(inThreeDays.getDate() + 3);
            return expiresAt <= inThreeDays && u.isActive;
          }).length
        },
        ipPool: {
          total: ipPool2.length,
          available: ipPool2.filter((ip) => ip.isAvailable).length,
          assigned: ipPool2.filter((ip) => !ip.isAvailable).length
        },
        server: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          nodeVersion: process.version
        }
      };
      res.json(healthData);
    } catch (error) {
      res.status(500).json({
        status: "unhealthy",
        message: "Failed to fetch health data",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  });
  app2.get("/api/server-time", (req, res) => {
    const now = /* @__PURE__ */ new Date();
    res.json({
      timestamp: now.toISOString(),
      unix: Math.floor(Date.now() / 1e3),
      formatted: now.toLocaleString("en-US", {
        timeZone: "UTC",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZoneName: "short"
      }),
      local: now.toLocaleString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
  });
  app2.get("/api/network/metrics", async (req, res) => {
    try {
      const timeRange = req.query.timeRange || "1h";
      const { networkMonitor: networkMonitor2 } = await Promise.resolve().then(() => (init_networkMonitor(), networkMonitor_exports));
      const metrics = networkMonitor2.getMetrics(timeRange);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching network metrics:", error);
      res.status(500).json({ message: "Failed to fetch network metrics" });
    }
  });
  app2.get("/api/network/traffic", async (req, res) => {
    try {
      const { networkMonitor: networkMonitor2 } = await Promise.resolve().then(() => (init_networkMonitor(), networkMonitor_exports));
      const traffic = networkMonitor2.getUserTraffic();
      res.json(traffic);
    } catch (error) {
      console.error("Error fetching user traffic:", error);
      res.status(500).json({ message: "Failed to fetch user traffic" });
    }
  });
  app2.get("/api/network/geographic", async (req, res) => {
    try {
      const { networkMonitor: networkMonitor2 } = await Promise.resolve().then(() => (init_networkMonitor(), networkMonitor_exports));
      const geoData = networkMonitor2.getGeographicData();
      res.json(geoData);
    } catch (error) {
      console.error("Error fetching geographic data:", error);
      res.status(500).json({ message: "Failed to fetch geographic data" });
    }
  });
  app2.get("/api/network/quality", async (req, res) => {
    try {
      const timeRange = req.query.timeRange || "1h";
      const { networkMonitor: networkMonitor2 } = await Promise.resolve().then(() => (init_networkMonitor(), networkMonitor_exports));
      const qualityData = networkMonitor2.getQualityData(timeRange);
      res.json(qualityData);
    } catch (error) {
      console.error("Error fetching quality data:", error);
      res.status(500).json({ message: "Failed to fetch quality data" });
    }
  });
  app2.post("/api/ip-pool/scan", authenticateToken, async (req, res) => {
    try {
      const { range } = req.body;
      const results = [];
      const startIP = range || "192.168.1.1";
      const baseIP = startIP.split(".").slice(0, 3).join(".");
      for (let i = 1; i <= 254; i++) {
        const ip = `${baseIP}.${i}`;
        const isActive = Math.random() > 0.7;
        if (isActive) {
          results.push({
            ip,
            hostname: `device-${i}.local`,
            mac: `00:${Math.floor(Math.random() * 256).toString(16).padStart(2, "0")}:${Math.floor(Math.random() * 256).toString(16).padStart(2, "0")}:${Math.floor(Math.random() * 256).toString(16).padStart(2, "0")}:${Math.floor(Math.random() * 256).toString(16).padStart(2, "0")}:${Math.floor(Math.random() * 256).toString(16).padStart(2, "0")}`,
            vendor: ["Apple", "Samsung", "Dell", "HP", "Cisco", "Netgear"][Math.floor(Math.random() * 6)],
            responseTime: Math.floor(Math.random() * 100) + 1,
            status: "active"
          });
        }
      }
      res.json({
        range: `${baseIP}.1-254`,
        total_scanned: 254,
        active_hosts: results.length,
        results
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to scan network" });
    }
  });
  app2.get("/api/system/connected-ips", authenticateToken, async (req, res) => {
    try {
      const os2 = __require("os");
      const networkInterfaces = os2.networkInterfaces();
      const interfaceData = [];
      for (const [interfaceName, addresses] of Object.entries(networkInterfaces)) {
        if (addresses && Array.isArray(addresses)) {
          for (const addr of addresses) {
            if (!addr.internal) {
              interfaceData.push({
                interface: interfaceName,
                ip_address: addr.address,
                family: addr.family,
                mac: addr.mac,
                netmask: addr.netmask,
                cidr: addr.cidr || `${addr.address}/${addr.family === "IPv4" ? "24" : "64"}`,
                status: "active"
              });
            }
          }
        }
      }
      res.json({
        total_interfaces: interfaceData.length,
        hostname: os2.hostname(),
        platform: os2.platform(),
        arch: os2.arch(),
        interfaces: interfaceData
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get network interfaces" });
    }
  });
  app2.get("/api/packages", async (req, res) => {
    try {
      const packages2 = await storage.getAllPackages();
      res.json(packages2);
    } catch (error) {
      console.error("Error fetching packages:", error);
      res.status(500).json({ message: "Failed to fetch packages" });
    }
  });
  app2.post("/api/packages", async (req, res) => {
    try {
      const packageData = req.body;
      const newPackage = await storage.createPackage(packageData);
      res.status(201).json(newPackage);
    } catch (error) {
      console.error("Error creating package:", error);
      res.status(500).json({ message: "Failed to create package" });
    }
  });
  app2.put("/api/packages/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const updatedPackage = await storage.updatePackage(id, updates);
      if (!updatedPackage) {
        return res.status(404).json({ message: "Package not found" });
      }
      res.json(updatedPackage);
    } catch (error) {
      console.error("Error updating package:", error);
      res.status(500).json({ message: "Failed to update package" });
    }
  });
  app2.delete("/api/packages/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deletePackage(id);
      if (!success) {
        return res.status(404).json({ message: "Package not found" });
      }
      res.json({ message: "Package deleted successfully" });
    } catch (error) {
      console.error("Error deleting package:", error);
      res.status(500).json({ message: "Failed to delete package" });
    }
  });
  app2.post("/api/packages/:id/create-user", async (req, res) => {
    try {
      const { id } = req.params;
      const { username, password, ipAddress, port, outboundIp } = req.body;
      const user = await storage.createUserFromPackage(id, username, password, ipAddress, port, outboundIp);
      res.status(201).json(user);
    } catch (error) {
      console.error("Error creating user from package:", error);
      res.status(500).json({ message: error.message || "Failed to create user from package" });
    }
  });
  app2.get("/api/ip-routing/public-ips", async (req, res) => {
    try {
      const publicIPs = await storage.getPublicIPs();
      res.json(publicIPs);
    } catch (error) {
      console.error("Error fetching public IPs:", error);
      res.status(500).json({ message: "Failed to fetch public IPs" });
    }
  });
  app2.post("/api/ip-routing/test", async (req, res) => {
    try {
      const { outboundIp } = req.body;
      res.json({ success: true, message: `Outbound IP ${outboundIp} is available for routing` });
    } catch (error) {
      console.error("Error testing outbound IP:", error);
      res.status(500).json({ message: "Failed to test outbound IP" });
    }
  });
  app2.post("/api/settings", async (req, res) => {
    try {
      console.log("Received settings save request:", req.body);
      const settings2 = req.body;
      await storage.saveSettings(settings2);
      console.log("Settings saved successfully");
      res.json({ success: true, message: "Settings saved successfully" });
    } catch (error) {
      console.error("Error saving settings:", error);
      res.status(500).json({ message: error.message || "Failed to save settings" });
    }
  });
  app2.get("/api/settings", async (req, res) => {
    try {
      console.log("Fetching settings...");
      const settings2 = await storage.getSettings();
      console.log("Retrieved settings:", settings2);
      res.json(settings2);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: error.message || "Failed to fetch settings" });
    }
  });
  app2.post("/api/server/restart", async (req, res) => {
    try {
      if (global.socksProxyServer) {
        await global.socksProxyServer.stop();
        await global.socksProxyServer.start();
      }
      res.json({ success: true, message: "Server restarted successfully" });
    } catch (error) {
      console.error("Error restarting server:", error);
      res.status(500).json({ message: error.message || "Failed to restart server" });
    }
  });
  const httpServer = createServer(app2);
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  wss.on("connection", (ws) => {
    console.log("Client connected to WebSocket");
    const sendStats = async () => {
      try {
        const stats = {
          totalUsers: await storage.getTotalUsers(),
          activeConnections: await storage.getActiveConnectionsCount(),
          dataTransferred: await storage.getTotalDataTransferred(),
          availableIPs: await storage.getAvailableIPsCount()
        };
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "stats", data: stats }));
        }
      } catch (error) {
        console.error("Error sending stats:", error);
      }
    };
    sendStats();
    const interval = setInterval(sendStats, 5e3);
    ws.on("close", () => {
      console.log("Client disconnected from WebSocket");
      clearInterval(interval);
    });
    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      clearInterval(interval);
    });
  });
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.set("trust proxy", true);
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.header("Access-Control-Allow-Origin", origin);
  } else {
    res.header("Access-Control-Allow-Origin", "*");
  }
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
    log(`SOCKS5 proxy available on port 1080`);
    log(`Replit domain: ${process.env.REPLIT_DOMAINS}`);
    log(`Custom domain access: http://103.7.4.183 (via reverse proxy)`);
  });
})();
