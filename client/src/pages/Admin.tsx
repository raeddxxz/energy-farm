import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function Admin() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const { data: stats } = trpc.admin.getStats.useQuery();
  const { data: transactions } = trpc.admin.getTransactions.useQuery();

  useEffect(() => {
    if (user?.role !== "admin") {
      navigate("/");
    }
  }, [user, navigate]);

  if (user?.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 pb-32">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 pt-4">
          <h1 className="text-3xl font-bold text-white mb-2">{t("admin.title")}</h1>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <Card className="bg-slate-800 border-slate-700 p-6 text-center">
            <p className="text-slate-400 text-sm mb-2">{t("admin.totalUsers")}</p>
            <p className="text-4xl font-bold text-blue-400">{stats?.totalUsers || 0}</p>
          </Card>
          <Card className="bg-slate-800 border-slate-700 p-6 text-center">
            <p className="text-slate-400 text-sm mb-2">{t("admin.totalDeposited")}</p>
            <p className="text-4xl font-bold text-green-400">{stats?.totalDeposited || "0"}</p>
          </Card>
        </div>

        <Card className="bg-slate-800 border-slate-700 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">{t("wallet.transactions")}</h2>
          {transactions && transactions.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex justify-between items-center p-3 bg-slate-700 rounded-lg">
                  <div>
                    <p className="text-white font-medium">
                      {tx.type === "deposit" ? "Depósito" : "Saque"}: {tx.amount}
                    </p>
                    <p className="text-slate-400 text-sm">{tx.userAddress}</p>
                    <p className="text-slate-500 text-xs">{new Date(tx.createdAt).toLocaleString()}</p>
                  </div>
                  <span className={`px-3 py-1 rounded text-sm font-medium whitespace-nowrap ${
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
      </div>
    </div>
  );
}
