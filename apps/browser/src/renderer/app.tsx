/// <reference types="../types/electron-api" />
import { useEffect, useRef, useState } from "react";
import TopBar from "./components/top-bar";
import PhoneFrame from "./components/phone-frame";
import TabOverview from "./components/tab-overview";
import Settings from "./components/settings";
import MenuOverlay from "./components/menu-overlay";
import { FindInPage } from "./components/find-in-page";
import { useBrowserPageState } from "./hooks/use-browser-page-state";
import { getWebContentsBounds, normalizeNavigationUrl } from "./lib/app-utils";

function App() {
  const [_time, setTime] = useState("9:41");
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">("dark");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">(
    "portrait"
  );
  const [showTabOverview, setShowTabOverview] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showFind, setShowFind] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const webContainerRef = useRef<HTMLDivElement>(null);
  const pageState = useBrowserPageState(orientation);

  useEffect(() => {
    window.electronAPI?.getSystemTheme().then(setSystemTheme);

    const cleanup = window.electronAPI?.onThemeChanged(setSystemTheme);
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  useEffect(() => {
    window.electronAPI?.getOrientation().then(setOrientation);

    const cleanup = window.electronAPI?.onOrientationChanged(setOrientation);
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  useEffect(() => {
    const cleanup = window.electronAPI?.onFullscreenModeChanged(
      setIsFullscreen
    );
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  useEffect(() => {
    const cleanup = window.electronAPI?.onOpenSettings(() => {
      setShowSettings(true);
      window.electronAPI?.webContents.setVisible(false);
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, "0");
      const minutes = now.getMinutes().toString().padStart(2, "0");
      setTime(`${hours}:${minutes}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const cleanup = window.electronAPI?.onWebviewReload(() => {
      window.electronAPI?.webContents.reload();
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  useEffect(() => {
    let accumulatedDeltaX = 0;
    let isNavigating = false;
    const swipeThreshold = 100;
    const resetTimeout = 300;
    let resetTimer: ReturnType<typeof setTimeout> | null = null;

    const handleWheel = async (event: WheelEvent) => {
      if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) return;

      accumulatedDeltaX += event.deltaX;
      if (resetTimer) clearTimeout(resetTimer);

      resetTimer = setTimeout(() => {
        accumulatedDeltaX = 0;
        isNavigating = false;
      }, resetTimeout);

      if (isNavigating) return;

      const canGoBack = await window.electronAPI?.webContents.canGoBack();
      const canGoForward =
        await window.electronAPI?.webContents.canGoForward();

      if (accumulatedDeltaX < -swipeThreshold && canGoBack) {
        window.electronAPI?.webContents.goBack();
        isNavigating = true;
        accumulatedDeltaX = 0;
      } else if (accumulatedDeltaX > swipeThreshold && canGoForward) {
        window.electronAPI?.webContents.goForward();
        isNavigating = true;
        accumulatedDeltaX = 0;
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: true });

    return () => {
      window.removeEventListener("wheel", handleWheel);
      if (resetTimer) clearTimeout(resetTimer);
    };
  }, []);

  const syncWebContentsBounds = () => {
    if (!webContainerRef.current) return;
    const rect = webContainerRef.current.getBoundingClientRect();
    window.electronAPI?.webContents.setBounds(
      getWebContentsBounds(rect, orientation)
    );
  };

  const handleNavigate = (url: string) => {
    window.electronAPI?.webContents.loadURL(normalizeNavigationUrl(url));
  };

  const handleToggleTabs = () => {
    const newState = !showTabOverview;
    setShowTabOverview(newState);

    if (!newState) syncWebContentsBounds();
    window.electronAPI?.webContents.setVisible(!newState);
  };

  const handleCloseTabOverview = () => {
    setShowTabOverview(false);
    syncWebContentsBounds();
    window.electronAPI?.webContents.setVisible(true);
  };

  const handleCloseSettings = () => {
    setShowSettings(false);
    syncWebContentsBounds();
    window.electronAPI?.webContents.setVisible(true);
  };

  const handleCloseMenu = () => {
    setShowMenu(false);
    syncWebContentsBounds();
    window.electronAPI?.webContents.setVisible(true);
  };

  const handleOpenSettingsFromMenu = () => {
    setShowSettings(true);
    window.electronAPI?.webContents.setVisible(false);
  };

  const handleShowMenu = () => {
    if (showSettings) {
      handleCloseSettings();
      return;
    }

    if (showMenu) {
      handleCloseMenu();
      return;
    }

    window.electronAPI?.webContents.setVisible(false);
    setShowMenu(true);
  };

  return (
    <div className="w-screen h-screen rounded-xl overflow-hidden bg-transparent">
      <TopBar
        pageTitle={pageState.pageTitle}
        pageDomain={pageState.pageDomain}
        currentUrl={pageState.currentUrl}
        onNavigate={handleNavigate}
        onShowTabs={handleToggleTabs}
        onShowMenu={handleShowMenu}
        onRefresh={() => window.electronAPI?.webContents.reload()}
        theme={systemTheme}
        orientation={orientation}
        tabCount={pageState.tabCount}
      />
      <PhoneFrame
        webContainerRef={webContainerRef}
        orientation={orientation}
        themeColor={pageState.themeColor}
        textColor={pageState.textColor}
        showTabOverview={showTabOverview || showSettings}
        isFullscreen={isFullscreen}
        tabOverviewContent={
          showSettings ? (
            <Settings
              theme={systemTheme}
              orientation={orientation}
              onClose={handleCloseSettings}
            />
          ) : (
            <TabOverview
              theme={systemTheme}
              orientation={orientation}
              onClose={handleCloseTabOverview}
            />
          )
        }
      />
      {showMenu && (
        <MenuOverlay
          theme={systemTheme}
          currentUrl={pageState.currentUrl}
          currentTitle={pageState.pageTitle}
          onClose={handleCloseMenu}
          onOpenFind={() => setShowFind(true)}
          onOpenSettings={handleOpenSettingsFromMenu}
        />
      )}
      {showFind && (
        <FindInPage theme={systemTheme} onClose={() => setShowFind(false)} />
      )}
    </div>
  );
}

export default App;
