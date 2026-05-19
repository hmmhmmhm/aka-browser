import { useEffect, useMemo, useState } from "react";
import { Bookmark, defaultBookmarks } from "./types";

const hiddenDefaultsKey = "hiddenDefaultBookmarks";

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [hiddenDefaultBookmarks, setHiddenDefaultBookmarks] = useState<
    Set<string>
  >(new Set());

  const loadBookmarks = async () => {
    try {
      const allBookmarks = await window.electronAPI?.bookmarks?.getAll();
      if (!allBookmarks) {
        setBookmarks([]);
        return;
      }

      const withFavicons = await Promise.all(
        allBookmarks.map(async (bookmark) => {
          if (!bookmark.favicon || bookmark.favicon.startsWith("data:")) {
            return bookmark;
          }

          try {
            const cachedFavicon =
              await window.electronAPI?.favicon?.getWithFallback(bookmark.url);
            return cachedFavicon
              ? { ...bookmark, favicon: cachedFavicon }
              : bookmark;
          } catch (error) {
            console.error("Failed to load cached favicon:", error);
            return bookmark;
          }
        })
      );

      setBookmarks(withFavicons);
    } catch (error) {
      console.error("Failed to load bookmarks:", error);
      setBookmarks([]);
    }
  };

  useEffect(() => {
    try {
      const hidden = localStorage.getItem(hiddenDefaultsKey);
      if (hidden) {
        setHiddenDefaultBookmarks(new Set(JSON.parse(hidden)));
      }
    } catch (error) {
      console.error("Failed to load hidden bookmarks:", error);
    }

    loadBookmarks();
    const unsubscribe = window.electronAPI?.bookmarks?.onUpdate(loadBookmarks);
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const allBookmarks = useMemo(() => {
    const visibleDefaults = defaultBookmarks.filter(
      (bookmark) => !hiddenDefaultBookmarks.has(bookmark.id)
    );
    return [...bookmarks, ...visibleDefaults];
  }, [bookmarks, hiddenDefaultBookmarks]);

  const deleteBookmark = async (id: string) => {
    try {
      if (id.startsWith("default-")) {
        const newHidden = new Set(hiddenDefaultBookmarks);
        newHidden.add(id);
        setHiddenDefaultBookmarks(newHidden);
        localStorage.setItem(
          hiddenDefaultsKey,
          JSON.stringify(Array.from(newHidden))
        );
        return;
      }

      await window.electronAPI?.bookmarks?.remove(id);
    } catch (error) {
      console.error("Failed to delete bookmark:", error);
    }
  };

  return {
    allBookmarks,
    deleteBookmark,
  };
}
