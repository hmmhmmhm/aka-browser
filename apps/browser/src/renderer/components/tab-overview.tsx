import { useState, useEffect } from 'react';

interface Tab {
  id: string;
  title: string;
  url: string;
}

interface TabOverviewProps {
  theme: 'light' | 'dark';
  orientation: 'portrait' | 'landscape';
  onClose: () => void;
}

function TabOverview({ theme, orientation, onClose }: TabOverviewProps) {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  useEffect(() => {
    // Get initial tabs
    // @ts-ignore - electronAPI is exposed via preload
    window.electronAPI?.tabs.getAll().then((data: { tabs: Tab[]; activeTabId: string | null }) => {
      setTabs(data.tabs);
      setActiveTabId(data.activeTabId);
    });

    // Listen for tab changes
    // @ts-ignore - electronAPI is exposed via preload
    const cleanupTabsUpdated = window.electronAPI?.tabs.onTabsUpdated((data: { tabs: Tab[]; activeTabId: string | null }) => {
      setTabs(data.tabs);
      setActiveTabId(data.activeTabId);
    });

    return () => {
      if (cleanupTabsUpdated) cleanupTabsUpdated();
    };
  }, []);

  const handleTabClick = (tabId: string) => {
    // @ts-ignore - electronAPI is exposed via preload
    window.electronAPI?.tabs.switch(tabId);
    onClose();
  };

  const handleTabClose = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    // @ts-ignore - electronAPI is exposed via preload
    window.electronAPI?.tabs.close(tabId);
  };

  const handleNewTab = () => {
    // @ts-ignore - electronAPI is exposed via preload
    window.electronAPI?.tabs.create();
    onClose();
  };

  const getDomainFromUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url;
    }
  };

  const isDark = theme === 'dark';
  const isLandscape = orientation === 'landscape';

  return (
    <div
      className={`absolute inset-0 z-50 flex flex-col ${
        isDark ? 'bg-zinc-900' : 'bg-zinc-100'
      }`}
      onClick={onClose}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-6 py-4 border-b ${
        isDark ? 'border-zinc-700' : 'border-zinc-300'
      }`}>
        <h2 className={`text-xl font-semibold ${
          isDark ? 'text-white' : 'text-zinc-900'
        }`}>
          Tabs ({tabs.length})
        </h2>
        <button
          onClick={onClose}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
            isDark
              ? 'hover:bg-zinc-700 text-zinc-400 hover:text-white'
              : 'hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900'
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Tab Grid */}
      <div
        className="flex-1 overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`grid gap-4 ${
          isLandscape ? 'grid-cols-3' : 'grid-cols-2'
        }`}>
          {tabs.map((tab) => (
            <div
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`relative rounded-xl overflow-hidden cursor-pointer transition-all duration-200 ${
                activeTabId === tab.id
                  ? isDark
                    ? 'bg-zinc-800 ring-2 ring-white shadow-lg'
                    : 'bg-white ring-2 ring-zinc-600 shadow-lg'
                  : isDark
                  ? 'bg-zinc-800 hover:bg-zinc-700 shadow-md'
                  : 'bg-white hover:bg-zinc-50 shadow-md'
              }`}
              style={{ aspectRatio: '3/4' }}
            >
              {/* Tab Preview Area */}
              <div className={`h-3/4 flex items-center justify-center ${
                isDark ? 'bg-zinc-900' : 'bg-zinc-100'
              }`}>
                <div className="text-center px-4">
                  <div className={`text-4xl mb-2 ${
                    isDark ? 'text-zinc-600' : 'text-zinc-400'
                  }`}>
                    🌐
                  </div>
                  <div className={`text-xs font-medium truncate ${
                    isDark ? 'text-zinc-400' : 'text-zinc-600'
                  }`}>
                    {getDomainFromUrl(tab.url)}
                  </div>
                </div>
              </div>

              {/* Tab Info */}
              <div className="h-1/4 p-3 flex flex-col justify-center">
                <div className={`text-sm font-medium truncate mb-1 ${
                  isDark ? 'text-white' : 'text-zinc-900'
                }`}>
                  {tab.title}
                </div>
                <div className={`text-xs truncate ${
                  isDark ? 'text-zinc-400' : 'text-zinc-600'
                }`}>
                  {getDomainFromUrl(tab.url)}
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={(e) => handleTabClose(e, tab.id)}
                className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                  isDark
                    ? 'bg-zinc-900/80 hover:bg-red-600 text-zinc-400 hover:text-white'
                    : 'bg-white/80 hover:bg-red-500 text-zinc-600 hover:text-white'
                } backdrop-blur-sm`}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>

              {/* Active Indicator */}
              {activeTabId === tab.id && (
                <div className={`absolute bottom-0 left-0 right-0 h-1 ${
                  isDark ? 'bg-white' : 'bg-zinc-600'
                }`} />
              )}
            </div>
          ))}

          {/* New Tab Card */}
          <div
            onClick={handleNewTab}
            className={`rounded-xl overflow-hidden cursor-pointer transition-all duration-200 flex items-center justify-center ${
              isDark
                ? 'bg-zinc-800 hover:bg-zinc-700 border-2 border-dashed border-zinc-600'
                : 'bg-white hover:bg-zinc-50 border-2 border-dashed border-zinc-300'
            }`}
            style={{ aspectRatio: '3/4' }}
          >
            <div className="text-center">
              <div className={`text-5xl mb-2 ${
                isDark ? 'text-zinc-600' : 'text-zinc-400'
              }`}>
                +
              </div>
              <div className={`text-sm font-medium ${
                isDark ? 'text-zinc-400' : 'text-zinc-600'
              }`}>
                New Tab
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TabOverview;
