import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Shop() {
  const { t } = useLanguage();
  const [buying, setBuying] = useState<string | null>(null);

  const { data: generators } = trpc.generators.list.useQuery();
  const { data: balance } = trpc.wallet.getBalance.useQuery();
  const buyMutation = trpc.generators.buy.useMutation();

  const handleBuy = async (generatorId: string) => {
    setBuying(generatorId);
    try {
      const result = await buyMutation.mutateAsync({ generatorId });
      toast.success(t("shop.purchased"));
    } catch (error: any) {
      toast.error(error.message || t("shop.error"));
    } finally {
      setBuying(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 pb-32">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 pt-4">
          <h1 className="text-3xl font-bold text-white mb-2">{t("shop.title")}</h1>
          <p className="text-slate-400">Saldo: {balance || "0"}</p>
        </div>

        {generators && generators.length > 0 ? (
          <div className="space-y-4">
            {generators.map((gen) => (
              <Card key={gen.id} className="bg-slate-800 border-slate-700 p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{gen.icon}</span>
                      <h3 className="text-lg font-semibold text-white">{gen.name}</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-slate-400">
                      <p>{t("shop.cost")}: {gen.cost}</p>
                      <p>{t("shop.lifespan")}: {gen.lifespan} dias</p>
                      <p>{t("shop.totalProfit")}: {gen.totalProfit}</p>
                      <p>{t("shop.dailyProfit")}: {gen.dailyProfit}</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleBuy(gen.id)}
                    disabled={buying === gen.id || !balance || parseFloat(balance) < gen.cost}
                    className="ml-4"
                  >
                    {buying === gen.id ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      t("shop.buy")
                    )}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-slate-800 border-slate-700 p-8 text-center">
            <p className="text-slate-400">{t("common.loading")}</p>
          </Card>
        )}
      </div>
    </div>
  );
}
