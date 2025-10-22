/// <reference types="../../types/electron-api" />
import { useEffect, useState } from 'react';
import './blank-page.css';

interface Bookmark {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  displayUrl?: string;
  createdAt?: number;
  updatedAt?: number;
}

const defaultBookmarks: Bookmark[] = [
  {
    id: 'default-google',
    title: 'Google',
    url: 'https://www.google.com',
    favicon: 'https://www.google.com/s2/favicons?domain=google.com&sz=128',
    displayUrl: 'google.com',
  },
  {
    id: 'default-youtube',
    title: 'YouTube',
    url: 'https://www.youtube.com',
    favicon: 'https://www.google.com/s2/favicons?domain=youtube.com&sz=128',
    displayUrl: 'youtube.com',
  },
  {
    id: 'default-netflix',
    title: 'Netflix',
    url: 'https://www.netflix.com',
    favicon: 'https://www.google.com/s2/favicons?domain=netflix.com&sz=128',
    displayUrl: 'netflix.com',
  },
  {
    id: 'default-x',
    title: 'X',
    url: 'https://x.com',
    favicon: 'https://www.google.com/s2/favicons?domain=x.com&sz=128',
    displayUrl: 'x.com',
  },
];

function getHighResFavicon(url: string): string[] {
  try {
    const domain = new URL(url).origin;
    return [
      `${domain}/apple-touch-icon.png`,
      `${domain}/apple-touch-icon-precomposed.png`,
      `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
      `${domain}/favicon.ico`,
    ];
  } catch {
    return [];
  }
}

interface BookmarkItemProps {
  bookmark: Bookmark;
}

function BookmarkItem({ bookmark }: BookmarkItemProps) {
  const [currentFaviconIndex, setCurrentFaviconIndex] = useState(0);
  const [faviconSources, setFaviconSources] = useState<string[]>([]);
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    // Build favicon sources list based on whether bookmark has favicon
    let sources: string[];
    if (bookmark.favicon) {
      // Try high-res favicon first, fallback to provided favicon
      sources = bookmark.id && bookmark.id.startsWith('default-')
        ? [bookmark.favicon] // Use direct URL for default bookmarks
        : getHighResFavicon(bookmark.url).concat([bookmark.favicon]);
    } else {
      // Try to get high-res favicon even if not provided
      sources = getHighResFavicon(bookmark.url);
    }
    
    setFaviconSources(sources);
    setCurrentFaviconIndex(0);
    setShowFallback(sources.length === 0);
  }, [bookmark.favicon, bookmark.url, bookmark.id]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.location.href = bookmark.url;
  };

  const handleImageError = () => {
    const nextIndex = currentFaviconIndex + 1;
    if (nextIndex < faviconSources.length) {
      setCurrentFaviconIndex(nextIndex);
    } else {
      // All sources failed, show first letter
      setShowFallback(true);
    }
  };

  const displayUrl = bookmark.displayUrl || (() => {
    try {
      const hostname = new URL(bookmark.url).hostname;
      return hostname.replace(/^www\./, '');
    } catch {
      return bookmark.url;
    }
  })();

  return (
    <a href={bookmark.url} className="bookmark-item" onClick={handleClick}>
      <div className="bookmark-icon">
        {!showFallback && faviconSources.length > 0 ? (
          <img 
            src={faviconSources[currentFaviconIndex]} 
            alt={bookmark.title} 
            onError={handleImageError} 
          />
        ) : (
          bookmark.title.charAt(0).toUpperCase()
        )}
      </div>
      <div className="bookmark-title">{bookmark.title}</div>
      <div className="bookmark-url">{displayUrl}</div>
    </a>
  );
}

export default function BlankPage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [hiddenDefaults, setHiddenDefaults] = useState<string[]>([]);

  const loadBookmarks = async () => {
    try {
      const userBookmarks = await window.electronAPI?.bookmarks?.getAll();

      // Load hidden default bookmarks from localStorage
      let hidden: string[] = [];
      try {
        const hiddenStr = localStorage.getItem('hiddenDefaultBookmarks');
        if (hiddenStr) {
          hidden = JSON.parse(hiddenStr);
        }
      } catch (error) {
        console.error('Failed to load hidden bookmarks:', error);
      }

      setHiddenDefaults(hidden);

      // Filter out hidden default bookmarks
      const visibleDefaults = defaultBookmarks.filter(
        (bookmark) => !hidden.includes(bookmark.id)
      );

      // Combine user bookmarks and visible default bookmarks
      const displayBookmarks = [...(userBookmarks || []), ...visibleDefaults];

      console.log('[Start Page] User bookmarks:', userBookmarks?.length, userBookmarks);
      console.log('[Start Page] Visible defaults:', visibleDefaults.length, visibleDefaults);
      console.log('[Start Page] Total display bookmarks:', displayBookmarks.length, displayBookmarks);

      setBookmarks(displayBookmarks);
    } catch (error) {
      console.error('Failed to load bookmarks:', error);
    }
  };

  useEffect(() => {
    loadBookmarks();

    // Listen for bookmark updates
    if (window.electronAPI?.bookmarks?.onUpdate) {
      const cleanup = window.electronAPI.bookmarks.onUpdate(() => {
        loadBookmarks();
      });

      return cleanup;
    }
  }, []);

  return (
    <div className="bookmarks-container">
      <h2 className="bookmarks-title">Favorites</h2>
      {bookmarks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">⭐</div>
          <div className="empty-state-text">
            No favorites yet.
            <br />
            Click the menu button to add your favorite sites.
          </div>
        </div>
      ) : (
        <div className="bookmarks-grid">
          {bookmarks.map((bookmark) => (
            <BookmarkItem key={bookmark.id} bookmark={bookmark} />
          ))}
        </div>
      )}
    </div>
  );
}
