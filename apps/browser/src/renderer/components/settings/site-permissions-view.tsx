import { ChevronLeft, Shield, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "../../i18n/i18n-context";

interface SitePermissionsViewProps {
  isDark: boolean;
  onBack: () => void;
}

interface SitePermissionEntry {
  decision: "allow" | "block";
  origin: string;
  permission: string;
}

export function SitePermissionsView({
  isDark,
  onBack,
}: SitePermissionsViewProps) {
  const { t } = useI18n();
  const [items, setItems] = useState<SitePermissionEntry[]>([]);

  const load = async () => {
    const permissions = await window.electronAPI?.permissions.list();
    setItems(permissions ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const clearAll = async () => {
    const nextItems = await window.electronAPI?.permissions.clear();
    setItems(nextItems ?? []);
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
          {t("sitePermissions")}
        </h2>
        <button
          onClick={clearAll}
          className={`p-2 rounded-lg transition-colors ${
            isDark ? "hover:bg-zinc-800 text-white" : "hover:bg-zinc-200"
          }`}
          title={t("clear")}
        >
          <Trash2 size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {items.length === 0 ? (
          <div
            className={`py-16 text-center ${
              isDark ? "text-zinc-500" : "text-zinc-600"
            }`}
          >
            <Shield size={48} className="mx-auto mb-3 opacity-60" />
            {t("noSitePermissions")}
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={`${item.origin}-${item.permission}`}
                className={`px-4 py-3 rounded-xl ${
                  isDark ? "bg-zinc-800" : "bg-white"
                }`}
              >
                <div
                  className={`text-sm font-medium truncate ${
                    isDark ? "text-white" : "text-zinc-900"
                  }`}
                >
                  {item.origin}
                </div>
                <div
                  className={`text-xs ${
                    isDark ? "text-zinc-400" : "text-zinc-600"
                  }`}
                >
                  {item.permission}: {item.decision}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
