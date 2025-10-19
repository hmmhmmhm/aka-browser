import { useState, useEffect } from "react";
import { Info, Globe, ChevronRight, ChevronLeft } from "lucide-react";

interface SettingsProps {
  theme: "light" | "dark";
  orientation: "portrait" | "landscape";
  onClose: () => void;
}

interface SettingsSection {
  id: string;
  title: string;
  items: SettingsItem[];
}

interface SettingsItem {
  id: string;
  label: string;
  value?: string;
  icon?: React.ReactNode;
  hasDetail?: boolean;
  onClick?: () => void;
}

function Settings({ theme, orientation, onClose }: SettingsProps) {
  const [currentView, setCurrentView] = useState<"main" | "about">("main");
  const [appVersion, setAppVersion] = useState<string>("0.0.0");

  useEffect(() => {
    // Get app version
    window.electronAPI?.getAppVersion().then((version: string) => {
      setAppVersion(version);
    });
  }, []);

  const isDark = theme === "dark";

  const settingsSections: SettingsSection[] = [
    {
      id: "general",
      title: "General",
      items: [
        {
          id: "about",
          label: "About",
          value: "Aka Browser",
          icon: <Info size={20} />,
          hasDetail: true,
          onClick: () => setCurrentView("about"),
        },
      ],
    },
  ];

  const renderMainView = () => (
    <>
      {/* Header */}
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
          Settings
        </h2>
        <button
          onClick={onClose}
          className={`px-4 py-2 rounded-lg transition-colors font-medium text-sm ${
            isDark
              ? "hover:bg-zinc-800 text-white"
              : "hover:bg-zinc-200 text-zinc-900"
          }`}
        >
          Done
        </button>
      </div>

      {/* Settings List */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          {settingsSections.map((section) => (
            <div key={section.id}>
              {/* Section Title */}
              <div
                className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider ${
                  isDark ? "text-zinc-500" : "text-zinc-600"
                }`}
              >
                {section.title}
              </div>

              {/* Section Items */}
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
                            className={isDark ? "text-zinc-400" : "text-zinc-600"}
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
                            className={isDark ? "text-zinc-500" : "text-zinc-400"}
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

  const renderAboutView = () => (
    <>
      {/* Header */}
      <div
        className={`flex items-center justify-between px-6 py-4 border-b ${
          isDark ? "border-zinc-700" : "border-zinc-300"
        }`}
      >
        <button
          onClick={() => setCurrentView("main")}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors font-medium text-sm ${
            isDark
              ? "hover:bg-zinc-800 text-white"
              : "hover:bg-zinc-200 text-zinc-900"
          }`}
        >
          <ChevronLeft size={20} />
          Back
        </button>
        <h2
          className={`text-xl font-semibold ${
            isDark ? "text-white" : "text-zinc-900"
          }`}
        >
          About
        </h2>
        <div className="w-20"></div>
      </div>

      {/* About Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          {/* App Icon and Name */}
          <div className="flex flex-col items-center py-8">
            <div
              className={`w-24 h-24 rounded-3xl flex items-center justify-center mb-4 ${
                isDark ? "bg-zinc-800" : "bg-zinc-200"
              }`}
            >
              <Globe
                size={48}
                className={isDark ? "text-zinc-400" : "text-zinc-600"}
              />
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
              Version {appVersion}
            </p>
          </div>

          {/* Info Section */}
          <div>
            <div
              className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider ${
                isDark ? "text-zinc-500" : "text-zinc-600"
              }`}
            >
              Information
            </div>
            <div
              className={`rounded-xl overflow-hidden ${
                isDark ? "bg-zinc-800" : "bg-white"
              }`}
            >
              <div className="px-4 py-3">
                <div className="flex justify-between items-center mb-2">
                  <span
                    className={`text-sm ${
                      isDark ? "text-zinc-400" : "text-zinc-600"
                    }`}
                  >
                    Name
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      isDark ? "text-white" : "text-zinc-900"
                    }`}
                  >
                    Aka Browser
                  </span>
                </div>
              </div>
              <div
                className={`h-px mx-4 ${
                  isDark ? "bg-zinc-700" : "bg-zinc-200"
                }`}
              />
              <div className="px-4 py-3">
                <div className="flex justify-between items-center mb-2">
                  <span
                    className={`text-sm ${
                      isDark ? "text-zinc-400" : "text-zinc-600"
                    }`}
                  >
                    Version
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      isDark ? "text-white" : "text-zinc-900"
                    }`}
                  >
                    {appVersion}
                  </span>
                </div>
              </div>
              <div
                className={`h-px mx-4 ${
                  isDark ? "bg-zinc-700" : "bg-zinc-200"
                }`}
              />
              <div className="px-4 py-3">
                <div className="flex justify-between items-center">
                  <span
                    className={`text-sm ${
                      isDark ? "text-zinc-400" : "text-zinc-600"
                    }`}
                  >
                    Description
                  </span>
                  <span
                    className={`text-sm font-medium text-right max-w-[60%] ${
                      isDark ? "text-white" : "text-zinc-900"
                    }`}
                  >
                    A lightweight, elegant web browser
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div
      className={`absolute inset-0 z-50 flex flex-col ${
        isDark ? "bg-zinc-900" : "bg-zinc-100"
      }`}
      onClick={(e) => {
        // Only close if clicking the background
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {currentView === "main" ? renderMainView() : renderAboutView()}
    </div>
  );
}

export default Settings;
