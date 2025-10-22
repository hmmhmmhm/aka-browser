/// <reference types="../../types/electron-api" />
import { useEffect, useState } from 'react';

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
    <>
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        html,
        body,
        #root {
          height: 100%;
          width: 100%;
        }

        body {
          font-family:
            -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue",
            Arial, sans-serif;
          background: #1c1c1e;
          color: #ffffff;
        }

        #root {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
        }

        .bookmarks-container {
          width: 100%;
          max-width: 800px;
          margin-top: 120px;
        }

        .bookmarks-title {
          font-size: 20px;
          font-weight: 600;
          color: #ffffff;
          margin-bottom: 24px;
          text-align: center;
        }

        .bookmarks-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          padding: 0 20px;
          max-width: 100%;
        }

        .bookmark-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-decoration: none;
          padding: 16px 12px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.05);
          transition: all 0.2s ease;
          cursor: pointer;
          min-width: 0;
        }

        .bookmark-item:hover {
          background: rgba(255, 255, 255, 0.1);
          transform: translateY(-2px);
        }

        .bookmark-icon {
          width: 64px;
          height: 64px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          margin-bottom: 12px;
          overflow: hidden;
          background: transparent;
        }

        .bookmark-icon img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .bookmark-title {
          font-size: 13px;
          font-weight: 500;
          color: #ffffff;
          text-align: center;
          word-break: break-word;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .bookmark-url {
          font-size: 11px;
          color: #8e8e93;
          text-align: center;
          margin-top: 4px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 100%;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #8e8e93;
        }

        .empty-state-icon {
          font-size: 48px;
          margin-bottom: 16px;
          opacity: 0.5;
        }

        .empty-state-text {
          font-size: 15px;
          line-height: 1.6;
          text-wrap: balance;
          word-break: keep-all;
        }

        @media (max-width: 600px) {
          .bookmarks-grid {
            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
            gap: 16px;
          }

          .bookmark-icon {
            width: 56px;
            height: 56px;
            font-size: 28px;
          }
        }
      `}</style>
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
    </>
  );
}
