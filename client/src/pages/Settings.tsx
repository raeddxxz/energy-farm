import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { LANGUAGES, Language } from "@shared/translations";
import { useLocation } from "wouter";

export default function Settings() {
  const { t, language, setLanguage } = useLanguage();
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 pb-32">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 pt-4">
          <h1 className="text-3xl font-bold text-white mb-2">{t("settings.title")}</h1>
        </div>

        <div className="space-y-4">
          <Card className="bg-slate-800 border-slate-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">{t("settings.language")}</h2>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(LANGUAGES) as [Language, string][]).map(([lang, name]) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    language === lang
                      ? "bg-blue-600 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </Card>

          {user?.role === "admin" && (
            <Card className="bg-slate-800 border-slate-700 p-6">
              <button
                onClick={() => navigate("/admin")}
                className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition"
              >
                {t("settings.admin")}
              </button>
            </Card>
          )}

          <Card className="bg-slate-800 border-slate-700 p-6">
            <button
              onClick={handleLogout}
              className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition"
            >
              {t("settings.logout")}
            </button>
          </Card>
        </div>
      </div>
    </div>
  );
}
