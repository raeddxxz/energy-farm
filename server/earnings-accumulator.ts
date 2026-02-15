import { getDb, updateRdxPool, getRdxPoolStats } from "./db";
import { users, userItems, userRdxBalance } from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Job que acumula ganhos de todos os usuários em tempo real
 * Deve ser executado a cada minuto para garantir que os ganhos continuem acumulando
 * mesmo quando o usuário não está usando o app
 */
export async function accumulateUserEarnings() {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[EarningsAccumulator] Database not available");
      return;
    }

    // Buscar todos os usuários
    const allUsers = await db.select().from(users);

    console.log(
      `[EarningsAccumulator] Acumulando ganhos para ${allUsers.length} usuários`
    );

    let totalNewEarningsAcrossAllUsers = 0;

    for (const user of allUsers) {
      try {
        // Buscar todos os itens do usuário que ainda não expiraram
        const userItemsList = await db
          .select()
          .from(userItems)
          .where(eq(userItems.userId, user.id));

        const now = new Date();
        let totalEarningsToAdd = 0;

        for (const item of userItemsList) {
          // Verificar se o item ainda não expirou
          if (new Date(item.expiresAt) > now) {
            // Calcular ganhos desde a última coleta
            const lastCollected = new Date(item.lastCollectedAt);
            const timeSinceLastCollection =
              (now.getTime() - lastCollected.getTime()) / (1000 * 60); // em minutos
            const dailyProfit = parseFloat(item.dailyProfit);

            // Ganho = (dailyProfit / 1440 minutos) * minutos desde última coleta
            const earnings = (dailyProfit / 1440) * timeSinceLastCollection;

            totalEarningsToAdd += earnings;

            // Atualizar lastCollectedAt para este item
            await db
              .update(userItems)
              .set({
                lastCollectedAt: now,
              })
              .where(eq(userItems.id, item.id));
          }
        }

        // Se houver ganhos para adicionar, atualizar o saldo de RDX do usuário
        if (totalEarningsToAdd > 0) {
          // Buscar saldo atual de RDX
          const rdxBalanceResult = await db
            .select()
            .from(userRdxBalance)
            .where(eq(userRdxBalance.userId, user.id))
            .limit(1);

          let newRdxBalance = totalEarningsToAdd;
          if (rdxBalanceResult.length > 0) {
            newRdxBalance =
              parseFloat(rdxBalanceResult[0].rdxBalance) + totalEarningsToAdd;
          }

          // Atualizar ou inserir saldo de RDX usando insert com onDuplicateKeyUpdate
          await db
            .insert(userRdxBalance)
            .values({
              userId: user.id,
              rdxBalance: newRdxBalance.toFixed(8),
              createdAt: now,
              updatedAt: now,
            })
            .onDuplicateKeyUpdate({
              set: {
                rdxBalance: newRdxBalance.toFixed(8),
                updatedAt: now,
              },
            });

          totalNewEarningsAcrossAllUsers += totalEarningsToAdd;

          console.log(
            `[EarningsAccumulator] Usuário ${user.id}: +${totalEarningsToAdd.toFixed(8)} RDX acumulado`
          );
        }
      } catch (error) {
        console.error(
          `[EarningsAccumulator] Erro ao acumular ganhos do usuário ${user.id}:`,
          error
        );
      }
    }

    // Atualizar o pool de RDX em circulação com todos os novos ganhos
    if (totalNewEarningsAcrossAllUsers > 0) {
      const currentPool = await getRdxPoolStats();
      const newTotalInCirculation = (
        parseFloat(currentPool.totalRdxInCirculation) +
        totalNewEarningsAcrossAllUsers
      ).toFixed(8);
      await updateRdxPool(newTotalInCirculation, currentPool.totalRdxBurned);

      console.log(
        `[EarningsAccumulator] Pool atualizado: +${totalNewEarningsAcrossAllUsers.toFixed(8)} RDX. Total em circulação: ${newTotalInCirculation} RDX`
      );
    }
  } catch (error) {
    console.error("[EarningsAccumulator] Erro geral:", error);
  }
}

/**
 * Inicia o acumulador de ganhos
 * Deve ser chamado no servidor ao iniciar
 */
export function startEarningsAccumulator() {
  console.log("[EarningsAccumulator] Iniciando acumulador de ganhos...");

  // Executar a cada minuto (60000 ms)
  setInterval(() => {
    accumulateUserEarnings().catch((error) => {
      console.error("[EarningsAccumulator] Erro não tratado:", error);
    });
  }, 60000); // 1 minuto

  // Executar uma vez imediatamente
  accumulateUserEarnings().catch((error) => {
    console.error("[EarningsAccumulator] Erro na execução inicial:", error);
  });
}
