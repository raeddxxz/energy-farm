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

  // Geradores
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

        // Create user item
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

        // Update user balance
        const newBalance = (userBalance - generator.cost).toFixed(8);
        await db.updateUserBalance(ctx.user.id, newBalance);

        return { success: true, newBalance };
      }),
  }),

  // Carteira
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
        userAddress: z.string().min(1),
        destinationAddress: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = await db.getUserById(ctx.user.id);
        if (!user) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }

        // Check if user already deposited today
        if (user.lastDepositAt) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const lastDeposit = new Date(user.lastDepositAt);
          lastDeposit.setHours(0, 0, 0, 0);

          if (today.getTime() === lastDeposit.getTime()) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Already deposited today" });
          }
        }

        // Create deposit request
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour

        await db.createDepositRequest({
          userId: ctx.user.id,
          amount: input.amount,
          userAddress: input.userAddress,
          destinationAddress: input.destinationAddress,
          expiresAt,
          status: "pending",
        });

        // Update last deposit time
        await db.updateLastDepositAt(ctx.user.id);

        // Create transaction record (will be auto-approved)
        await db.createTransaction({
          userId: ctx.user.id,
          type: "deposit",
          amount: input.amount,
          userAddress: input.userAddress,
          status: "approved",
        });

        // Update balance immediately (auto-approval)
        const newBalance = (parseFloat(user.balance) + parseFloat(input.amount)).toFixed(8);
        await db.updateUserBalance(ctx.user.id, newBalance);

        return { success: true, newBalance, expiresAt };
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

        if (userBalance < withdrawAmount) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Insufficient balance" });
        }

        // Create transaction (auto-approved)
        await db.createTransaction({
          userId: ctx.user.id,
          type: "withdrawal",
          amount: input.amount,
          userAddress: input.userAddress,
          status: "approved",
        });

        // Update balance immediately
        const newBalance = (userBalance - withdrawAmount).toFixed(8);
        await db.updateUserBalance(ctx.user.id, newBalance);

        return { success: true, newBalance };
      }),
  }),

  // Admin
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
