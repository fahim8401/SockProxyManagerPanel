import { sql } from 'drizzle-orm';
import {
  integer,
  sqliteTable,
  text,
  real,
} from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Admin users table
export const admins = sqliteTable("admins", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("admin"),
  createdAt: integer("created_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

// Packages table for SAAS plans
export const packages = sqliteTable("packages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  description: text("description"),
  dataLimit: integer("data_limit").notNull(), // in bytes
  validityDays: integer("validity_days").notNull(), // expiry days
  price: real("price").notNull().default(0),
  maxConnections: integer("max_connections").notNull().default(1),
  allowedIpCount: integer("allowed_ip_count").notNull().default(1),
  isActive: integer("is_active", { mode: 'boolean' }).notNull().default(true),
  createdAt: integer("created_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

// IP pool table for outbound routing (defined before proxyUsers to avoid circular reference)
export const ipPool = sqliteTable("ip_pool", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ipAddress: text("ip_address").notNull().unique(),
  isPublic: integer("is_public", { mode: 'boolean' }).notNull().default(true),
  isActive: integer("is_active", { mode: 'boolean' }).notNull().default(true),
  country: text("country"),
  city: text("city"),
  provider: text("provider"),
  assignedUserId: integer("assigned_user_id"),
  createdAt: integer("created_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

// SOCKS5 proxy users table
export const proxyUsers = sqliteTable("proxy_users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  packageId: integer("package_id").references(() => packages.id, { onDelete: 'set null' }),
  selectedIpId: integer("selected_ip_id").references(() => ipPool.id, { onDelete: 'set null' }),
  ipAddress: text("ip_address").notNull().default("0.0.0.0"),
  port: integer("port").notNull().default(1080),
  dataLimit: integer("data_limit").notNull().default(1073741824), // 1GB in bytes
  dataUsed: integer("data_used").notNull().default(0),
  validityDays: integer("validity_days").notNull().default(30),
  isActive: integer("is_active", { mode: 'boolean' }).notNull().default(true),
  createdAt: integer("created_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
  expiresAt: integer("expires_at", { mode: 'timestamp' }),
});

// Connection logs table
export const connections = sqliteTable("connections", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => proxyUsers.id, { onDelete: 'cascade' }),
  clientIp: text("client_ip").notNull(),
  targetHost: text("target_host"),
  targetPort: integer("target_port"),
  bytesUp: integer("bytes_up").notNull().default(0),
  bytesDown: integer("bytes_down").notNull().default(0),
  connectedAt: integer("connected_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
  disconnectedAt: integer("disconnected_at", { mode: 'timestamp' }),
  isActive: integer("is_active", { mode: 'boolean' }).notNull().default(true),
});

// Xray configuration table
export const xrayConfigs = sqliteTable("xray_configs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  configName: text("config_name").notNull().unique(),
  configData: text("config_data").notNull(), // JSON string
  isActive: integer("is_active", { mode: 'boolean' }).notNull().default(false),
  createdAt: integer("created_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

// API keys table for external access
export const apiKeys = sqliteTable("api_keys", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  keyName: text("key_name").notNull(),
  apiKey: text("api_key").notNull().unique(),
  permissions: text("permissions").notNull().default("read"), // read, write, admin
  isActive: integer("is_active", { mode: 'boolean' }).notNull().default(true),
  lastUsed: integer("last_used", { mode: 'timestamp' }),
  createdAt: integer("created_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
  expiresAt: integer("expires_at", { mode: 'timestamp' }),
});

// System settings table
export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

// Zod schemas for validation
export const insertAdminSchema = createInsertSchema(admins).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPackageSchema = createInsertSchema(packages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProxyUserSchema = createInsertSchema(proxyUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  dataUsed: true,
}).extend({
  validityDays: z.number().optional()
});

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  createdAt: true,
});

export const insertConnectionSchema = createInsertSchema(connections).omit({
  id: true,
  connectedAt: true,
  disconnectedAt: true,
});

export const insertIpPoolSchema = createInsertSchema(ipPool).omit({
  id: true,
  createdAt: true,
  assignedUserId: true,
});

export const insertXrayConfigSchema = createInsertSchema(xrayConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSettingSchema = createInsertSchema(settings).omit({
  id: true,
  updatedAt: true,
});

// Type exports
export type Admin = typeof admins.$inferSelect;
export type InsertAdmin = z.infer<typeof insertAdminSchema>;

export type Package = typeof packages.$inferSelect;
export type InsertPackage = z.infer<typeof insertPackageSchema>;

export type ProxyUser = typeof proxyUsers.$inferSelect;
export type InsertProxyUser = z.infer<typeof insertProxyUserSchema>;

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;

export type Connection = typeof connections.$inferSelect;
export type InsertConnection = z.infer<typeof insertConnectionSchema>;

export type IpPool = typeof ipPool.$inferSelect;
export type InsertIpPool = z.infer<typeof insertIpPoolSchema>;

export type XrayConfig = typeof xrayConfigs.$inferSelect;
export type InsertXrayConfig = z.infer<typeof insertXrayConfigSchema>;

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingSchema>;