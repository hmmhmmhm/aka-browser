import { useState, useEffect } from "react";
import { Star, Settings } from "lucide-react";

interface MenuOverlayProps {
  theme: "light" | "dark";
  currentUrl: string;
  currentTitle: string;
  onClose: () => void;
  onOpenSettings: () => void;
}

function MenuOverlay({
  theme,
  currentUrl,
  currentTitle,
  onClose,
  onOpenSettings,
}: MenuOverlayProps) {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const isDark = theme === "dark";

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
            <button
              onClick={handleToggleBookmark}
              className={`w-full px-4 py-3 flex items-center gap-3 transition-colors ${
                isDark
                  ? "hover:bg-[rgba(255,255,255,0.1)]"
                  : "hover:bg-[rgba(0,0,0,0.05)]"
              }`}
            >
              <Star
                size={18}
                strokeWidth={2}
                fill={isBookmarked ? "currentColor" : "none"}
              />
              <span className="text-sm font-medium">
                {isBookmarked ? "Remove from Favorites" : "Add to Favorites"}
              </span>
            </button>
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
            <span className="text-sm font-medium">Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default MenuOverlay;
