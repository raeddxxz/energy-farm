import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { Home, ShoppingCart, Wallet, Settings, Users } from "lucide-react";

export default function BottomNav() {
  const [location, navigate] = useLocation();
  const { t } = useLanguage();

  const navItems = [
    { path: "/", label: t("nav.principal"), icon: Home },
    { path: "/shop", label: t("nav.loja"), icon: ShoppingCart },
    { path: "/wallet", label: t("nav.carteira"), icon: Wallet },
    { path: "/referral", label: t("referral.title"), icon: Users },
    { path: "/settings", label: t("nav.configuracoes"), icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 z-50">
      <div className="flex justify-around items-center h-20">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center w-full h-full gap-1 transition ${
                isActive
                  ? "text-blue-500 border-t-2 border-blue-500"
                  : "text-slate-400 hover:text-slate-300"
              }`}
            >
              <Icon size={24} />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
