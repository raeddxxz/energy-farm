import { decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar, bigint } from "drizzle-orm/mysql-core";
import { eq, and, gte, desc, sum } from "drizzle-orm";

// Adicionar coluna rdxBalance à tabela users
// Será feito através de migração

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  balance: decimal("balance", { precision: 20, scale: 8 }).default("0").notNull(),
  lastDepositAt: timestamp("lastDepositAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Tabela de itens NFT do usuário (geradores)
export const userItems = mysqlTable("userItems", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  itemType: varchar("itemType", { length: 50 }).notNull(), // catavento, placa_solar, etc
  purchasePrice: decimal("purchasePrice", { precision: 20, scale: 8 }).notNull(),
  dailyProfit: decimal("dailyProfit", { precision: 20, scale: 8 }).notNull(),
  lifespan: int("lifespan").notNull(), // em dias
  purchasedAt: timestamp("purchasedAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  accumulatedRewards: decimal("accumulatedRewards", { precision: 20, scale: 8 }).default("0").notNull(),
  lastCollectedAt: timestamp("lastCollectedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UserItem = typeof userItems.$inferSelect;
export type InsertUserItem = typeof userItems.$inferInsert;

// Tabela de transações (depósitos e saques)
export const transactions = mysqlTable("transactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["deposit", "withdrawal"]).notNull(),
  amount: decimal("amount", { precision: 20, scale: 8 }).notNull(),
  userAddress: varchar("userAddress", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

// Tabela de solicitações de depósito com endereço de destino
export const depositRequests = mysqlTable("depositRequests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  amount: decimal("amount", { precision: 20, scale: 8 }).notNull(),
  userAddress: varchar("userAddress", { length: 255 }).notNull(),
  depositAddress: varchar("depositAddress", { length: 255 }).notNull(),
  cryptoType: mysqlEnum("cryptoType", ["TON", "USDT_BEP20"]).notNull(),
  transactionHash: varchar("transactionHash", { length: 255 }),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "expired", "confirmed"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DepositRequest = typeof depositRequests.$inferSelect;
export type InsertDepositRequest = typeof depositRequests.$inferInsert;

// Tabela de saldo de RDX por usuário
export const userRdxBalance = mysqlTable("userRdxBalance", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  rdxBalance: decimal("rdxBalance", { precision: 20, scale: 8 }).default("0").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserRdxBalance = typeof userRdxBalance.$inferSelect;
export type InsertUserRdxBalance = typeof userRdxBalance.$inferInsert;

// Tabela de histórico de preço do RDX
export const rdxPriceHistory = mysqlTable("rdxPriceHistory", {
  id: int("id").autoincrement().primaryKey(),
  price: decimal("price", { precision: 20, scale: 8 }).notNull(),
  totalSupply: decimal("totalSupply", { precision: 20, scale: 8 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RdxPriceHistory = typeof rdxPriceHistory.$inferSelect;
export type InsertRdxPriceHistory = typeof rdxPriceHistory.$inferInsert;

// Tabela de conversões USDT <-> RDX
export const conversions = mysqlTable("conversions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  fromCurrency: mysqlEnum("fromCurrency", ["USDT", "RDX"]).notNull(),
  toCurrency: mysqlEnum("toCurrency", ["USDT", "RDX"]).notNull(),
  fromAmount: decimal("fromAmount", { precision: 20, scale: 8 }).notNull(),
  toAmount: decimal("toAmount", { precision: 20, scale: 8 }).notNull(),
  rate: decimal("rate", { precision: 20, scale: 8 }).notNull(),
  fee: decimal("fee", { precision: 20, scale: 8 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Conversion = typeof conversions.$inferSelect;
export type InsertConversion = typeof conversions.$inferInsert;

// Tabela de referrals
export const referrals = mysqlTable("referrals", {
  id: int("id").autoincrement().primaryKey(),
  referrerId: int("referrerId").notNull(),
  referralCode: varchar("referralCode", { length: 50 }).notNull().unique(),
  referredUserId: int("referredUserId"),
  totalEarned: decimal("totalEarned", { precision: 20, scale: 8 }).default("0").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = typeof referrals.$inferInsert;

// Tabela de configurações administrativas
export const adminSettings = mysqlTable("adminSettings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AdminSetting = typeof adminSettings.$inferSelect;
export type InsertAdminSetting = typeof adminSettings.$inferInsert;

// Tabela de pool de RDX (para controlar economia)
export const rdxPool = mysqlTable("rdxPool", {
  id: int("id").autoincrement().primaryKey(),
  totalRdxInCirculation: decimal("totalRdxInCirculation", { precision: 20, scale: 8 }).default("0").notNull(),
  totalRdxBurned: decimal("totalRdxBurned", { precision: 20, scale: 8 }).default("0").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RdxPool = typeof rdxPool.$inferSelect;
export type InsertRdxPool = typeof rdxPool.$inferInsert;

// Tabela de histórico de ações admin
export const adminActions = mysqlTable("adminActions", {
  id: int("id").autoincrement().primaryKey(),
  action: varchar("action", { length: 100 }).notNull(),
  details: text("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AdminAction = typeof adminActions.$inferSelect;
export type InsertAdminAction = typeof adminActions.$inferInsert;
