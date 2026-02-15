import { getDb } from "./db";
import { depositRequests, users } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { monitorBep20Deposits, monitorTonDeposits } from "./blockchain-wallet";

/**
 * Job que monitora depósitos pendentes e credita o saldo do usuário
 * Deve ser executado a cada minuto
 */
export async function monitorPendingDeposits() {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[DepositMonitor] Database not available");
      return;
    }

    // Buscar todos os depósitos pendentes
    const pendingDeposits = await db
      .select()
      .from(depositRequests)
      .where(eq(depositRequests.status, "pending"));

    console.log(`[DepositMonitor] Verificando ${pendingDeposits.length} depósitos pendentes`);

    for (const deposit of pendingDeposits) {
      try {
        let transactionInfo = null;

        // Monitorar baseado no tipo de cripto
        if (deposit.cryptoType === "USDT_BEP20") {
          transactionInfo = await monitorBep20Deposits(
            deposit.depositAddress,
            Number(deposit.amount)
          );
        } else if (deposit.cryptoType === "TON") {
          transactionInfo = await monitorTonDeposits(
            deposit.depositAddress,
            Number(deposit.amount)
          );
        }

        // Se encontrou transação, creditar saldo do usuário
        if (transactionInfo) {
          console.log(
            `[DepositMonitor] Transação detectada para usuário ${deposit.userId}: ${transactionInfo.hash}`
          );

          // Atualizar status do depósito
          await db
            .update(depositRequests)
            .set({
              status: "confirmed",
              transactionHash: transactionInfo.hash,
              updatedAt: new Date(),
            })
            .where(eq(depositRequests.id, deposit.id));

          // Creditar saldo do usuário
          const user = await db
            .select()
            .from(users)
            .where(eq(users.id, deposit.userId))
            .limit(1);

          if (user.length > 0) {
            const currentBalance = Number(user[0].balance) || 0;
            const newBalance = currentBalance + transactionInfo.amount;

            await db
              .update(users)
              .set({
                balance: newBalance.toString(),
                updatedAt: new Date(),
              })
              .where(eq(users.id, deposit.userId));

            console.log(
              `[DepositMonitor] Saldo creditado: Usuário ${deposit.userId} recebeu ${transactionInfo.amount} USDT/TON. Novo saldo: ${newBalance}`
            );
          }
        }
      } catch (error) {
        console.error(
          `[DepositMonitor] Erro ao monitorar depósito ${deposit.id}:`,
          error
        );
      }
    }
  } catch (error) {
    console.error("[DepositMonitor] Erro geral:", error);
  }
}

/**
 * Inicia o monitoramento de depósitos
 * Deve ser chamado no servidor ao iniciar
 */
export function startDepositMonitoring() {
  console.log("[DepositMonitor] Iniciando monitoramento de depósitos...");

  // Executar a cada minuto (60000 ms)
  setInterval(() => {
    monitorPendingDeposits().catch((error) => {
      console.error("[DepositMonitor] Erro não tratado:", error);
    });
  }, 60000); // 1 minuto

  // Executar uma vez imediatamente
  monitorPendingDeposits().catch((error) => {
    console.error("[DepositMonitor] Erro na execução inicial:", error);
  });
}
