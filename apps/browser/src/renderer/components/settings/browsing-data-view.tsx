import { ChevronLeft, Database } from "lucide-react";
import { useState } from "react";
import { useI18n } from "../../i18n/i18n-context";

interface BrowsingDataViewProps {
  isDark: boolean;
  onBack: () => void;
}

type ClearAction = {
  action: () => Promise<any>;
  id: string;
  label: string;
};

export function BrowsingDataView({ isDark, onBack }: BrowsingDataViewProps) {
  const { t } = useI18n();
  const [message, setMessage] = useState("");
  const [runningId, setRunningId] = useState<string | null>(null);

  const actions: ClearAction[] = [
    {
      action: () => window.electronAPI!.browsingData.clearHistory(),
      id: "history",
      label: t("clearHistory"),
    },
    {
      action: () => window.electronAPI!.browsingData.clearCookies(),
      id: "cookies",
      label: t("clearCookies"),
    },
    {
      action: () => window.electronAPI!.browsingData.clearCache(),
      id: "cache",
      label: t("clearCache"),
    },
    {
      action: () => window.electronAPI!.browsingData.clearSiteData(),
      id: "site-data",
      label: t("clearSiteData"),
    },
    {
      action: () => window.electronAPI!.browsingData.clearAll(),
      id: "all",
      label: t("clearAllBrowsingData"),
    },
  ];

  const runAction = async (clearAction: ClearAction) => {
    setRunningId(clearAction.id);
    setMessage("");
    try {
      const result = await clearAction.action();
      const results = Array.isArray(result) ? result : [result];
      const failed = results.filter((item) => !item.ok);
      setMessage(failed.length > 0 ? t("clearDataFailed") : t("clearDataDone"));
    } catch {
      setMessage(t("clearDataFailed"));
    } finally {
      setRunningId(null);
    }
  };

  return (
    <>
      <div
        className={`flex items-center justify-between px-6 py-4 border-b ${
          isDark ? "border-zinc-700" : "border-zinc-300"
        }`}
      >
        <button
          onClick={onBack}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors font-medium text-sm ${
            isDark
              ? "hover:bg-zinc-800 text-white"
              : "hover:bg-zinc-200 text-zinc-900"
          }`}
        >
          <ChevronLeft size={20} />
          {t("back")}
        </button>
        <h2
          className={`text-xl font-semibold ${
            isDark ? "text-white" : "text-zinc-900"
          }`}
        >
          {t("browsingData")}
        </h2>
        <div className="w-[72px]" />
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-2">
          {actions.map((item) => (
            <button
              key={item.id}
              onClick={() => runAction(item)}
              disabled={runningId !== null}
              className={`w-full px-4 py-3 flex items-center gap-3 rounded-xl transition-colors ${
                isDark
                  ? "bg-zinc-800 hover:bg-zinc-700 text-white disabled:text-zinc-500"
                  : "bg-white hover:bg-zinc-50 text-zinc-900 disabled:text-zinc-400"
              }`}
            >
              <Database size={18} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </div>

        {message && (
          <p
            className={`mt-4 text-sm ${
              isDark ? "text-zinc-400" : "text-zinc-600"
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </>
  );
}
