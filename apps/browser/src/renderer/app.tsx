/// <reference types="../types/electron-api" />
import { useState, useEffect, useRef } from "react";
import TopBar from "./components/top-bar";
import PhoneFrame from "./components/phone-frame";
import TabOverview from "./components/tab-overview";
import Settings from "./components/settings";
import MenuOverlay from "./components/menu-overlay";

function App() {
  const [_time, setTime] = useState("9:41");
  const [pageTitle, setPageTitle] = useState("New Tab");
  const [pageDomain, setPageDomain] = useState("");
  const [themeColor, setThemeColor] = useState("#1c1c1e"); // Start with start-page color
  const [textColor, setTextColor] = useState("#ffffff"); // White text for dark background
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">("dark");
  const [currentUrl, setCurrentUrl] = useState("");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">(
    "portrait"
  );
  const [showTabOverview, setShowTabOverview] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [tabCount, setTabCount] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const webContainerRef = useRef<HTMLDivElement>(null);

  // Initialize and listen for system theme changes
  useEffect(() => {
    // Get initial themeㅇ
    window.electronAPI?.getSystemTheme().then((theme: "light" | "dark") => {
      setSystemTheme(theme);
    });

    // Listen for theme changes
    const cleanup = window.electronAPI?.onThemeChanged(
      (theme: "light" | "dark") => {
        setSystemTheme(theme);
      }
    );

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  // Initialize and listen for orientation changes
  useEffect(() => {
    // Get initial orientation
    window.electronAPI
      ?.getOrientation()
      .then((orient: "portrait" | "landscape") => {
        setOrientation(orient);
      });

    // Listen for orientation changes
    const cleanup = window.electronAPI?.onOrientationChanged(
      (orient: "portrait" | "landscape") => {
        setOrientation(orient);
      }
    );

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  // Listen for fullscreen mode changes
  useEffect(() => {
    const cleanup = window.electronAPI?.onFullscreenModeChanged(
      (fullscreen: boolean) => {
        setIsFullscreen(fullscreen);
      }
    );

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  // Listen for theme color updates from main process
  useEffect(() => {
    const cleanup = window.electronAPI?.webContents.onThemeColorUpdated(
      (color: string) => {
        setThemeColor(color);
        const luminance = getLuminance(color);
        setTextColor(luminance > 0.5 ? "#000000" : "#ffffff");
      }
    );

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  // Listen for settings open request
  useEffect(() => {
    const cleanup = window.electronAPI?.onOpenSettings(() => {
      setShowSettings(true);
      // Hide WebContentsView when showing settings
      window.electronAPI?.webContents.setVisible(false);
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  // Track tab count
  useEffect(() => {
    // Get initial tab count
    window.electronAPI?.tabs
      .getAll()
      .then((data: { tabs: any[]; activeTabId: string | null }) => {
        setTabCount(data.tabs.length);
      });

    // Listen for tab updates
    const cleanupTabChanged = window.electronAPI?.tabs.onTabChanged(
      (data: { tabId: string; tabs: any[] }) => {
        setTabCount(data.tabs.length);

        // Set bounds from renderer when tab changes (skip in fullscreen mode)
        // TEMPORARILY DISABLED FOR DEBUGGING
        // if (webContainerRef.current && !isFullscreen) {
        //   const rect = webContainerRef.current.getBoundingClientRect();
        //   const statusBarHeight = 58;
        //   const statusBarWidth = 58;

        //   window.electronAPI?.webContents.setBounds({
        //     x: Math.round(
        //       rect.x + (orientation === "landscape" ? statusBarWidth : 0)
        //     ),
        //     y: Math.round(
        //       rect.y + (orientation === "landscape" ? 0 : statusBarHeight)
        //     ),
        //     width: Math.round(
        //       rect.width - (orientation === "landscape" ? statusBarWidth : 0)
        //     ),
        //     height: Math.round(
        //       rect.height - (orientation === "landscape" ? 0 : statusBarHeight)
        //     ),
        //   });
        // }
      }
    );

    const cleanupTabsUpdated = window.electronAPI?.tabs.onTabsUpdated(
      (data: { tabs: any[]; activeTabId: string | null }) => {
        setTabCount(data.tabs.length);
      }
    );

    return () => {
      if (cleanupTabChanged) cleanupTabChanged();
      if (cleanupTabsUpdated) cleanupTabsUpdated();
    };
  }, [orientation]);

  // Update time
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

  // Calculate luminance to determine if color is light or dark
  const getLuminance = (color: string): number => {
    let r: number, g: number, b: number;

    if (color.startsWith("#")) {
      const hex = color.replace("#", "");
      r = parseInt(hex.substr(0, 2), 16);
      g = parseInt(hex.substr(2, 2), 16);
      b = parseInt(hex.substr(4, 2), 16);
    } else if (color.startsWith("rgb")) {
      const matches = color.match(/\d+/g);
      if (matches) {
        r = parseInt(matches[0]);
        g = parseInt(matches[1]);
        b = parseInt(matches[2]);
      } else {
        return 0;
      }
    } else {
      return 0;
    }

    const rsRGB = r / 255;
    const gsRGB = g / 255;
    const bsRGB = b / 255;

    const rLinear =
      rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
    const gLinear =
      gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
    const bLinear =
      bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

    return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
  };

  // Update theme color
  const updateThemeColor = async () => {
    // Prevent concurrent API calls
    if (isExecutingJavaScriptRef.current) return;

    try {
      isExecutingJavaScriptRef.current = true;
      const themeColor = await window.electronAPI?.webContents.getThemeColor();

      isExecutingJavaScriptRef.current = false;
      if (
        themeColor &&
        themeColor !== "rgba(0, 0, 0, 0)" &&
        themeColor !== "transparent"
      ) {
        setThemeColor(themeColor);
        const luminance = getLuminance(themeColor);
        setTextColor(luminance > 0.5 ? "#000000" : "#ffffff");
      } else {
        // Default to white background with black text when no theme color is found
        setThemeColor("#ffffff");
        setTextColor("#000000");
      }
    } catch (err) {
      isExecutingJavaScriptRef.current = false;
      // Silently ignore errors during page transitions
    }
  };

  // Update page info
  const updatePageInfo = async () => {
    try {
      const url = await window.electronAPI?.webContents.getURL();
      const title = await window.electronAPI?.webContents.getTitle();

      setPageTitle(title || "Untitled");
      setCurrentUrl(url || "https://www.google.com");

      if (url) {
        try {
          const urlObj = new URL(url);
          setPageDomain(urlObj.hostname);
        } catch (e) {
          setPageDomain(url);
        }
      }
    } catch (err) {
      // Silently ignore errors during page transitions
    }
  };

  // Interval refs for cleanup
  const themeMonitoringIntervalRef = useRef<ReturnType<
    typeof setInterval
  > | null>(null);
  const isExecutingJavaScriptRef = useRef(false);
  const crashCountRef = useRef(0);
  const lastCrashTimeRef = useRef(0);

  // Start theme color monitoring
  const startThemeColorMonitoring = () => {
    // Clear any existing intervals
    if (themeMonitoringIntervalRef.current) {
      clearInterval(themeMonitoringIntervalRef.current);
      themeMonitoringIntervalRef.current = null;
    }

    updateThemeColor();

    let pollCount = 0;
    const fastInterval = setInterval(() => {
      updateThemeColor();
      pollCount++;
      if (pollCount >= 20) {
        clearInterval(fastInterval);
        // Switch to slower polling
        themeMonitoringIntervalRef.current = setInterval(updateThemeColor, 500);
      }
    }, 50);

    // Store the fast interval temporarily
    themeMonitoringIntervalRef.current = fastInterval;
  };

  // Stop theme color monitoring
  const stopThemeColorMonitoring = () => {
    if (themeMonitoringIntervalRef.current) {
      clearInterval(themeMonitoringIntervalRef.current);
      themeMonitoringIntervalRef.current = null;
    }
  };

  // Setup webview reload listener for Cmd+R shortcut
  useEffect(() => {
    const handleWebviewReload = () => {
      window.electronAPI?.webContents.reload();
    };

    const cleanup = window.electronAPI?.onWebviewReload(handleWebviewReload);

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  // Setup gesture navigation listeners using wheel events
  useEffect(() => {
    let accumulatedDeltaX = 0;
    let isNavigating = false;
    const SWIPE_THRESHOLD = 100;
    const RESET_TIMEOUT = 300;
    let resetTimer: ReturnType<typeof setTimeout> | null = null;

    const handleWheel = async (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        return;
      }

      accumulatedDeltaX += e.deltaX;

      if (resetTimer) {
        clearTimeout(resetTimer);
      }

      resetTimer = setTimeout(() => {
        accumulatedDeltaX = 0;
        isNavigating = false;
      }, RESET_TIMEOUT) as ReturnType<typeof setTimeout>;

      if (!isNavigating) {
        const canGoBack = await window.electronAPI?.webContents.canGoBack();
        const canGoForward =
          await window.electronAPI?.webContents.canGoForward();

        if (accumulatedDeltaX < -SWIPE_THRESHOLD && canGoBack) {
          window.electronAPI?.webContents.goBack();
          isNavigating = true;
          accumulatedDeltaX = 0;
        } else if (accumulatedDeltaX > SWIPE_THRESHOLD && canGoForward) {
          window.electronAPI?.webContents.goForward();
          isNavigating = true;
          accumulatedDeltaX = 0;
        }
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: true });

    return () => {
      window.removeEventListener("wheel", handleWheel);
      if (resetTimer) {
        clearTimeout(resetTimer);
      }
    };
  }, []);

  // Setup WebContents event listeners via IPC
  useEffect(() => {
    const handleDomReady = () => {
      updatePageInfo();
      startThemeColorMonitoring();
    };

    const handleDidNavigate = () => {
      stopThemeColorMonitoring();
      startThemeColorMonitoring();
      updatePageInfo();
    };

    const handleDidNavigateInPage = () => {
      updateThemeColor();
      setTimeout(updateThemeColor, 50);
      updatePageInfo();
    };

    const handleDidStartLoading = () => {
      stopThemeColorMonitoring();
      // Don't reset theme color here - keep previous color to avoid flashing
      // The new theme color will be applied when the page loads
    };

    const handleDidStopLoading = () => {
      startThemeColorMonitoring();
    };

    const handleRenderProcessGone = (_details: any) => {
      stopThemeColorMonitoring();

      const now = Date.now();
      if (now - lastCrashTimeRef.current > 10000) {
        crashCountRef.current = 0;
      }

      crashCountRef.current++;
      lastCrashTimeRef.current = now;

      setPageTitle(`Page Crashed (${crashCountRef.current})`);
      setPageDomain("Please navigate to another page");
      setThemeColor("#ffffff");
      setTextColor("#000000");

      if (crashCountRef.current < 3) {
        setTimeout(() => {
          window.electronAPI?.webContents.reload();
        }, 2000);
      }
    };

    const handleDidFailLoad = () => {
      stopThemeColorMonitoring();
    };

    const handleHttpError = (
      statusCode: number,
      statusText: string,
      url: string
    ) => {
      console.log(
        `[App] HTTP Error: ${statusCode} ${statusText} for ${url}`
      );
      stopThemeColorMonitoring();
    };

    const cleanupDomReady =
      window.electronAPI?.webContents.onDomReady(handleDomReady);
    const cleanupDidNavigate =
      window.electronAPI?.webContents.onDidNavigate(handleDidNavigate);
    const cleanupDidNavigateInPage =
      window.electronAPI?.webContents.onDidNavigateInPage(
        handleDidNavigateInPage
      );
    const cleanupDidStartLoading =
      window.electronAPI?.webContents.onDidStartLoading(handleDidStartLoading);
    const cleanupDidStopLoading =
      window.electronAPI?.webContents.onDidStopLoading(handleDidStopLoading);
    const cleanupRenderProcessGone =
      window.electronAPI?.webContents.onRenderProcessGone(
        handleRenderProcessGone
      );
    const cleanupDidFailLoad =
      window.electronAPI?.webContents.onDidFailLoad(handleDidFailLoad);
    const cleanupHttpError =
      window.electronAPI?.webContents.onHttpError(handleHttpError);

    // Initial page info fetch after a delay to ensure WebContentsView is ready
    setTimeout(() => {
      updatePageInfo();
      startThemeColorMonitoring();
    }, 1000);

    return () => {
      stopThemeColorMonitoring();
      if (cleanupDomReady) cleanupDomReady();
      if (cleanupDidNavigate) cleanupDidNavigate();
      if (cleanupDidNavigateInPage) cleanupDidNavigateInPage();
      if (cleanupDidStartLoading) cleanupDidStartLoading();
      if (cleanupDidStopLoading) cleanupDidStopLoading();
      if (cleanupRenderProcessGone) cleanupRenderProcessGone();
      if (cleanupDidFailLoad) cleanupDidFailLoad();
      if (cleanupHttpError) cleanupHttpError();
    };
  }, []);

  const handleNavigate = (url: string) => {
    let finalUrl = url.trim();

    // If already has a valid protocol, use as-is
    if (
      finalUrl.startsWith("http://") ||
      finalUrl.startsWith("https://") ||
      finalUrl.startsWith("file://")
    ) {
      window.electronAPI?.webContents.loadURL(finalUrl);
      return;
    }

    // Check if it's a local URL (localhost or private IP)
    const isLocalUrl =
      /^(localhost|127\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?/i.test(
        finalUrl
      );

    if (isLocalUrl) {
      // Use http:// for local development servers
      finalUrl = "http://" + finalUrl;
    } else {
      // Use https:// for external sites
      finalUrl = "https://" + finalUrl;
    }

    window.electronAPI?.webContents.loadURL(finalUrl);
  };

  const handleToggleTabs = () => {
    const newState = !showTabOverview;
    setShowTabOverview(newState);

    // If closing tab overview, set bounds before showing view
    if (!newState && webContainerRef.current) {
      const rect = webContainerRef.current.getBoundingClientRect();
      const statusBarHeight = 58;
      const statusBarWidth = 58;

      window.electronAPI?.webContents.setBounds({
        x: Math.round(
          rect.x + (orientation === "landscape" ? statusBarWidth : 0)
        ),
        y: Math.round(
          rect.y + (orientation === "landscape" ? 0 : statusBarHeight)
        ),
        width: Math.round(
          rect.width - (orientation === "landscape" ? statusBarWidth : 0)
        ),
        height: Math.round(
          rect.height - (orientation === "landscape" ? 0 : statusBarHeight)
        ),
      });
    }

    // Toggle WebContentsView visibility
    window.electronAPI?.webContents.setVisible(!newState);
  };

  const handleCloseTabOverview = () => {
    setShowTabOverview(false);

    // Set bounds before showing view
    if (webContainerRef.current) {
      const rect = webContainerRef.current.getBoundingClientRect();
      const statusBarHeight = 58;
      const statusBarWidth = 58;

      window.electronAPI?.webContents.setBounds({
        x: Math.round(
          rect.x + (orientation === "landscape" ? statusBarWidth : 0)
        ),
        y: Math.round(
          rect.y + (orientation === "landscape" ? 0 : statusBarHeight)
        ),
        width: Math.round(
          rect.width - (orientation === "landscape" ? statusBarWidth : 0)
        ),
        height: Math.round(
          rect.height - (orientation === "landscape" ? 0 : statusBarHeight)
        ),
      });
    }

    // Show WebContentsView when closing tab overview
    window.electronAPI?.webContents.setVisible(true);
  };

  const handleRefresh = () => {
    window.electronAPI?.webContents.reload();
  };

  const handleCloseSettings = () => {
    setShowSettings(false);

    // Set bounds before showing view
    if (webContainerRef.current) {
      const rect = webContainerRef.current.getBoundingClientRect();
      const statusBarHeight = 58;
      const statusBarWidth = 58;

      window.electronAPI?.webContents.setBounds({
        x: Math.round(
          rect.x + (orientation === "landscape" ? statusBarWidth : 0)
        ),
        y: Math.round(
          rect.y + (orientation === "landscape" ? 0 : statusBarHeight)
        ),
        width: Math.round(
          rect.width - (orientation === "landscape" ? statusBarWidth : 0)
        ),
        height: Math.round(
          rect.height - (orientation === "landscape" ? 0 : statusBarHeight)
        ),
      });
    }

    // Show WebContentsView when closing settings
    window.electronAPI?.webContents.setVisible(true);
  };

  const handleShowMenu = () => {
    if (showSettings) {
      // If settings is open, close it and show WebContentsView
      handleCloseSettings();
    } else {
      // Hide WebContentsView and show settings directly
      window.electronAPI?.webContents.setVisible(false);
      setShowSettings(true);
    }
  };

  const handleCloseMenu = () => {
    setShowMenu(false);
  };

  const handleOpenSettingsFromMenu = () => {
    setShowSettings(true);
    // WebContentsView is already hidden
  };

  return (
    <div className="w-screen h-screen rounded-xl overflow-hidden bg-transparent">
      <TopBar
        pageTitle={pageTitle}
        pageDomain={pageDomain}
        currentUrl={currentUrl}
        onNavigate={handleNavigate}
        onShowTabs={handleToggleTabs}
        onShowMenu={handleShowMenu}
        onRefresh={handleRefresh}
        theme={systemTheme}
        orientation={orientation}
        tabCount={tabCount}
      />
      <PhoneFrame
        webContainerRef={webContainerRef}
        orientation={orientation}
        themeColor={themeColor}
        textColor={textColor}
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
          currentUrl={currentUrl}
          currentTitle={pageTitle}
          onClose={handleCloseMenu}
          onOpenSettings={handleOpenSettingsFromMenu}
        />
      )}
    </div>
  );
}

export default App;
