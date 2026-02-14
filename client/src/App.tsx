import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import Wallet from "./pages/Wallet";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import BottomNav from "./components/BottomNav";
import { useAuth } from "./_core/hooks/useAuth";

function Router() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Energy Farm</h1>
          <p className="text-xl text-slate-300 mb-8">Sistema de Investimento em Energia</p>
          <a
            href="/api/oauth/login"
            className="inline-block px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
          >
            Entrar com Manus
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <Switch>
        <Route path={"/"} component={Home} />
        <Route path={"/shop"} component={Shop} />
        <Route path={"/wallet"} component={Wallet} />
        <Route path={"/settings"} component={Settings} />
        <Route path={"/admin"} component={Admin} />
        <Route path={"/404"} component={NotFound} />
        <Route component={NotFound} />
      </Switch>
      <BottomNav />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
