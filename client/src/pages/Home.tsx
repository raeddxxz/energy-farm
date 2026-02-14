import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function Home() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [totalDailyProfit, setTotalDailyProfit] = useState(0);
  const [accumulatedProfit, setAccumulatedProfit] = useState(0);

  const { data: items, isLoading, refetch: refetchItems } = trpc.generators.getUserItems.useQuery();
  const collectMutation = trpc.generators.collectRewards.useMutation();
  const sellMutation = trpc.generators.sellItem.useMutation();
  const { refetch: refetchBalance } = trpc.wallet.getBalance.useQuery();
  const { refetch: refetchRdx } = trpc.rdx.getBalance.useQuery();

  useEffect(() => {
    if (items) {
      const total = items.reduce((sum, item) => {
        const dailyProfit = parseFloat(item.dailyProfit);
        return sum + dailyProfit;
      }, 0);
      setTotalDailyProfit(total);
    }
  }, [items]);

  useEffect(() => {
    const interval = setInterval(() => {
      setAccumulatedProfit((prev) => {
        const secondlyProfit = totalDailyProfit / 86400;
        return prev + secondlyProfit;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [totalDailyProfit]);

  const handleCollect = async () => {
    try {
      const result = await collectMutation.mutateAsync();
      toast.success(`Coletado ${result.rdxCollected} RDX!`);
      refetchRdx();
    } catch (error: any) {
      toast.error(error.message || "Erro ao coletar");
    }
  };

  const getTimeRemaining = (expiresAt: Date) => {
    const now = new Date();
    const diff = new Date(expiresAt).getTime() - now.getTime();

    if (diff <= 0) return t("principal.expired");

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}${t("principal.days")} ${hours}${t("principal.hours")}`;
    if (hours > 0) return `${hours}${t("principal.hours")} ${minutes}${t("principal.minutes")}`;
    return `${minutes}${t("principal.minutes")}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 pt-4">
          <h1 className="text-3xl font-bold text-white mb-2">{t("principal.title")}</h1>
          <p className="text-slate-400">Bem-vindo, {user?.name}</p>
        </div>

        <Card className="bg-slate-800 border-slate-700 mb-6 p-6">
          <div className="text-center">
            <p className="text-slate-400 text-sm mb-2">{t("principal.totalDaily")}</p>
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-4xl font-bold text-green-400">
                {totalDailyProfit.toFixed(4)}
              </span>
              <span className="text-slate-400">/ dia</span>
            </div>
            <p className="text-slate-500 text-sm mt-2">
              Ganho em tempo real: +{accumulatedProfit.toFixed(6)}
            </p>
            <Button
              onClick={handleCollect}
              disabled={collectMutation.isPending || !items || items.length === 0}
              className="mt-4 w-full"
            >
              {collectMutation.isPending ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                "Coletar RDX"
              )}
            </Button>
          </div>
        </Card>

        {items && items.length > 0 ? (
          <div className="space-y-4">
            {items.map((item) => (
              <Card key={item.id} className="bg-slate-800 border-slate-700 p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{item.itemType}</h3>
                    <p className="text-slate-400 text-sm">
                      {t("principal.purchasePrice")}: {item.purchasePrice}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 font-semibold">
                      +{parseFloat(item.dailyProfit).toFixed(4)}/dia
                    </p>
                    <p className="text-slate-400 text-sm">
                      {t("principal.timeRemaining")}: {getTimeRemaining(item.expiresAt)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    onClick={async () => {
                      const sellPrice = (parseFloat(item.purchasePrice) * 0.5).toFixed(8);
                      try {
                        await sellMutation.mutateAsync({ itemId: item.id });
                        toast.success(`Vendido por ${sellPrice} USDT`);
                        refetchItems();
                        refetchBalance();
                      } catch (error: any) {
                        toast.error(error.message || "Erro");
                      }
                    }}
                    disabled={sellMutation.isPending}
                    variant="outline"
                    className="flex-1 text-xs"
                  >
                    {sellMutation.isPending ? <Loader2 className="animate-spin" size={12} /> : "Vender"}
                  </Button>
                  <div className="flex-1 bg-slate-700 rounded px-2 py-1 text-xs text-slate-300 text-center">
                    Receber: {(parseFloat(item.purchasePrice) * 0.5).toFixed(8)} USDT
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-slate-800 border-slate-700 p-8 text-center">
            <p className="text-slate-400 mb-4">{t("principal.noItems")}</p>
            <a
              href="/shop"
              className="inline-block px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
            >
              {t("nav.loja")}
            </a>
          </Card>
        )}
      </div>
    </div>
  );
}
