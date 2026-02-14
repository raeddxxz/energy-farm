import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createAuthContext(userId: number = 1): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `test-user-${userId}`,
      email: `test${userId}@example.com`,
      name: `Test User ${userId}`,
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Generators", () => {
  it("should list all generators", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const generators = await caller.generators.list();

    expect(generators).toHaveLength(6);
    expect(generators[0].id).toBe("catavento");
    expect(generators[0].cost).toBe(0.5);
    expect(generators[5].id).toBe("reator_nuclear");
    expect(generators[5].cost).toBe(1000);
  });

  it("should get user items", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const items = await caller.generators.getUserItems();

    expect(Array.isArray(items)).toBe(true);
  });
});

describe("Wallet", () => {
  it("should get user balance", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const balance = await caller.wallet.getBalance();

    expect(balance).toBeDefined();
    expect(typeof balance).toBe("string");
  });

  it("should get user transactions", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const transactions = await caller.wallet.getTransactions();

    expect(Array.isArray(transactions)).toBe(true);
  });
});

describe("Admin", () => {
  it("should get admin stats for admin user", async () => {
    const ctx = createAuthContext();
    ctx.user.role = "admin";
    const caller = appRouter.createCaller(ctx);

    const stats = await caller.admin.getStats();

    expect(stats).toBeDefined();
    expect(stats.totalUsers).toBeGreaterThanOrEqual(0);
    expect(stats.totalDeposited).toBeDefined();
  });

  it("should deny admin stats for regular user", async () => {
    const ctx = createAuthContext();
    ctx.user.role = "user";
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.admin.getStats();
      expect.fail("Should have thrown FORBIDDEN error");
    } catch (error: any) {
      expect(error.code).toBe("FORBIDDEN");
    }
  });
});
