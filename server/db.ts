import { eq, and, gte, lte, desc, sum } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

import { InsertUser, users, userItems, InsertUserItem, transactions, InsertTransaction, depositRequests, InsertDepositRequest, userRdxBalance, InsertUserRdxBalance, rdxPriceHistory, InsertRdxPriceHistory, conversions, InsertConversion } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Geradores (User Items)
export async function createUserItem(item: InsertUserItem) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(userItems).values(item);
}

export async function getUserItems(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(userItems).where(eq(userItems.userId, userId));
}

export async function getUserActiveItems(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(userItems)
    .where(and(
      eq(userItems.userId, userId),
      gte(userItems.expiresAt, new Date())
    ));
}

// Transacoes
export async function createTransaction(transaction: InsertTransaction) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(transactions).values(transaction);
  return result;
}

export async function getUserTransactions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.createdAt));
}

export async function getAllTransactions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(transactions).orderBy(desc(transactions.createdAt));
}

export async function getTotalDeposited() {
  const db = await getDb();
  if (!db) return "0";
  const result = await db.select({ total: sum(transactions.amount) })
    .from(transactions)
    .where(eq(transactions.type, "deposit"));
  return result[0]?.total?.toString() || "0";
}

// Solicitacoes de Deposito
export async function createDepositRequest(request: InsertDepositRequest) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(depositRequests).values(request);
}

export async function getDepositRequests(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(depositRequests)
    .where(eq(depositRequests.userId, userId))
    .orderBy(desc(depositRequests.createdAt));
}

export async function getAllDepositRequests() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(depositRequests).orderBy(desc(depositRequests.createdAt));
}

export async function updateUserBalance(userId: number, newBalance: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users)
    .set({ balance: newBalance, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function updateLastDepositAt(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users)
    .set({ lastDepositAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function getTotalUsers() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select().from(users);
  return result.length;
}

export async function generateDepositAddress(userId: number): Promise<string> {
  // Gerar um endereço único baseado no ID do usuário
  // Em produção, isso seria derivado da seed phrase
  const hash = require('crypto').createHash('sha256');
  hash.update(`deposit-${userId}-${Date.now()}`);
  return `0x${hash.digest('hex').substring(0, 40)}`;
}

// RDX Token Functions
export async function getRdxPrice(): Promise<string> {
  const db = await getDb();
  if (!db) return "0.001";
  
  // Buscar o preço mais recente do RDX
  const result = await db.select().from(rdxPriceHistory)
    .orderBy(desc(rdxPriceHistory.createdAt))
    .limit(1);
  
  return result.length > 0 ? result[0].price.toString() : "0.001";
}

export async function calculateRdxPrice(): Promise<string> {
  const db = await getDb();
  if (!db) return "0.001";
  
  // Calcular preço baseado na oferta e demanda
  // Preço = 0.001 * (1 / (1 + totalSupply / 1000000))
  const totalSupplyResult = await db.select({ total: sum(userRdxBalance.rdxBalance) })
    .from(userRdxBalance);
  
  const totalSupply = parseFloat(totalSupplyResult[0]?.total?.toString() || "0");
  
  // Fórmula: preço diminui conforme mais RDX em circulação
  const basePrice = 0.001;
  const price = basePrice / (1 + (totalSupply / 1000000));
  
  return price.toFixed(8);
}

export async function getUserRdxBalance(userId: number): Promise<string> {
  const db = await getDb();
  if (!db) return "0";
  
  const result = await db.select().from(userRdxBalance)
    .where(eq(userRdxBalance.userId, userId))
    .limit(1);
  
  return result.length > 0 ? result[0].rdxBalance.toString() : "0";
}

export async function updateUserRdxBalance(userId: number, newBalance: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await db.select().from(userRdxBalance)
    .where(eq(userRdxBalance.userId, userId));
  
  if (existing.length > 0) {
    await db.update(userRdxBalance)
      .set({ rdxBalance: newBalance, updatedAt: new Date() })
      .where(eq(userRdxBalance.userId, userId));
  } else {
    await db.insert(userRdxBalance).values({
      userId,
      rdxBalance: newBalance,
    });
  }
}

export async function createConversion(conversion: InsertConversion) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(conversions).values(conversion);
}

export async function getConversionHistory(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(conversions)
    .where(eq(conversions.userId, userId))
    .orderBy(desc(conversions.createdAt));
}

export async function saveRdxPriceHistory(price: string, totalSupply: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(rdxPriceHistory).values({
    price,
    totalSupply,
  });
}

export async function getTotalRdxSupply(): Promise<string> {
  const db = await getDb();
  if (!db) return "0";
  
  const result = await db.select({ total: sum(userRdxBalance.rdxBalance) })
    .from(userRdxBalance);
  
  return result[0]?.total?.toString() || "0";
}
