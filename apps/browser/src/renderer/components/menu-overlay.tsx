import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { Printer, Search, Settings, Star, ZoomIn, ZoomOut } from "lucide-react";
import { useI18n } from "../i18n/i18n-context";

interface MenuOverlayProps {
  theme: "light" | "dark";
  currentUrl: string;
  currentTitle: string;
  onClose: () => void;
  onOpenFind: () => void;
  onOpenSettings: () => void;
}

function MenuOverlay({
  theme,
  currentUrl,
  currentTitle,
  onClose,
  onOpenFind,
  onOpenSettings,
}: MenuOverlayProps) {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const isDark = theme === "dark";
  const { t } = useI18n();

  useEffect(() => {
    checkBookmarkStatus();
  }, [currentUrl]);

  const checkBookmarkStatus = async () => {
    if (!currentUrl || currentUrl.startsWith("file://")) {
      setIsBookmarked(false);
      return;
    }

    try {
      const bookmarked = await window.electronAPI?.bookmarks?.isBookmarked(currentUrl);
      setIsBookmarked(bookmarked || false);
    } catch (error) {
      console.error("Failed to check bookmark status:", error);
      setIsBookmarked(false);
    }
  };

  const handleToggleBookmark = async () => {
    if (!currentUrl || currentUrl.startsWith("file://")) {
      return;
    }

    try {
      if (isBookmarked) {
        await window.electronAPI?.bookmarks?.removeByUrl(currentUrl);
        setIsBookmarked(false);
      } else {
        // Get high-resolution favicon
        let favicon: string | undefined;
        try {
          const domain = new URL(currentUrl).origin;
          // Try Google's high-res favicon service first (128x128)
          favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
        } catch {
          favicon = undefined;
        }

        await window.electronAPI?.bookmarks?.add(
          currentTitle || "Untitled",
          currentUrl,
          favicon
        );
        setIsBookmarked(true);
      }
    } catch (error) {
      console.error("Failed to toggle bookmark:", error);
    }
  };

  const handleSettingsClick = () => {
    onClose();
    onOpenSettings();
  };

  const runPageTool = (action: () => void) => {
    action();
    onClose();
  };

  const isBlankPage = currentUrl.startsWith("file://") && currentUrl.includes("blank-page.html");

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end pt-16 pr-6"
      onClick={onClose}
    >
      <div
        className={`min-w-[200px] rounded-xl shadow-2xl overflow-hidden backdrop-blur-[40px] backdrop-saturate-[180%] ${
          isDark
            ? "bg-[rgba(40,40,40,0.95)] text-white"
            : "bg-[rgba(255,255,255,0.95)] text-black"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="py-2">
          {!isBlankPage && (
            <>
              <MenuButton isDark={isDark} onClick={handleToggleBookmark}>
                <Star
                  size={18}
                  strokeWidth={2}
                  fill={isBookmarked ? "currentColor" : "none"}
                />
                {isBookmarked ? t("removeFromFavorites") : t("addToFavorites")}
              </MenuButton>
              <MenuButton isDark={isDark} onClick={() => runPageTool(onOpenFind)}>
                <Search size={18} strokeWidth={2} />
                {t("findInPage")}
              </MenuButton>
              <MenuButton
                isDark={isDark}
                onClick={() =>
                  runPageTool(() => window.electronAPI?.pageTools.zoomIn())
                }
              >
                <ZoomIn size={18} strokeWidth={2} />
                {t("zoomIn")}
              </MenuButton>
              <MenuButton
                isDark={isDark}
                onClick={() =>
                  runPageTool(() => window.electronAPI?.pageTools.zoomOut())
                }
              >
                <ZoomOut size={18} strokeWidth={2} />
                {t("zoomOut")}
              </MenuButton>
              <MenuButton
                isDark={isDark}
                onClick={() =>
                  runPageTool(() => window.electronAPI?.pageTools.zoomReset())
                }
              >
                <ZoomOut size={18} strokeWidth={2} />
                {t("resetZoom")}
              </MenuButton>
              <MenuButton
                isDark={isDark}
                onClick={() =>
                  runPageTool(() => window.electronAPI?.pageTools.print())
                }
              >
                <Printer size={18} strokeWidth={2} />
                {t("print")}
              </MenuButton>
            </>
          )}
          <button
            onClick={handleSettingsClick}
            className={`w-full px-4 py-3 flex items-center gap-3 transition-colors ${
              isDark
                ? "hover:bg-[rgba(255,255,255,0.1)]"
                : "hover:bg-[rgba(0,0,0,0.05)]"
            }`}
          >
            <Settings size={18} strokeWidth={2} />
            <span className="text-sm font-medium">{t("settings")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function MenuButton({
  children,
  isDark,
  onClick,
}: {
  children: ReactNode;
  isDark: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-3 flex items-center gap-3 transition-colors ${
        isDark
          ? "hover:bg-[rgba(255,255,255,0.1)]"
          : "hover:bg-[rgba(0,0,0,0.05)]"
      }`}
    >
      <span className="contents">{children}</span>
    </button>
  );
}

export default MenuOverlay;
