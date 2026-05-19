import { ChevronRight } from "lucide-react";
import { useI18n } from "../../i18n/i18n-context";
import { SettingsSection } from "./types";

interface MainViewProps {
  isDark: boolean;
  onClose: () => void;
  sections: SettingsSection[];
}

export function MainView({ isDark, onClose, sections }: MainViewProps) {
  const { t } = useI18n();

  return (
    <>
      <div
        className={`flex items-center justify-between px-6 py-4 border-b ${
          isDark ? "border-zinc-700" : "border-zinc-300"
        }`}
      >
        <h2
          className={`text-xl font-semibold ${
            isDark ? "text-white" : "text-zinc-900"
          }`}
        >
          {t("settings")}
        </h2>
        <button
          onClick={onClose}
          className={`px-4 py-2 rounded-lg transition-colors font-medium text-sm ${
            isDark
              ? "hover:bg-zinc-800 text-white"
              : "hover:bg-zinc-200 text-zinc-900"
          }`}
        >
          {t("done")}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          {sections.map((section) => (
            <div key={section.id}>
              <div
                className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider ${
                  isDark ? "text-zinc-500" : "text-zinc-600"
                }`}
              >
                {section.title}
              </div>

              <div
                className={`rounded-xl overflow-hidden ${
                  isDark ? "bg-zinc-800" : "bg-white"
                }`}
              >
                {section.items.map((item, index) => (
                  <div key={item.id}>
                    {index > 0 && (
                      <div
                        className={`h-px mx-4 ${
                          isDark ? "bg-zinc-700" : "bg-zinc-200"
                        }`}
                      />
                    )}
                    <button
                      onClick={item.onClick}
                      className={`w-full px-4 py-3 flex items-center justify-between transition-colors ${
                        item.hasDetail
                          ? isDark
                            ? "hover:bg-zinc-700"
                            : "hover:bg-zinc-50"
                          : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {item.icon && (
                          <div
                            className={
                              isDark ? "text-zinc-400" : "text-zinc-600"
                            }
                          >
                            {item.icon}
                          </div>
                        )}
                        <span
                          className={`font-medium ${
                            isDark ? "text-white" : "text-zinc-900"
                          }`}
                        >
                          {item.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.value && (
                          <span
                            className={`text-sm ${
                              isDark ? "text-zinc-400" : "text-zinc-600"
                            }`}
                          >
                            {item.value}
                          </span>
                        )}
                        {item.hasDetail && (
                          <ChevronRight
                            size={20}
                            className={
                              isDark ? "text-zinc-500" : "text-zinc-400"
                            }
                          />
                        )}
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
