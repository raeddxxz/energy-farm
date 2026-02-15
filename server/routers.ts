import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { GENERATORS } from "@shared/generators";
import { TRPCError } from "@trpc/server";
import { ENV } from "./_core/env";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  generators: router({
    list: publicProcedure.query(() => GENERATORS),
    
    getUserItems: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserItems(ctx.user.id);
    }),

    buy: protectedProcedure
      .input(z.object({ generatorId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const generator = GENERATORS.find(g => g.id === input.generatorId);
        if (!generator) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Generator not found" });
        }

        const user = await db.getUserById(ctx.user.id);
        if (!user) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }

        const userBalance = parseFloat(user.balance);
        if (userBalance < generator.cost) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Insufficient balance" });
        }

        const now = new Date();
        const expiresAt = new Date(now.getTime() + generator.lifespan * 24 * 60 * 60 * 1000);

        await db.createUserItem({
          userId: ctx.user.id,
          itemType: generator.id,
          purchasePrice: generator.cost.toString(),
          dailyProfit: generator.dailyProfit.toString(),
          lifespan: generator.lifespan,
          purchasedAt: now,
          expiresAt,
        });

        const newBalance = (userBalance - generator.cost).toFixed(8);
        await db.updateUserBalance(ctx.user.id, newBalance);

        return { success: true, newBalance };
      }),

    collectRewards: protectedProcedure
      .input(z.object({ rdxAmount: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Usar o valor exato enviado pelo frontend (ganho em tempo real)
        const rdxToCollect = input.rdxAmount;
        
        const currentRdx = parseFloat(await db.getUserRdxBalance(ctx.user.id));
        const newRdxBalance = (currentRdx + rdxToCollect).toFixed(8);
        await db.updateUserRdxBalance(ctx.user.id, newRdxBalance);

        // Atualizar pool de RDX (aumentar RDX em circulação)
        const pool = await db.getRdxPoolStats();
        const newCirculation = (parseFloat(pool.totalRdxInCirculation) + rdxToCollect).toString();
        await db.updateRdxPool(newCirculation, pool.totalRdxBurned);

        return { success: true, rdxCollected: rdxToCollect.toFixed(8), newRdxBalance };
      }),

    sellItem: protectedProcedure
      .input(z.object({ itemId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const items = await db.getUserItems(ctx.user.id);
        const item = items.find(i => i.id === input.itemId);
        
        if (!item) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
        }

        // Calcular preco de venda em RDX (50% do preco de compra em RDX)
        // purchasePrice esta em USDT, entao multiplicar por 1000 para converter para RDX
        const purchasePriceRdx = parseFloat(item.purchasePrice) * 1000;
        const sellPriceRdx = purchasePriceRdx * 0.5;
        
        // Adicionar ao saldo RDX do usuario
        const currentRdx = parseFloat(await db.getUserRdxBalance(ctx.user.id));
        const newRdxBalance = (currentRdx + sellPriceRdx).toFixed(8);
        await db.updateUserRdxBalance(ctx.user.id, newRdxBalance);
        
        // Remover o item
        await db.deleteUserItem(input.itemId);

        // Atualizar pool de RDX (aumentar RDX em circulação)
        const pool = await db.getRdxPoolStats();
        const newCirculation = (parseFloat(pool.totalRdxInCirculation) + sellPriceRdx).toString();
        await db.updateRdxPool(newCirculation, pool.totalRdxBurned);

        return { success: true, sellPrice: sellPriceRdx.toFixed(8), newBalance: newRdxBalance };
      }),
  }),

  wallet: router({
    getBalance: protectedProcedure.query(async ({ ctx }) => {
      const user = await db.getUserById(ctx.user.id);
      return user?.balance || "0";
    }),

    getTransactions: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserTransactions(ctx.user.id);
    }),

    deposit: protectedProcedure
      .input(z.object({
        amount: z.string(),
        cryptoType: z.enum(["TON", "USDT_BEP20"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = await db.getUserById(ctx.user.id);
        if (!user) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }

        const depositAmount = parseFloat(input.amount);
        if (depositAmount < 1) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Minimum deposit is 1 USDT" });
        }

        const currency = input.cryptoType === 'USDT_BEP20' ? 'BEP20' : 'TON';
        const depositAddress = await db.generateDepositAddress(ctx.user.id, currency);

        await db.createDepositRequest({
          userId: ctx.user.id,
          amount: input.amount,
          userAddress: "",
          depositAddress: depositAddress,
          cryptoType: input.cryptoType,
          status: "pending",
        });

        return { 
          success: true, 
          depositAddress,
          amount: input.amount,
          message: "Endereco gerado. Aguardando deposito na blockchain..."
        };
      }),

    withdraw: protectedProcedure
      .input(z.object({
        amount: z.string(),
        userAddress: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = await db.getUserById(ctx.user.id);
        if (!user) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }

        const userBalance = parseFloat(user.balance);
        const withdrawAmount = parseFloat(input.amount);

        if (withdrawAmount < 1) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Minimum withdrawal is 1 USDT" });
        }

        if (userBalance < withdrawAmount) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Insufficient balance" });
        }

        await db.createTransaction({
          userId: ctx.user.id,
          type: "withdrawal",
          amount: input.amount,
          userAddress: input.userAddress,
          status: "pending",
        });

        const newBalance = (userBalance - withdrawAmount).toFixed(8);
        await db.updateUserBalance(ctx.user.id, newBalance);

        return { success: true, newBalance, message: "Saque solicitado. Transferindo para sua carteira..." };
      }),
  }),

  rdx: router({
    getPrice: publicProcedure.query(async () => {
      return db.calculateRdxPrice();
    }),

    getBalance: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserRdxBalance(ctx.user.id);
    }),

    convert: protectedProcedure
      .input(z.object({
        fromCurrency: z.enum(["USDT", "RDX"]),
        amount: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = await db.getUserById(ctx.user.id);
        if (!user) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }

        const amount = parseFloat(input.amount);
        if (amount < 0.1) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Minimum conversion is 0.1 USDT" });
        }

        const rdxPrice = parseFloat(await db.calculateRdxPrice());
        const fee = amount * 0.01;
        const netAmount = amount - fee;

        if (input.fromCurrency === "USDT") {
          const userBalance = parseFloat(user.balance);
          if (userBalance < amount) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Insufficient USDT balance" });
          }

          const rdxAmount = netAmount / rdxPrice;
          const newUsdtBalance = (userBalance - amount).toFixed(8);
          const currentRdx = parseFloat(await db.getUserRdxBalance(ctx.user.id));
          const newRdxBalance = (currentRdx + rdxAmount).toFixed(8);

          await db.updateUserBalance(ctx.user.id, newUsdtBalance);
          await db.updateUserRdxBalance(ctx.user.id, newRdxBalance);
          await db.createConversion({
            userId: ctx.user.id,
            fromCurrency: "USDT",
            toCurrency: "RDX",
            fromAmount: amount.toString(),
            toAmount: rdxAmount.toFixed(8),
            rate: rdxPrice.toString(),
            fee: fee.toFixed(8),
          });

          return { success: true, rdxReceived: rdxAmount.toFixed(8), fee: fee.toFixed(8) };
        } else {
          const currentRdx = parseFloat(await db.getUserRdxBalance(ctx.user.id));
          if (currentRdx < amount) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Insufficient RDX balance" });
          }

          const usdtAmount = netAmount * rdxPrice;
          const newRdxBalance = (currentRdx - amount).toFixed(8);
          const newUsdtBalance = (parseFloat(user.balance) + usdtAmount).toFixed(8);

          await db.updateUserRdxBalance(ctx.user.id, newRdxBalance);
          await db.updateUserBalance(ctx.user.id, newUsdtBalance);
          await db.createConversion({
            userId: ctx.user.id,
            fromCurrency: "RDX",
            toCurrency: "USDT",
            fromAmount: amount.toString(),
            toAmount: usdtAmount.toFixed(8),
            rate: rdxPrice.toString(),
            fee: fee.toFixed(8),
          });

          return { success: true, usdtReceived: usdtAmount.toFixed(8), fee: fee.toFixed(8) };
        }
      }),

    getConversionHistory: protectedProcedure.query(async ({ ctx }) => {
      return db.getConversionHistory(ctx.user.id);
    }),
  }),

  admin: router({
    getStats: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const totalUsers = await db.getTotalUsers();
      const totalDeposited = await db.getTotalDeposited();

      return { totalUsers, totalDeposited };
    }),

    getTransactions: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return db.getAllTransactions();
    }),

    getDepositRequests: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return db.getAllDepositRequests();
    }),

    verifyPassword: protectedProcedure
      .input(z.object({ password: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const isValid = input.password === ENV.adminPassword;
        return { valid: isValid };
      }),

    getSettings: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const depositsDisabled = await db.getAdminSetting("depositsDisabled");
      const withdrawsDisabled = await db.getAdminSetting("withdrawsDisabled");
      const conversionsDisabled = await db.getAdminSetting("conversionsDisabled");
      const totalUsdt = await db.getTotalUsdtInCirculation();
      const rdxPool = await db.getRdxPoolStats();
      const userCount = await db.getUserCount();

      return {
        depositsDisabled: depositsDisabled === "true",
        withdrawsDisabled: withdrawsDisabled === "true",
        conversionsDisabled: conversionsDisabled === "true",
        totalUsdtInCirculation: totalUsdt,
        totalRdxInCirculation: rdxPool.totalRdxInCirculation,
        totalRdxBurned: rdxPool.totalRdxBurned,
        userCount,
      };
    }),

    toggleDeposits: protectedProcedure
      .input(z.object({ password: z.string(), enabled: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        if (input.password !== ENV.adminPassword) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid password" });
        }
        await db.setAdminSetting("depositsDisabled", input.enabled ? "false" : "true");
        await db.logAdminAction("toggle_deposits", `Deposits ${input.enabled ? "enabled" : "disabled"}`);
        return { success: true };
      }),

    toggleWithdraws: protectedProcedure
      .input(z.object({ password: z.string(), enabled: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        if (input.password !== ENV.adminPassword) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid password" });
        }
        await db.setAdminSetting("withdrawsDisabled", input.enabled ? "false" : "true");
        await db.logAdminAction("toggle_withdraws", `Withdraws ${input.enabled ? "enabled" : "disabled"}`);
        return { success: true };
      }),

    toggleConversions: protectedProcedure
      .input(z.object({ password: z.string(), enabled: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        if (input.password !== ENV.adminPassword) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid password" });
        }
        await db.setAdminSetting("conversionsDisabled", input.enabled ? "false" : "true");
        await db.logAdminAction("toggle_conversions", `Conversions ${input.enabled ? "enabled" : "disabled"}`);
        return { success: true };
      }),

    burnRdx: protectedProcedure
      .input(z.object({ password: z.string(), amount: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        if (input.password !== ENV.adminPassword) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid password" });
        }
        const pool = await db.getRdxPoolStats();
        const burned = Number(pool.totalRdxBurned) + Number(input.amount);
        await db.updateRdxPool(pool.totalRdxInCirculation, burned.toString());
        await db.logAdminAction("burn_rdx", `Burned ${input.amount} RDX`);
        return { success: true };
      }),

    addRdxToPool: protectedProcedure
      .input(z.object({ password: z.string(), amount: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        if (input.password !== ENV.adminPassword) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid password" });
        }
        const pool = await db.getRdxPoolStats();
        const inCirculation = Number(pool.totalRdxInCirculation) + Number(input.amount);
        await db.updateRdxPool(inCirculation.toString(), pool.totalRdxBurned);
        await db.logAdminAction("add_rdx", `Added ${input.amount} RDX to pool`);
        return { success: true };
      }),

    sendRdxToUser: protectedProcedure
      .input(z.object({ password: z.string(), userId: z.number(), amount: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        if (input.password !== ENV.adminPassword) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid password" });
        }
        const currentRdx = parseFloat(await db.getUserRdxBalance(input.userId));
        const newRdx = (currentRdx + Number(input.amount)).toFixed(8);
        await db.updateUserRdxBalance(input.userId, newRdx);
        await db.logAdminAction("send_rdx", `Sent ${input.amount} RDX to user ${input.userId}`);
        return { success: true };
      }),

    sendUsdtToUser: protectedProcedure
      .input(z.object({ password: z.string(), userId: z.number(), amount: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        if (input.password !== ENV.adminPassword) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid password" });
        }
        const user = await db.getUserById(input.userId);
        if (!user) {
          throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        }
        const currentUsdt = parseFloat(user.balance);
        const newUsdt = (currentUsdt + Number(input.amount)).toFixed(8);
        await db.updateUserBalance(input.userId, newUsdt);
        await db.logAdminAction("send_usdt", `Sent ${input.amount} USDT to user ${input.userId}`);
        return { success: true };
      }),
  }),

  referral: router({
    createReferralCode: protectedProcedure.mutation(async ({ ctx }) => {
      const existing = await db.getReferralByUserId(ctx.user.id);
      if (existing) {
        return { code: existing.referralCode };
      }
      
      const code = `REF${ctx.user.id}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      await db.createReferral(ctx.user.id, code);
      return { code };
    }),

    getReferralCode: protectedProcedure.query(async ({ ctx }) => {
      const referral = await db.getReferralByUserId(ctx.user.id);
      return referral?.referralCode || null;
    }),

    getReferralStats: protectedProcedure.query(async ({ ctx }) => {
      const referral = await db.getReferralByUserId(ctx.user.id);
      if (!referral) {
        return { referralCode: null, totalEarned: "0", referredCount: 0 };
      }
      
      return {
        referralCode: referral.referralCode,
        totalEarned: referral.totalEarned.toString(),
        referredCount: referral.referredUserId ? 1 : 0,
      };
    }),

    applyReferralCode: protectedProcedure
      .input(z.object({ referralCode: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const referral = await db.getReferralByCode(input.referralCode);
        if (!referral) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Invalid referral code" });
        }
        
        if (referral.referrerId === ctx.user.id) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot use your own referral code" });
        }
        
        await db.updateReferralReferredUser(referral.id, ctx.user.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
