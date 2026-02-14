import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { GENERATORS } from "@shared/generators";
import { TRPCError } from "@trpc/server";

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

    collectRewards: protectedProcedure.mutation(async ({ ctx }) => {
      const items = await db.getUserItems(ctx.user.id);
      const now = new Date();
      let totalRdxRewards = 0;

      for (const item of items) {
        if (new Date(item.expiresAt) > now) {
          const daysPassed = (now.getTime() - new Date(item.purchasedAt).getTime()) / (1000 * 60 * 60 * 24);
          const rewards = parseFloat(item.dailyProfit) * daysPassed;
          totalRdxRewards += rewards;
        }
      }

      const currentRdx = parseFloat(await db.getUserRdxBalance(ctx.user.id));
      const newRdxBalance = (currentRdx + totalRdxRewards).toFixed(8);
      await db.updateUserRdxBalance(ctx.user.id, newRdxBalance);

      return { success: true, rdxCollected: totalRdxRewards.toFixed(8), newRdxBalance };
    }),

    sellItem: protectedProcedure
      .input(z.object({ itemId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const items = await db.getUserItems(ctx.user.id);
        const item = items.find(i => i.id === input.itemId);
        
        if (!item) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
        }

        const sellPrice = parseFloat(item.purchasePrice) * 0.5;
        const user = await db.getUserById(ctx.user.id);
        if (!user) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }

        const newBalance = (parseFloat(user.balance) + sellPrice).toFixed(8);
        await db.updateUserBalance(ctx.user.id, newBalance);
        await db.deleteUserItem(input.itemId);

        return { success: true, sellPrice: sellPrice.toFixed(8), newBalance };
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

        const depositAddress = await db.generateDepositAddress(ctx.user.id);

        await db.createDepositRequest({
          userId: ctx.user.id,
          amount: input.amount,
          userAddress: "",
          depositAddress: depositAddress,
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
  }),
});

export type AppRouter = typeof appRouter;
