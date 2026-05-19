import { ChevronLeft, Info } from "lucide-react";
import { useI18n } from "../../i18n/i18n-context";

interface AboutViewProps {
  appIconPath: string;
  appVersion: string;
  isDark: boolean;
  onBack: () => void;
}

export function AboutView({
  appIconPath,
  appVersion,
  isDark,
  onBack,
}: AboutViewProps) {
  const { t } = useI18n();

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
          {t("about")}
        </h2>
        <div className="w-20" />
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          <div className="flex flex-col items-center py-8">
            <div className="w-24 h-24 rounded-3xl overflow-hidden mb-4 shadow-lg">
              {appIconPath ? (
                <img
                  src={appIconPath}
                  alt="Aka Browser"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className={`w-full h-full flex items-center justify-center ${
                    isDark ? "bg-zinc-800" : "bg-zinc-200"
                  }`}
                >
                  <Info
                    size={48}
                    className={isDark ? "text-zinc-400" : "text-zinc-600"}
                  />
                </div>
              )}
            </div>
            <h3
              className={`text-2xl font-bold mb-2 ${
                isDark ? "text-white" : "text-zinc-900"
              }`}
            >
              Aka Browser
            </h3>
            <p
              className={`text-sm ${
                isDark ? "text-zinc-400" : "text-zinc-600"
              }`}
            >
              {t("version")} {appVersion}
            </p>
          </div>

          <div>
            <div
              className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider ${
                isDark ? "text-zinc-500" : "text-zinc-600"
              }`}
            >
              {t("information")}
            </div>
            <div
              className={`rounded-xl overflow-hidden ${
                isDark ? "bg-zinc-800" : "bg-white"
              }`}
            >
              <InfoRow isDark={isDark} label={t("name")} value="Aka Browser" />
              <Divider isDark={isDark} />
              <InfoRow isDark={isDark} label={t("version")} value={appVersion} />
              <Divider isDark={isDark} />
              <InfoRow
                isDark={isDark}
                label={t("description")}
                value={t("appDescription")}
                wrap
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Divider({ isDark }: { isDark: boolean }) {
  return (
    <div className={`h-px mx-4 ${isDark ? "bg-zinc-700" : "bg-zinc-200"}`} />
  );
}

function InfoRow({
  isDark,
  label,
  value,
  wrap,
}: {
  isDark: boolean;
  label: string;
  value: string;
  wrap?: boolean;
}) {
  return (
    <div className="px-4 py-3">
      <div className="flex justify-between items-center">
        <span className={`text-sm ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
          {label}
        </span>
        <span
          className={`text-sm font-medium ${
            wrap ? "text-right max-w-[60%]" : ""
          } ${isDark ? "text-white" : "text-zinc-900"}`}
        >
          {value}
        </span>
      </div>
    </div>
  );
}
