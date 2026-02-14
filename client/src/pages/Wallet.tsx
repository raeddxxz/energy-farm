import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Copy, Check } from "lucide-react";

export default function Wallet() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"balance" | "deposit" | "withdraw" | "convert" | "history">("balance");
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [convertAmount, setConvertAmount] = useState("");
  const [convertFrom, setConvertFrom] = useState<"USDT" | "RDX">("USDT");
  const [generatedDepositAddr, setGeneratedDepositAddr] = useState<string | null>(null);
  const [copiedAddr, setCopiedAddr] = useState(false);

  const { data: balance, refetch: refetchBalance } = trpc.wallet.getBalance.useQuery();
  const { data: rdxBalance, refetch: refetchRdx } = trpc.rdx.getBalance.useQuery();
  const { data: rdxPrice } = trpc.rdx.getPrice.useQuery();
  const { data: transactions } = trpc.wallet.getTransactions.useQuery();
  const depositMutation = trpc.wallet.deposit.useMutation();
  const withdrawMutation = trpc.wallet.withdraw.useMutation();
  const convertMutation = trpc.rdx.convert.useMutation();

  const handleDeposit = async () => {
    if (!depositAmount) {
      toast.error("Preencha a quantidade");
      return;
    }

    try {
      const result = await depositMutation.mutateAsync({
        amount: depositAmount,
      });
      setGeneratedDepositAddr(result.depositAddress);
      toast.success("Endereco gerado! Deposite USDT/TON para este endereco");
      setDepositAmount("");
    } catch (error: any) {
      toast.error(error.message || "Erro ao gerar endereco");
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
      toast.success("Saque solicitado! Transferindo para sua carteira...");
      setWithdrawAmount("");
      setWithdrawAddress("");
      refetchBalance();
    } catch (error: any) {
      toast.error(error.message || "Erro ao processar saque");
    }
  };

  const handleConvert = async () => {
    if (!convertAmount) {
      toast.error("Preencha a quantidade");
      return;
    }

    try {
      const result = await convertMutation.mutateAsync({
        fromCurrency: convertFrom,
        amount: convertAmount,
      });
      toast.success(`Conversao realizada! Taxa: ${result.fee || result.fee}`);
      setConvertAmount("");
      refetchBalance();
      refetchRdx();
    } catch (error: any) {
      toast.error(error.message || "Erro ao converter");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddr(true);
    setTimeout(() => setCopiedAddr(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 pb-32">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 pt-4">
          <h1 className="text-3xl font-bold text-white mb-4">Carteira</h1>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Card className="bg-slate-800 border-slate-700 p-4 text-center">
              <p className="text-slate-400 text-sm mb-2">USDT</p>
              <p className="text-2xl font-bold text-green-400">{balance || "0"}</p>
            </Card>
            <Card className="bg-slate-800 border-slate-700 p-4 text-center">
              <p className="text-slate-400 text-sm mb-2">RDX</p>
              <p className="text-2xl font-bold text-blue-400">{rdxBalance || "0"}</p>
              <p className="text-xs text-slate-500 mt-1">${rdxPrice || "0.001"}</p>
            </Card>
          </div>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto">
          {["balance", "deposit", "withdraw", "convert", "history"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
                activeTab === tab
                  ? "bg-blue-600 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              {tab === "balance" && "Saldo"}
              {tab === "deposit" && "Depositar"}
              {tab === "withdraw" && "Sacar"}
              {tab === "convert" && "Converter"}
              {tab === "history" && "Historico"}
            </button>
          ))}
        </div>

        {activeTab === "balance" && (
          <Card className="bg-slate-800 border-slate-700 p-8 text-center space-y-6">
            <div>
              <p className="text-slate-400 mb-2">Saldo USDT</p>
              <p className="text-5xl font-bold text-green-400">{balance || "0"}</p>
            </div>
            <div>
              <p className="text-slate-400 mb-2">Saldo RDX</p>
              <p className="text-5xl font-bold text-blue-400">{rdxBalance || "0"}</p>
              <p className="text-lg text-slate-400 mt-2">Preco: ${rdxPrice || "0.001"}</p>
            </div>
          </Card>
        )}

        {activeTab === "deposit" && (
          <Card className="bg-slate-800 border-slate-700 p-6 space-y-4">
            <h2 className="text-xl font-semibold text-white">Depositar USDT</h2>
            
            {!generatedDepositAddr ? (
              <>
                <div>
                  <label className="block text-slate-300 text-sm mb-2">Quantidade USDT para Depositar</label>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  />
                </div>
                <Button
                  onClick={handleDeposit}
                  disabled={depositMutation.isPending}
                  className="w-full"
                >
                  {depositMutation.isPending ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    "Gerar Endereco de Deposito"
                  )}
                </Button>
              </>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-900 border border-green-700 rounded-lg p-4">
                  <p className="text-green-200 text-sm mb-2">Endereco gerado com sucesso!</p>
                  <div className="bg-slate-900 p-3 rounded-lg flex items-center justify-between">
                    <code className="text-green-400 text-xs break-all">{generatedDepositAddr}</code>
                    <button
                      onClick={() => copyToClipboard(generatedDepositAddr)}
                      className="ml-2 p-2 hover:bg-slate-700 rounded transition"
                    >
                      {copiedAddr ? (
                        <Check size={16} className="text-green-400" />
                      ) : (
                        <Copy size={16} className="text-slate-400" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-3 text-yellow-200 text-sm">
                  Deposite USDT (BEP20) ou TON para este endereco. Assim que receber, seu saldo sera atualizado automaticamente.
                </div>
                <Button
                  onClick={() => setGeneratedDepositAddr(null)}
                  variant="outline"
                  className="w-full"
                >
                  Novo Deposito
                </Button>
              </div>
            )}
          </Card>
        )}

        {activeTab === "withdraw" && (
          <Card className="bg-slate-800 border-slate-700 p-6 space-y-4">
            <h2 className="text-xl font-semibold text-white">Sacar USDT</h2>
            <div>
              <label className="block text-slate-300 text-sm mb-2">Quantidade para Sacar</label>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-slate-300 text-sm mb-2">Seu Endereco para Receber</label>
              <input
                type="text"
                value={withdrawAddress}
                onChange={(e) => setWithdrawAddress(e.target.value)}
                placeholder="Seu endereco..."
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              />
            </div>
            <div className="bg-blue-900 border border-blue-700 rounded-lg p-3 text-blue-200 text-sm">
              O saque sera processado automaticamente e transferido para seu endereco.
            </div>
            <Button
              onClick={handleWithdraw}
              disabled={withdrawMutation.isPending}
              className="w-full"
            >
              {withdrawMutation.isPending ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                "Confirmar Saque"
              )}
            </Button>
          </Card>
        )}

        {activeTab === "convert" && (
          <Card className="bg-slate-800 border-slate-700 p-6 space-y-4">
            <h2 className="text-xl font-semibold text-white">Converter USDT ↔ RDX</h2>
            <div>
              <label className="block text-slate-300 text-sm mb-2">De:</label>
              <select
                value={convertFrom}
                onChange={(e) => setConvertFrom(e.target.value as "USDT" | "RDX")}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              >
                <option value="USDT">USDT</option>
                <option value="RDX">RDX</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-300 text-sm mb-2">Quantidade</label>
              <input
                type="number"
                value={convertAmount}
                onChange={(e) => setConvertAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              />
            </div>
            <div className="bg-slate-700 p-3 rounded-lg text-slate-300 text-sm">
              <p>Taxa de conversao: 1%</p>
              <p className="text-xs text-slate-500 mt-1">Preco RDX: ${rdxPrice || "0.001"}</p>
            </div>
            <Button
              onClick={handleConvert}
              disabled={convertMutation.isPending}
              className="w-full"
            >
              {convertMutation.isPending ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                `Converter ${convertFrom}`
              )}
            </Button>
          </Card>
        )}

        {activeTab === "history" && (
          <Card className="bg-slate-800 border-slate-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Historico de Transacoes</h2>
            {transactions && transactions.length > 0 ? (
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex justify-between items-center p-3 bg-slate-700 rounded-lg">
                    <div>
                      <p className="text-white font-medium">
                        {tx.type === "deposit" ? "+" : "-"} {tx.amount} USDT
                      </p>
                      <p className="text-slate-400 text-sm">{new Date(tx.createdAt).toLocaleString()}</p>
                    </div>
                    <span className={`px-3 py-1 rounded text-sm font-medium ${
                      tx.status === "approved" ? "bg-green-900 text-green-200" :
                      tx.status === "pending" ? "bg-yellow-900 text-yellow-200" :
                      "bg-red-900 text-red-200"
                    }`}>
                      {tx.status === "approved" && "Aprovado"}
                      {tx.status === "pending" && "Pendente"}
                      {tx.status === "rejected" && "Recusado"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400">Nenhuma transacao</p>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
