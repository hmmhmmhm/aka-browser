import { ChevronLeft, Check } from "lucide-react";
import { languageOptions, useI18n } from "../../i18n/i18n-context";

interface LanguageViewProps {
  isDark: boolean;
  onBack: () => void;
}

export function LanguageView({ isDark, onBack }: LanguageViewProps) {
  const { preferredLanguage, setPreferredLanguage, t } = useI18n();

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
          {t("language")}
        </h2>
        <div className="w-20" />
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className={`rounded-xl overflow-hidden ${isDark ? "bg-zinc-800" : "bg-white"}`}>
          {languageOptions.map((option, index) => (
            <div key={option.code}>
              {index > 0 && (
                <div className={`h-px mx-4 ${isDark ? "bg-zinc-700" : "bg-zinc-200"}`} />
              )}
              <button
                onClick={() => setPreferredLanguage(option.code)}
                className={`w-full px-4 py-3 flex items-center justify-between transition-colors ${
                  isDark ? "hover:bg-zinc-700" : "hover:bg-zinc-50"
                }`}
              >
                <div className="text-left">
                  <div className={`font-medium ${isDark ? "text-white" : "text-zinc-900"}`}>
                    {option.code === "system"
                      ? t("systemDefault")
                      : option.nativeName}
                  </div>
                  <div className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
                    {t("englishName")}: {option.englishName}
                  </div>
                </div>
                {preferredLanguage === option.code && (
                  <Check size={18} className="text-blue-500" />
                )}
              </button>
            </div>
          ))}
        </div>

        <a
          href="https://github.com/hmmhmmhm/aka-browser/blob/main/docs/TRANSLATING.md"
          className={`block text-sm underline ${
            isDark ? "text-blue-300" : "text-blue-700"
          }`}
        >
          {t("contributionHelp")}
        </a>
      </div>
    </>
  );
}
