import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Lock } from "lucide-react";

export default function Admin() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState<"stats" | "settings" | "rdx" | "send">("stats");
  const [rdxAmount, setRdxAmount] = useState("");
  const [userId, setUserId] = useState("");
  const [sendAmount, setSendAmount] = useState("");

  const { data: stats } = trpc.admin.getStats.useQuery();
  const verifyPasswordMutation = trpc.admin.verifyPassword.useMutation();
  const burnRdxMutation = trpc.admin.burnRdx.useMutation();
  const addRdxMutation = trpc.admin.addRdxToPool.useMutation();
  const sendRdxMutation = trpc.admin.sendRdxToUser.useMutation();
  const toggleDepositsMutation = trpc.admin.toggleDeposits.useMutation();
  const toggleWithdrawsMutation = trpc.admin.toggleWithdraws.useMutation();
  const toggleConversionsMutation = trpc.admin.toggleConversions.useMutation();

  useEffect(() => {
    if (user?.role !== "admin") {
      navigate("/");
    }
  }, [user, navigate]);

  if (user?.role !== "admin") {
    return null;
  }

  const handleLogin = async () => {
    try {
      const result = await verifyPasswordMutation.mutateAsync({ password });
      if (result.valid) {
        setIsAuthenticated(true);
        setPassword("");
        toast.success("Autenticado!");
      } else {
        toast.error("Senha incorreta");
      }
    } catch (error) {
      toast.error("Erro ao autenticar");
    }
  };

  const handleBurnRdx = async () => {
    try {
      const result = await burnRdxMutation.mutateAsync({
        password,
        amount: rdxAmount,
      });
      if (result.success) {
        setRdxAmount("");
        toast.success("RDX queimado!");
      }
    } catch (error) {
      toast.error("Erro ao queimar RDX");
    }
  };

  const handleAddRdx = async () => {
    try {
      const result = await addRdxMutation.mutateAsync({
        password,
        amount: rdxAmount,
      });
      if (result.success) {
        setRdxAmount("");
        toast.success("RDX adicionado!");
      }
    } catch (error) {
      toast.error("Erro ao adicionar RDX");
    }
  };

  const handleSendRdx = async () => {
    try {
      const result = await sendRdxMutation.mutateAsync({
        password,
        userId: parseInt(userId),
        amount: sendAmount,
      });
      if (result.success) {
        setUserId("");
        setSendAmount("");
        toast.success("RDX enviado!");
      }
    } catch (error) {
      toast.error("Erro ao enviar RDX");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-4 pb-24 flex items-center justify-center">
        <Card className="bg-slate-800 border-slate-700 p-8 w-full max-w-sm">
          <div className="flex justify-center mb-4">
            <Lock className="w-12 h-12 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-white text-center mb-6">Admin</h1>
          <div className="space-y-4">
            <Input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-slate-700 border-slate-600 text-white"
            />
            <Button
              onClick={handleLogin}
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={verifyPasswordMutation.isPending}
            >
              Entrar
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-4 pb-24">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">Admin</h1>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {["stats", "settings", "rdx", "send"].map((tab) => (
            <Button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`whitespace-nowrap ${
                activeTab === tab
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-slate-700 hover:bg-slate-600"
              }`}
            >
              {tab === "stats" && "Stats"}
              {tab === "settings" && "Settings"}
              {tab === "rdx" && "RDX"}
              {tab === "send" && "Send"}
            </Button>
          ))}
        </div>

        {activeTab === "stats" && (
          <Card className="bg-slate-800 border-slate-700 p-6">
            <h2 className="text-xl font-bold text-white mb-4">Stats</h2>
            <div className="space-y-4">
              <div className="bg-slate-900 p-4 rounded">
                <p className="text-slate-400 text-sm">Users</p>
                <p className="text-2xl font-bold text-green-400">{stats?.totalUsers || 0}</p>
              </div>
              <div className="bg-slate-900 p-4 rounded">
                <p className="text-slate-400 text-sm">USDT</p>
                <p className="text-2xl font-bold text-cyan-400">{stats?.totalDeposited || "0"}</p>
              </div>
            </div>
          </Card>
        )}

        {activeTab === "settings" && (
          <div className="space-y-4">
            <Button
              onClick={() => toggleDepositsMutation.mutateAsync({ password, enabled: false })}
              className="w-full bg-red-600 hover:bg-red-700"
              disabled={toggleDepositsMutation.isPending}
            >
              Toggle Deposits
            </Button>
            <Button
              onClick={() => toggleWithdrawsMutation.mutateAsync({ password, enabled: false })}
              className="w-full bg-red-600 hover:bg-red-700"
              disabled={toggleWithdrawsMutation.isPending}
            >
              Toggle Withdraws
            </Button>
            <Button
              onClick={() => toggleConversionsMutation.mutateAsync({ password, enabled: false })}
              className="w-full bg-red-600 hover:bg-red-700"
              disabled={toggleConversionsMutation.isPending}
            >
              Toggle Conversions
            </Button>
          </div>
        )}

        {activeTab === "rdx" && (
          <div className="space-y-4">
            <Card className="bg-slate-800 border-slate-700 p-6">
              <h3 className="text-lg font-bold text-white mb-4">Burn RDX</h3>
              <div className="space-y-3">
                <Input
                  type="number"
                  placeholder="Amount"
                  value={rdxAmount}
                  onChange={(e) => setRdxAmount(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
                <Button
                  onClick={handleBurnRdx}
                  className="w-full bg-red-600 hover:bg-red-700"
                  disabled={burnRdxMutation.isPending}
                >
                  Burn
                </Button>
              </div>
            </Card>

            <Card className="bg-slate-800 border-slate-700 p-6">
              <h3 className="text-lg font-bold text-white mb-4">Add RDX</h3>
              <div className="space-y-3">
                <Input
                  type="number"
                  placeholder="Amount"
                  value={rdxAmount}
                  onChange={(e) => setRdxAmount(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
                <Button
                  onClick={handleAddRdx}
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={addRdxMutation.isPending}
                >
                  Add
                </Button>
              </div>
            </Card>
          </div>
        )}

        {activeTab === "send" && (
          <Card className="bg-slate-800 border-slate-700 p-6">
            <h3 className="text-lg font-bold text-white mb-4">Send RDX</h3>
            <div className="space-y-3">
              <Input
                type="number"
                placeholder="User ID"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
              <Input
                type="number"
                placeholder="Amount"
                value={sendAmount}
                onChange={(e) => setSendAmount(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
              <Button
                onClick={handleSendRdx}
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={sendRdxMutation.isPending}
              >
                Send
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
