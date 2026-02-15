import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Copy, Share2 } from "lucide-react";
import { toast } from "sonner";

export default function Referral() {
  const { t } = useLanguage();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralLink, setReferralLink] = useState<string>("");

  const createCodeMutation = trpc.referral.createReferralCode.useMutation();
  const statsQuery = trpc.referral.getReferralStats.useQuery();

  useEffect(() => {
    if (statsQuery.data?.referralCode) {
      setReferralCode(statsQuery.data.referralCode);
      setReferralLink(`${window.location.origin}?ref=${statsQuery.data.referralCode}`);
    }
  }, [statsQuery.data]);

  const handleCreateCode = async () => {
    try {
      const result = await createCodeMutation.mutateAsync();
      setReferralCode(result.code);
      setReferralLink(`${window.location.origin}?ref=${result.code}`);
      toast.success(t("referral.codeCreated"));
    } catch (error) {
      toast.error(t("referral.error"));
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success(t("referral.linkCopied"));
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Energy Farm",
          text: t("referral.shareText"),
          url: referralLink,
        });
      } catch (error) {
        console.log("Share cancelled");
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-4 pb-24">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">
          {t("referral.title")}
        </h1>
        <p className="text-slate-400 mb-6">{t("referral.subtitle")}</p>

        {referralCode ? (
          <>
            <Card className="bg-slate-800 border-slate-700 p-6 mb-6">
              <h2 className="text-sm font-semibold text-slate-400 mb-3">
                {t("referral.yourLink")}
              </h2>
              <div className="bg-slate-900 rounded p-3 mb-4 break-all text-sm text-green-400 font-mono">
                {referralLink}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleCopyLink}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  size="sm"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  {t("referral.copy")}
                </Button>
                <Button
                  onClick={handleShare}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  size="sm"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  {t("referral.share")}
                </Button>
              </div>
            </Card>

            <Card className="bg-slate-800 border-slate-700 p-6">
              <h2 className="text-lg font-semibold text-white mb-4">
                {t("referral.stats")}
              </h2>
              <div className="space-y-4">
                <div>
                  <p className="text-slate-400 text-sm">{t("referral.referredCount")}</p>
                  <p className="text-2xl font-bold text-green-400">
                    {statsQuery.data?.referredCount || 0}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">{t("referral.totalEarned")}</p>
                  <p className="text-2xl font-bold text-cyan-400">
                    {Number(statsQuery.data?.totalEarned || 0).toFixed(8)} RDX
                  </p>
                </div>
              </div>
            </Card>
          </>
        ) : (
          <Card className="bg-slate-800 border-slate-700 p-6">
            <p className="text-slate-400 mb-4">{t("referral.noCode")}</p>
            <Button
              onClick={handleCreateCode}
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={createCodeMutation.isPending}
            >
              {createCodeMutation.isPending
                ? t("referral.creating")
                : t("referral.createCode")}
            </Button>
          </Card>
        )}

        <Card className="bg-slate-800 border-slate-700 p-6 mt-6">
          <h3 className="font-semibold text-white mb-3">{t("referral.howItWorks")}</h3>
          <ul className="text-sm text-slate-400 space-y-2">
            <li>• {t("referral.step1")}</li>
            <li>• {t("referral.step2")}</li>
            <li>• {t("referral.step3")}</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
