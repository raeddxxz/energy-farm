import { eq, and, gte, lte, desc, sum, count } from "drizzle-orm";
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

export async function generateDepositAddress(userId: number, currency: 'TON' | 'BEP20' = 'TON'): Promise<string> {
  // Gerar endereço derivado real da seed phrase
  const { generateTonDepositAddress, generateBep20DepositAddress } = await import('./blockchain-wallet');
  
  if (currency === 'TON') {
    return generateTonDepositAddress(userId);
  } else {
    return generateBep20DepositAddress(userId);
  }
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
  
  // Calcular preço baseado na oferta e demanda usando dados do pool
  // Preço = 0.001 / (1 + (totalRdxInCirculation / 1000000))
  // Quanto mais RDX em circulação, menor o preço (deflação)
  // Quanto menos RDX em circulação, maior o preço (inflação)
  
  const pool = await getRdxPoolStats();
  const totalRdxInCirculation = parseFloat(pool.totalRdxInCirculation);
  
  // Fórmula de preço dinâmico: preço diminui conforme mais RDX em circulação
  const basePrice = 0.001;
  const price = basePrice / (1 + (totalRdxInCirculation / 1000000));
  
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

export async function updateUserItemPurchaseDate(itemId: number, newDate: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(userItems)
    .set({ purchasedAt: newDate })
    .where(eq(userItems.id, itemId));
}

export async function deleteUserItem(itemId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(userItems).where(eq(userItems.id, itemId));
}


// Funções de Referral
export async function createReferral(referrerId: number, referralCode: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { referrals } = await import("../drizzle/schema");
  await db.insert(referrals).values({
    referrerId,
    referralCode,
  });
}

export async function getReferralByCode(code: string) {
  const db = await getDb();
  if (!db) return null;
  
  const { referrals } = await import("../drizzle/schema");
  const result = await db.select().from(referrals)
    .where(eq(referrals.referralCode, code))
    .limit(1);
  
  return result[0] || null;
}

export async function getReferralByUserId(userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const { referrals } = await import("../drizzle/schema");
  const result = await db.select().from(referrals)
    .where(eq(referrals.referrerId, userId))
    .limit(1);
  
  return result[0] || null;
}

export async function updateReferralEarnings(referralId: number, amount: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { referrals } = await import("../drizzle/schema");
  const referral = await db.select().from(referrals)
    .where(eq(referrals.id, referralId))
    .limit(1);
  
  if (referral[0]) {
    const currentEarnings = Number(referral[0].totalEarned) || 0;
    await db.update(referrals)
      .set({ totalEarned: (currentEarnings + amount).toString() })
      .where(eq(referrals.id, referralId));
  }
}

// Funções de Admin Settings
export async function getAdminSetting(key: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  
  const { adminSettings } = await import("../drizzle/schema");
  const result = await db.select().from(adminSettings)
    .where(eq(adminSettings.key, key))
    .limit(1);
  
  return result[0]?.value || null;
}

export async function setAdminSetting(key: string, value: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { adminSettings } = await import("../drizzle/schema");
  
  const existing = await db.select().from(adminSettings)
    .where(eq(adminSettings.key, key))
    .limit(1);
  
  if (existing[0]) {
    await db.update(adminSettings)
      .set({ value })
      .where(eq(adminSettings.key, key));
  } else {
    await db.insert(adminSettings).values({ key, value });
  }
}

// Funções de RDX Pool
export async function getRdxPoolStats(): Promise<{ totalRdxInCirculation: string; totalRdxBurned: string; totalUsdtInPool: string }> {
  const db = await getDb();
  if (!db) return { totalRdxInCirculation: "0", totalRdxBurned: "0", totalUsdtInPool: "0" };
  
  const { rdxPool } = await import("../drizzle/schema");
  const result = await db.select().from(rdxPool).limit(1);
  
  return result[0] || { totalRdxInCirculation: "0", totalRdxBurned: "0", totalUsdtInPool: "0" };
}

export async function updateRdxPool(inCirculation: string, burned: string, usdtInPool?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { rdxPool } = await import("../drizzle/schema");
  
  const existing = await db.select().from(rdxPool).limit(1);
  
  if (existing[0]) {
    await db.update(rdxPool)
      .set({ 
        totalRdxInCirculation: inCirculation,
        totalRdxBurned: burned,
        ...(usdtInPool && { totalUsdtInPool: usdtInPool })
      })
      .where(eq(rdxPool.id, existing[0].id));
  } else {
    await db.insert(rdxPool).values({
      totalRdxInCirculation: inCirculation,
      totalRdxBurned: burned,
      totalUsdtInPool: usdtInPool || "0",
    });
  }
}

export async function addUsdtToPool(amount: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { rdxPool } = await import("../drizzle/schema");
  const pool = await getRdxPoolStats();
  const newUsdt = (parseFloat(pool.totalUsdtInPool) + parseFloat(amount)).toString();
  
  await updateRdxPool(pool.totalRdxInCirculation, pool.totalRdxBurned, newUsdt);
}

export async function removeUsdtFromPool(amount: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { rdxPool } = await import("../drizzle/schema");
  const pool = await getRdxPoolStats();
  const newUsdt = Math.max(0, parseFloat(pool.totalUsdtInPool) - parseFloat(amount)).toString();
  
  await updateRdxPool(pool.totalRdxInCirculation, pool.totalRdxBurned, newUsdt);
}

// Funções de Admin Actions
export async function logAdminAction(action: string, details?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { adminActions } = await import("../drizzle/schema");
  await db.insert(adminActions).values({
    action,
    details,
  });
}

export async function getAdminActionHistory(limit: number = 100) {
  const db = await getDb();
  if (!db) return [];
  
  const { adminActions } = await import("../drizzle/schema");
  return db.select().from(adminActions)
    .orderBy(desc(adminActions.createdAt))
    .limit(limit);
}

// Função para calcular total de USDT circulando
export async function getTotalUsdtInCirculation(): Promise<string> {
  const db = await getDb();
  if (!db) return "0";
  
  const { transactions } = await import("../drizzle/schema");
  const result = await db.select({ total: sum(transactions.amount) })
    .from(transactions)
    .where(eq(transactions.type, "deposit" as any));
  
  const deposits = Number(result[0]?.total || 0);
  
  const withdrawResult = await db.select({ total: sum(transactions.amount) })
    .from(transactions)
    .where(eq(transactions.type, "withdrawal" as any));
  
  const withdraws = Number(withdrawResult[0]?.total || 0);
  
  return (deposits - withdraws).toString();
}


export async function getUserCount(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db.select({ count: count() })
    .from(users);
  
  return result[0]?.count || 0;
}


export async function updateReferralReferredUser(referralId: number, referredUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { referrals } = await import("../drizzle/schema");
  await db.update(referrals)
    .set({ referredUserId })
    .where(eq(referrals.id, referralId));
}
