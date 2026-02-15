import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function Home() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [totalDailyProfit, setTotalDailyProfit] = useState(0);
  const [accumulatedProfit, setAccumulatedProfit] = useState(0);
  const [sellConfirm, setSellConfirm] = useState<{ itemId: number; itemType: string; price: string } | null>(null);

  const { data: items, isLoading, refetch: refetchItems } = trpc.generators.getUserItems.useQuery();
  const collectMutation = trpc.generators.collectRewards.useMutation();
  const sellMutation = trpc.generators.sellItem.useMutation();

  const { refetch: refetchRdx } = trpc.rdx.getBalance.useQuery();

  useEffect(() => {
    if (items) {
      const total = items.reduce((sum, item) => {
        // Converter de USDT para RDX: multiplicar por 1000
        const dailyProfitRdx = parseFloat(item.dailyProfit) * 1000;
        return sum + dailyProfitRdx;
      }, 0);
      setTotalDailyProfit(total);
    }
  }, [items]);

  useEffect(() => {
    // Carregar ganhos salvos do localStorage (persiste entre sessões)
    const savedProfit = localStorage.getItem(`accumulated_profit_${user?.id}`);
    const lastUpdateTime = localStorage.getItem(`last_update_time_${user?.id}`);
    
    if (savedProfit && lastUpdateTime) {
      const profit = parseFloat(savedProfit);
      const lastTime = parseInt(lastUpdateTime);
      const now = Date.now();
      const timePassedMinutes = (now - lastTime) / (1000 * 60);
      
      // Se passou tempo desde a última atualização, calcular ganhos acumulados
      if (timePassedMinutes > 0 && items && items.length > 0) {
        const dailyProfit = items.reduce((sum, item) => {
          return sum + parseFloat(item.dailyProfit) * 1000;
        }, 0);
        const accumulatedWhileAway = (dailyProfit / 1440) * timePassedMinutes;
        const newProfit = profit + accumulatedWhileAway;
        setAccumulatedProfit(newProfit);
        localStorage.setItem(`accumulated_profit_${user?.id}`, newProfit.toString());
      } else {
        setAccumulatedProfit(profit);
      }
    }
  }, [user?.id, items]);

  useEffect(() => {
    const interval = setInterval(() => {
      setAccumulatedProfit((prev) => {
        const secondlyProfit = totalDailyProfit / 86400;
        const newProfit = prev + secondlyProfit;
        // Salvar ganhos a cada segundo no localStorage
        if (user?.id) {
          localStorage.setItem(`accumulated_profit_${user.id}`, newProfit.toString());
          localStorage.setItem(`last_update_time_${user?.id}`, Date.now().toString());
        }
        return newProfit;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [totalDailyProfit, user?.id]);

  const handleCollect = async () => {
    try {
      const result = await collectMutation.mutateAsync();
      toast.success(`Coletado ${result.rdxCollected} RDX!`);
      // Limpar ganhos acumulados após coletar
      if (user?.id) {
        localStorage.removeItem(`accumulated_profit_${user.id}`);
        localStorage.removeItem(`last_update_time_${user?.id}`);
      }
      setAccumulatedProfit(0);
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
              <span className="text-4xl font-bold text-purple-400">
                {totalDailyProfit.toFixed(2)}
              </span>
              <span className="text-slate-400">RDX / dia</span>
            </div>
            <p className="text-slate-500 text-sm mt-2">
              Ganho em tempo real: +{accumulatedProfit.toFixed(6)} RDX
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
                      {t("principal.purchasePrice")}: {(parseFloat(item.purchasePrice) * 1000).toFixed(0)} RDX
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 font-semibold">
                      +{(parseFloat(item.dailyProfit) * 1000).toFixed(2)}/dia
                    </p>
                    <p className="text-slate-400 text-sm">
                      {t("principal.timeRemaining")}: {getTimeRemaining(item.expiresAt)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    onClick={() => {
                      // Converter preço de venda de USDT para RDX: (purchasePrice * 0.5) * 1000
                      const sellPriceRdx = (parseFloat(item.purchasePrice) * 0.5 * 1000).toFixed(0);
                      setSellConfirm({ itemId: item.id, itemType: item.itemType, price: sellPriceRdx });
                    }}
                    disabled={sellMutation.isPending}
                    variant="outline"
                    className="flex-1 text-xs"
                  >
                    {sellMutation.isPending ? <Loader2 className="animate-spin" size={12} /> : "Vender"}
                  </Button>
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

      <Dialog open={!!sellConfirm} onOpenChange={() => setSellConfirm(null)}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              Confirmar Venda
            </DialogTitle>
          </DialogHeader>
          <div className="text-slate-300">
            <p>Você quer vender o item <span className="font-semibold">{sellConfirm?.itemType}</span> por <span className="font-semibold text-green-400">{sellConfirm?.price} RDX</span>?</p>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setSellConfirm(null)}
              variant="outline"
              className="bg-slate-700 hover:bg-slate-600 text-white"
            >
              Não
            </Button>
            <Button
              onClick={async () => {
                if (!sellConfirm) return;
                try {
                  await sellMutation.mutateAsync({ itemId: sellConfirm.itemId });
                  toast.success(`Vendido por ${sellConfirm.price} RDX`);
                  setSellConfirm(null);
                  refetchItems();
                  refetchRdx();
                } catch (error: any) {
                  toast.error(error.message || "Erro");
                }
              }}
              disabled={sellMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {sellMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : "Sim"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
