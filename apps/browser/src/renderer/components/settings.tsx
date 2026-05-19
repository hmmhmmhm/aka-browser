import { useEffect, useState } from "react";
import { Database, Info, Star } from "lucide-react";
import appIcon from "../../../assets/icon.png";
import { AboutView } from "./settings/about-view";
import { BookmarkDialog } from "./settings/bookmark-dialog";
import { BookmarksView } from "./settings/bookmarks-view";
import { BrowsingDataView } from "./settings/browsing-data-view";
import { LanguageView } from "./settings/language-view";
import { MainView } from "./settings/main-view";
import { Bookmark, SettingsSection, SettingsView } from "./settings/types";
import { useBookmarks } from "./settings/use-bookmarks";
import { useI18n } from "../i18n/i18n-context";

interface SettingsProps {
  theme: "light" | "dark";
  orientation: "portrait" | "landscape";
  onClose: () => void;
}

function Settings({ theme, orientation, onClose }: SettingsProps) {
  const [currentView, setCurrentView] = useState<SettingsView>("main");
  const [appVersion, setAppVersion] = useState("0.0.0");
  const [appIconPath, setAppIconPath] = useState("");
  const [showBookmarkDialog, setShowBookmarkDialog] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [bookmarkTitle, setBookmarkTitle] = useState("");
  const [bookmarkUrl, setBookmarkUrl] = useState("");
  const { allBookmarks, deleteBookmark } = useBookmarks();
  const isDark = theme === "dark";
  const { effectiveLanguage, preferredLanguage, t } = useI18n();

  useEffect(() => {
    window.electronAPI?.getAppVersion().then(setAppVersion);
    setAppIconPath(appIcon);
  }, []);

  const settingsSections: SettingsSection[] = [
    {
      id: "general",
      title: t("general"),
      items: [
        {
          id: "bookmarks",
          label: t("favorites"),
          value: t("favoritesCount", { count: allBookmarks.length }),
          icon: <Star size={20} />,
          hasDetail: true,
          onClick: () => setCurrentView("bookmarks"),
        },
        {
          id: "language",
          label: t("language"),
          value:
            preferredLanguage === "system"
              ? t("systemDefault")
              : effectiveLanguage.toUpperCase(),
          icon: <Info size={20} />,
          hasDetail: true,
          onClick: () => setCurrentView("language"),
        },
        {
          id: "browsing-data",
          label: t("browsingData"),
          icon: <Database size={20} />,
          hasDetail: true,
          onClick: () => setCurrentView("browsing-data"),
        },
        {
          id: "about",
          label: t("about"),
          value: "Aka Browser",
          icon: <Info size={20} />,
          hasDetail: true,
          onClick: () => setCurrentView("about"),
        },
      ],
    },
  ];

  const openAddBookmarkDialog = () => {
    setEditingBookmark(null);
    setBookmarkTitle("");
    setBookmarkUrl("");
    setShowBookmarkDialog(true);
  };

  const openEditBookmarkDialog = (bookmark: Bookmark) => {
    if (bookmark.id.startsWith("default-")) return;

    setEditingBookmark(bookmark);
    setBookmarkTitle(bookmark.title);
    setBookmarkUrl(bookmark.url);
    setShowBookmarkDialog(true);
  };

  const closeBookmarkDialog = () => {
    setShowBookmarkDialog(false);
    setEditingBookmark(null);
    setBookmarkTitle("");
    setBookmarkUrl("");
  };

  const saveBookmark = async () => {
    if (!bookmarkTitle.trim() || !bookmarkUrl.trim()) return;

    try {
      if (editingBookmark) {
        await window.electronAPI?.bookmarks?.update(editingBookmark.id, {
          title: bookmarkTitle.trim(),
          url: bookmarkUrl.trim(),
        });
      } else {
        await window.electronAPI?.bookmarks?.add(
          bookmarkTitle.trim(),
          bookmarkUrl.trim()
        );
      }
      closeBookmarkDialog();
    } catch (error) {
      console.error("Failed to save bookmark:", error);
    }
  };

  return (
    <div
      className={`absolute inset-0 z-50 flex flex-col ${
        isDark ? "bg-zinc-900" : "bg-zinc-100"
      }`}
      data-orientation={orientation}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {currentView === "main" && (
        <MainView
          isDark={isDark}
          onClose={onClose}
          sections={settingsSections}
        />
      )}
      {currentView === "about" && (
        <AboutView
          appIconPath={appIconPath}
          appVersion={appVersion}
          isDark={isDark}
          onBack={() => setCurrentView("main")}
        />
      )}
      {currentView === "bookmarks" && (
        <BookmarksView
          bookmarks={allBookmarks}
          isDark={isDark}
          onAdd={openAddBookmarkDialog}
          onBack={() => setCurrentView("main")}
          onDelete={deleteBookmark}
          onEdit={openEditBookmarkDialog}
        />
      )}
      {currentView === "language" && (
        <LanguageView isDark={isDark} onBack={() => setCurrentView("main")} />
      )}
      {currentView === "browsing-data" && (
        <BrowsingDataView
          isDark={isDark}
          onBack={() => setCurrentView("main")}
        />
      )}

      {showBookmarkDialog && (
        <BookmarkDialog
          editingBookmark={editingBookmark}
          isDark={isDark}
          onCancel={closeBookmarkDialog}
          onSave={saveBookmark}
          setTitle={setBookmarkTitle}
          setUrl={setBookmarkUrl}
          title={bookmarkTitle}
          url={bookmarkUrl}
        />
      )}
    </div>
  );
}

export default Settings;
