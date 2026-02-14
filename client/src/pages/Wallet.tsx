import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function Wallet() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"balance" | "deposit" | "withdraw" | "history">("balance");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositAddress, setDepositAddress] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawAddress, setWithdrawAddress] = useState("");

  const { data: balance, refetch: refetchBalance } = trpc.wallet.getBalance.useQuery();
  const { data: transactions } = trpc.wallet.getTransactions.useQuery();
  const depositMutation = trpc.wallet.deposit.useMutation();
  const withdrawMutation = trpc.wallet.withdraw.useMutation();

  const handleDeposit = async () => {
    if (!depositAmount || !depositAddress) {
      toast.error("Preencha todos os campos");
      return;
    }

    try {
      await depositMutation.mutateAsync({
        amount: depositAmount,
        userAddress: depositAddress,
        destinationAddress: "UQBtLYHDBWcdq_LMFXRwrSo4aUQVXfao3q5WSyRbnqdS0eb3",
      });
      toast.success(t("deposit.success"));
      setDepositAmount("");
      setDepositAddress("");
      refetchBalance();
    } catch (error: any) {
      toast.error(error.message || t("deposit.error"));
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || !withdrawAddress) {
      toast.error("Preencha todos os campos");
      return;
    }

    try {
      await withdrawMutation.mutateAsync({
        amount: withdrawAmount,
        userAddress: withdrawAddress,
      });
      toast.success(t("withdraw.success"));
      setWithdrawAmount("");
      setWithdrawAddress("");
      refetchBalance();
    } catch (error: any) {
      toast.error(error.message || t("withdraw.error"));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 pb-32">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 pt-4">
          <h1 className="text-3xl font-bold text-white mb-2">{t("wallet.title")}</h1>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto">
          {["balance", "deposit", "withdraw", "history"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
                activeTab === tab
                  ? "bg-blue-600 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              {tab === "balance" && t("wallet.balance")}
              {tab === "deposit" && t("wallet.deposit")}
              {tab === "withdraw" && t("wallet.withdraw")}
              {tab === "history" && t("wallet.history")}
            </button>
          ))}
        </div>

        {activeTab === "balance" && (
          <Card className="bg-slate-800 border-slate-700 p-8 text-center">
            <p className="text-slate-400 mb-4">{t("wallet.balance")}</p>
            <p className="text-5xl font-bold text-green-400">{balance || "0"}</p>
          </Card>
        )}

        {activeTab === "deposit" && (
          <Card className="bg-slate-800 border-slate-700 p-6 space-y-4">
            <h2 className="text-xl font-semibold text-white">{t("deposit.title")}</h2>
            <div>
              <label className="block text-slate-300 text-sm mb-2">{t("deposit.amount")}</label>
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-slate-300 text-sm mb-2">{t("deposit.userAddress")}</label>
              <input
                type="text"
                value={depositAddress}
                onChange={(e) => setDepositAddress(e.target.value)}
                placeholder="Seu endereço..."
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              />
            </div>
            <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-3 text-yellow-200 text-sm">
              {t("deposit.warning")}
            </div>
            <Button
              onClick={handleDeposit}
              disabled={depositMutation.isPending}
              className="w-full"
            >
              {depositMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : t("deposit.confirm")}
            </Button>
          </Card>
        )}

        {activeTab === "withdraw" && (
          <Card className="bg-slate-800 border-slate-700 p-6 space-y-4">
            <h2 className="text-xl font-semibold text-white">{t("withdraw.title")}</h2>
            <div>
              <label className="block text-slate-300 text-sm mb-2">{t("withdraw.amount")}</label>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-slate-300 text-sm mb-2">{t("withdraw.userAddress")}</label>
              <input
                type="text"
                value={withdrawAddress}
                onChange={(e) => setWithdrawAddress(e.target.value)}
                placeholder="Seu endereço..."
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              />
            </div>
            <Button
              onClick={handleWithdraw}
              disabled={withdrawMutation.isPending}
              className="w-full"
            >
              {withdrawMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : t("withdraw.confirm")}
            </Button>
          </Card>
        )}

        {activeTab === "history" && (
          <Card className="bg-slate-800 border-slate-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">{t("wallet.transactions")}</h2>
            {transactions && transactions.length > 0 ? (
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex justify-between items-center p-3 bg-slate-700 rounded-lg">
                    <div>
                      <p className="text-white font-medium">
                        {tx.type === "deposit" ? "+" : "-"} {tx.amount}
                      </p>
                      <p className="text-slate-400 text-sm">{new Date(tx.createdAt).toLocaleString()}</p>
                    </div>
                    <span className={`px-3 py-1 rounded text-sm font-medium ${
                      tx.status === "approved" ? "bg-green-900 text-green-200" :
                      tx.status === "pending" ? "bg-yellow-900 text-yellow-200" :
                      "bg-red-900 text-red-200"
                    }`}>
                      {tx.status === "approved" && t("admin.approved")}
                      {tx.status === "pending" && t("admin.pending")}
                      {tx.status === "rejected" && t("admin.rejected")}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400">{t("wallet.noTransactions")}</p>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
