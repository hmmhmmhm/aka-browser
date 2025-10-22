import { useState, useEffect } from "react";
import { Info, Globe, ChevronRight, ChevronLeft, Star, Trash2, Plus, Edit2, X } from "lucide-react";

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

interface Bookmark {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  createdAt: number;
  updatedAt: number;
}

// Default bookmarks (same as blank-page.html)
const defaultBookmarks: Bookmark[] = [
  {
    id: "default-google",
    title: "Google",
    url: "https://www.google.com",
    favicon: "https://www.google.com/s2/favicons?domain=google.com&sz=128",
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: "default-youtube",
    title: "YouTube",
    url: "https://www.youtube.com",
    favicon: "https://www.google.com/s2/favicons?domain=youtube.com&sz=128",
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: "default-netflix",
    title: "Netflix",
    url: "https://www.netflix.com",
    favicon: "https://www.google.com/s2/favicons?domain=netflix.com&sz=128",
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: "default-x",
    title: "X",
    url: "https://x.com",
    favicon: "https://www.google.com/s2/favicons?domain=x.com&sz=128",
    createdAt: 0,
    updatedAt: 0,
  },
];

function Settings({ theme, orientation, onClose }: SettingsProps) {
  const [currentView, setCurrentView] = useState<"main" | "about" | "bookmarks">("main");
  const [appVersion, setAppVersion] = useState<string>("0.0.0");
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [hiddenDefaultBookmarks, setHiddenDefaultBookmarks] = useState<Set<string>>(new Set());
  const [showBookmarkDialog, setShowBookmarkDialog] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [bookmarkTitle, setBookmarkTitle] = useState("");
  const [bookmarkUrl, setBookmarkUrl] = useState("");

  useEffect(() => {
    // Get app version
    window.electronAPI?.getAppVersion().then((version: string) => {
      setAppVersion(version);
    });

    // Load hidden default bookmarks from localStorage
    try {
      const hidden = localStorage.getItem("hiddenDefaultBookmarks");
      if (hidden) {
        setHiddenDefaultBookmarks(new Set(JSON.parse(hidden)));
      }
    } catch (error) {
      console.error("Failed to load hidden bookmarks:", error);
    }

    // Load bookmarks
    loadBookmarks();

    // Listen for bookmark updates
    const unsubscribe = window.electronAPI?.bookmarks?.onUpdate(() => {
      loadBookmarks();
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const loadBookmarks = async () => {
    try {
      const allBookmarks = await window.electronAPI?.bookmarks?.getAll();
      
      // Load cached favicons for bookmarks that don't have data URLs
      if (allBookmarks) {
        const bookmarksWithFavicons = await Promise.all(
          allBookmarks.map(async (bookmark) => {
            // If favicon exists and is not a data URL, try to get cached version
            if (bookmark.favicon && !bookmark.favicon.startsWith('data:')) {
              try {
                const cachedFavicon = await window.electronAPI?.favicon?.getWithFallback(bookmark.url);
                if (cachedFavicon) {
                  return { ...bookmark, favicon: cachedFavicon };
                }
              } catch (error) {
                console.error("Failed to load cached favicon:", error);
              }
            }
            return bookmark;
          })
        );
        setBookmarks(bookmarksWithFavicons);
      } else {
        setBookmarks([]);
      }
    } catch (error) {
      console.error("Failed to load bookmarks:", error);
      setBookmarks([]);
    }
  };

  // Get all bookmarks (user + visible default bookmarks)
  const getAllBookmarks = (): Bookmark[] => {
    const visibleDefaults = defaultBookmarks.filter(
      (bookmark) => !hiddenDefaultBookmarks.has(bookmark.id)
    );
    
    console.log("[Settings] User bookmarks:", bookmarks.length, bookmarks);
    console.log("[Settings] Visible defaults:", visibleDefaults.length, visibleDefaults);
    console.log("[Settings] Hidden defaults:", Array.from(hiddenDefaultBookmarks));
    
    // Show user bookmarks + visible default bookmarks
    // User bookmarks first, then default bookmarks
    const allBookmarks = [...bookmarks, ...visibleDefaults];
    console.log("[Settings] Total bookmarks:", allBookmarks.length, allBookmarks);
    
    return allBookmarks;
  };

  const handleDeleteBookmark = async (id: string) => {
    try {
      // Check if it's a default bookmark
      if (id.startsWith("default-")) {
        // Hide default bookmark
        const newHidden = new Set(hiddenDefaultBookmarks);
        newHidden.add(id);
        setHiddenDefaultBookmarks(newHidden);
        
        // Save to localStorage
        localStorage.setItem(
          "hiddenDefaultBookmarks",
          JSON.stringify(Array.from(newHidden))
        );
      } else {
        // Remove user bookmark
        await window.electronAPI?.bookmarks?.remove(id);
        // Bookmarks will be reloaded via onUpdate listener
      }
    } catch (error) {
      console.error("Failed to delete bookmark:", error);
    }
  };

  const handleAddBookmark = () => {
    setEditingBookmark(null);
    setBookmarkTitle("");
    setBookmarkUrl("");
    setShowBookmarkDialog(true);
  };

  const handleEditBookmark = (bookmark: Bookmark) => {
    // Don't allow editing default bookmarks
    if (bookmark.id.startsWith("default-")) {
      return;
    }
    
    setEditingBookmark(bookmark);
    setBookmarkTitle(bookmark.title);
    setBookmarkUrl(bookmark.url);
    setShowBookmarkDialog(true);
  };

  const handleSaveBookmark = async () => {
    if (!bookmarkTitle.trim() || !bookmarkUrl.trim()) {
      return;
    }

    try {
      if (editingBookmark) {
        // Update existing bookmark
        await window.electronAPI?.bookmarks?.update(editingBookmark.id, {
          title: bookmarkTitle.trim(),
          url: bookmarkUrl.trim(),
        });
      } else {
        // Add new bookmark
        await window.electronAPI?.bookmarks?.add(
          bookmarkTitle.trim(),
          bookmarkUrl.trim()
        );
      }
      setShowBookmarkDialog(false);
      setEditingBookmark(null);
      setBookmarkTitle("");
      setBookmarkUrl("");
    } catch (error) {
      console.error("Failed to save bookmark:", error);
    }
  };

  const handleCancelBookmarkDialog = () => {
    setShowBookmarkDialog(false);
    setEditingBookmark(null);
    setBookmarkTitle("");
    setBookmarkUrl("");
  };

  const isDark = theme === "dark";

  const settingsSections: SettingsSection[] = [
    {
      id: "general",
      title: "General",
      items: [
        {
          id: "bookmarks",
          label: "Favorites",
          value: `${getAllBookmarks().length} items`,
          icon: <Star size={20} />,
          hasDetail: true,
          onClick: () => setCurrentView("bookmarks"),
        },
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

  const renderBookmarksView = () => (
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
          Favorites
        </h2>
        <button
          onClick={handleAddBookmark}
          className={`p-2 rounded-lg transition-colors ${
            isDark
              ? "hover:bg-zinc-800 text-white"
              : "hover:bg-zinc-200 text-zinc-900"
          }`}
          title="Add favorite"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Bookmarks Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {getAllBookmarks().length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Star
              size={64}
              className={`mb-4 ${isDark ? "text-zinc-700" : "text-zinc-300"}`}
            />
            <p
              className={`text-center ${
                isDark ? "text-zinc-500" : "text-zinc-600"
              }`}
            >
              No favorites yet.<br />
              Add your favorite sites from the menu.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {getAllBookmarks().map((bookmark) => (
              <div
                key={bookmark.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl ${
                  isDark ? "bg-zinc-800" : "bg-white"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isDark ? "bg-zinc-700" : "bg-zinc-100"
                  }`}
                >
                  {bookmark.favicon ? (
                    <img
                      src={bookmark.favicon}
                      alt=""
                      className="w-6 h-6 object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                        const parent = target.parentElement;
                        if (parent) {
                          parent.textContent = bookmark.title.charAt(0).toUpperCase();
                        }
                      }}
                    />
                  ) : (
                    <span
                      className={`text-sm font-semibold ${
                        isDark ? "text-zinc-400" : "text-zinc-600"
                      }`}
                    >
                      {bookmark.title.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className={`text-sm font-medium truncate ${
                      isDark ? "text-white" : "text-zinc-900"
                    }`}
                  >
                    {bookmark.title}
                  </div>
                  <div
                    className={`text-xs truncate ${
                      isDark ? "text-zinc-500" : "text-zinc-600"
                    }`}
                  >
                    {(() => {
                      try {
                        return new URL(bookmark.url).hostname;
                      } catch {
                        return bookmark.url;
                      }
                    })()}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!bookmark.id.startsWith("default-") && (
                    <button
                      onClick={() => handleEditBookmark(bookmark)}
                      className={`p-2 rounded-lg transition-colors ${
                        isDark
                          ? "hover:bg-zinc-700 text-zinc-400 hover:text-blue-400"
                          : "hover:bg-zinc-100 text-zinc-600 hover:text-blue-600"
                      }`}
                      title="Edit favorite"
                    >
                      <Edit2 size={18} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteBookmark(bookmark.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      isDark
                        ? "hover:bg-zinc-700 text-zinc-400 hover:text-red-400"
                        : "hover:bg-zinc-100 text-zinc-600 hover:text-red-600"
                    }`}
                    title={bookmark.id.startsWith("default-") ? "Hide from favorites" : "Remove from favorites"}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
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
      {currentView === "main" 
        ? renderMainView() 
        : currentView === "about" 
        ? renderAboutView()
        : renderBookmarksView()}

      {/* Bookmark Add/Edit Dialog */}
      {showBookmarkDialog && (
        <div className="absolute inset-0 z-60 flex items-center justify-center bg-black bg-opacity-50 p-6">
          <div
            className={`w-full max-w-md rounded-2xl shadow-2xl ${
              isDark ? "bg-zinc-800" : "bg-white"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Dialog Header */}
            <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
              <h3 className={`text-lg font-semibold ${isDark ? "text-white" : "text-zinc-900"}`}>
                {editingBookmark ? "Edit Favorite" : "Add Favorite"}
              </h3>
              <button
                onClick={handleCancelBookmarkDialog}
                className={`p-1 rounded-lg transition-colors ${
                  isDark
                    ? "hover:bg-zinc-700 text-zinc-400"
                    : "hover:bg-zinc-100 text-zinc-600"
                }`}
              >
                <X size={20} />
              </button>
            </div>

            {/* Dialog Content */}
            <div className="p-6 space-y-4">
              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${
                    isDark ? "text-zinc-300" : "text-zinc-700"
                  }`}
                >
                  Title
                </label>
                <input
                  type="text"
                  value={bookmarkTitle}
                  onChange={(e) => setBookmarkTitle(e.target.value)}
                  placeholder="Enter title"
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDark
                      ? "bg-zinc-700 border-zinc-600 text-white placeholder-zinc-400"
                      : "bg-white border-zinc-300 text-zinc-900 placeholder-zinc-500"
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  autoFocus
                />
              </div>

              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${
                    isDark ? "text-zinc-300" : "text-zinc-700"
                  }`}
                >
                  URL
                </label>
                <input
                  type="url"
                  value={bookmarkUrl}
                  onChange={(e) => setBookmarkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDark
                      ? "bg-zinc-700 border-zinc-600 text-white placeholder-zinc-400"
                      : "bg-white border-zinc-300 text-zinc-900 placeholder-zinc-500"
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>
            </div>

            {/* Dialog Footer */}
            <div className={`flex gap-3 px-6 py-4 border-t ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
              <button
                onClick={handleCancelBookmarkDialog}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isDark
                    ? "bg-zinc-700 hover:bg-zinc-600 text-white"
                    : "bg-zinc-200 hover:bg-zinc-300 text-zinc-900"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBookmark}
                disabled={!bookmarkTitle.trim() || !bookmarkUrl.trim()}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  !bookmarkTitle.trim() || !bookmarkUrl.trim()
                    ? isDark
                      ? "bg-zinc-700 text-zinc-500 cursor-not-allowed"
                      : "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                {editingBookmark ? "Save" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Settings;
