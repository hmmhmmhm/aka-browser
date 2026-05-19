import { ChevronLeft, Download, FolderOpen, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "../../i18n/i18n-context";

interface DownloadsViewProps {
  isDark: boolean;
  onBack: () => void;
}

interface DownloadItem {
  filename: string;
  id: string;
  receivedBytes: number;
  savePath: string;
  state: "active" | "cancelled" | "completed" | "interrupted";
  totalBytes: number;
}

export function DownloadsView({ isDark, onBack }: DownloadsViewProps) {
  const { t } = useI18n();
  const [items, setItems] = useState<DownloadItem[]>([]);

  useEffect(() => {
    window.electronAPI?.downloads.list().then(setItems);
    const cleanup = window.electronAPI?.downloads.onUpdated(setItems);
    return () => cleanup?.();
  }, []);

  const clearCompleted = async () => {
    const nextItems = await window.electronAPI?.downloads.clearCompleted();
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
          {t("downloads")}
        </h2>
        <button
          onClick={clearCompleted}
          className={`p-2 rounded-lg transition-colors ${
            isDark ? "hover:bg-zinc-800 text-white" : "hover:bg-zinc-200"
          }`}
          title={t("clearCompleted")}
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
            <Download size={48} className="mx-auto mb-3 opacity-60" />
            {t("noDownloads")}
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className={`px-4 py-3 rounded-xl ${
                  isDark ? "bg-zinc-800" : "bg-white"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div
                      className={`text-sm font-medium truncate ${
                        isDark ? "text-white" : "text-zinc-900"
                      }`}
                    >
                      {item.filename}
                    </div>
                    <div
                      className={`text-xs ${
                        isDark ? "text-zinc-400" : "text-zinc-600"
                      }`}
                    >
                      {formatDownloadStatus(item)}
                    </div>
                  </div>
                  {item.state === "completed" && (
                    <button
                      onClick={() =>
                        window.electronAPI?.downloads.openInFolder(item.id)
                      }
                      className={`p-2 rounded-lg ${
                        isDark ? "hover:bg-zinc-700" : "hover:bg-zinc-100"
                      }`}
                      title={t("openInFolder")}
                    >
                      <FolderOpen size={18} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function formatDownloadStatus(item: DownloadItem): string {
  if (item.state !== "active") return item.state;
  if (item.totalBytes <= 0) return `${item.receivedBytes} bytes`;
  return `${Math.round((item.receivedBytes / item.totalBytes) * 100)}%`;
}
