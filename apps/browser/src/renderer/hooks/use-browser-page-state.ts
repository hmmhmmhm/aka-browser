import { useEffect, useRef, useState } from "react";
import { getLuminance } from "../lib/app-utils";

interface TabListData {
  tabs: any[];
  activeTabId: string | null;
}

export function useBrowserPageState(orientation: "portrait" | "landscape") {
  const [pageTitle, setPageTitle] = useState("New Tab");
  const [pageDomain, setPageDomain] = useState("");
  const [themeColor, setThemeColor] = useState("#1c1c1e");
  const [textColor, setTextColor] = useState("#ffffff");
  const [currentUrl, setCurrentUrl] = useState("");
  const [tabCount, setTabCount] = useState(1);
  const themeMonitoringIntervalRef = useRef<ReturnType<
    typeof setInterval
  > | null>(null);
  const isExecutingJavaScriptRef = useRef(false);
  const crashCountRef = useRef(0);
  const lastCrashTimeRef = useRef(0);

  const setReadableThemeColor = (color: string) => {
    setThemeColor(color);
    setTextColor(getLuminance(color) > 0.5 ? "#000000" : "#ffffff");
  };

  const updateThemeColor = async () => {
    if (isExecutingJavaScriptRef.current) return;

    try {
      isExecutingJavaScriptRef.current = true;
      const nextThemeColor =
        await window.electronAPI?.webContents.getThemeColor();
      isExecutingJavaScriptRef.current = false;

      if (
        nextThemeColor &&
        nextThemeColor !== "rgba(0, 0, 0, 0)" &&
        nextThemeColor !== "transparent"
      ) {
        setReadableThemeColor(nextThemeColor);
      } else {
        setThemeColor("#ffffff");
        setTextColor("#000000");
      }
    } catch {
      isExecutingJavaScriptRef.current = false;
    }
  };

  const updatePageInfo = async () => {
    try {
      let url = await window.electronAPI?.webContents.getURL();
      const title = await window.electronAPI?.webContents.getTitle();

      if (url && (url.includes("blank-page-tab-") || url.includes("error-page-tab-"))) {
        url = "/";
      }

      setPageTitle(title || "Untitled");
      setCurrentUrl(url || "/");

      if (url && url !== "/") {
        try {
          setPageDomain(new URL(url).hostname);
        } catch {
          setPageDomain(url);
        }
      } else {
        setPageDomain("");
      }
    } catch {
      // Ignore page transitions where the WebContentsView is unavailable.
    }
  };

  const startThemeColorMonitoring = () => {
    stopThemeColorMonitoring();
    updateThemeColor();

    let pollCount = 0;
    const fastInterval = setInterval(() => {
      updateThemeColor();
      pollCount++;
      if (pollCount >= 20) {
        clearInterval(fastInterval);
        themeMonitoringIntervalRef.current = setInterval(updateThemeColor, 500);
      }
    }, 50);

    themeMonitoringIntervalRef.current = fastInterval;
  };

  const stopThemeColorMonitoring = () => {
    if (themeMonitoringIntervalRef.current) {
      clearInterval(themeMonitoringIntervalRef.current);
      themeMonitoringIntervalRef.current = null;
    }
  };

  useEffect(() => {
    const cleanup = window.electronAPI?.webContents.onThemeColorUpdated(
      setReadableThemeColor
    );

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  useEffect(() => {
    window.electronAPI?.tabs.getAll().then((data: TabListData) => {
      setTabCount(data.tabs.length);
    });

    const cleanupTabChanged = window.electronAPI?.tabs.onTabChanged((data) => {
      setTabCount(data.tabs.length);
      updatePageInfo();
      startThemeColorMonitoring();
    });
    const cleanupTabsUpdated = window.electronAPI?.tabs.onTabsUpdated(
      (data: TabListData) => {
        setTabCount(data.tabs.length);
      }
    );

    return () => {
      if (cleanupTabChanged) cleanupTabChanged();
      if (cleanupTabsUpdated) cleanupTabsUpdated();
    };
  }, [orientation]);

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
    };
    const handleDidStopLoading = () => {
      startThemeColorMonitoring();
    };
    const handleRenderProcessGone = () => {
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
        setTimeout(() => window.electronAPI?.webContents.reload(), 2000);
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
      console.log(`[App] HTTP Error: ${statusCode} ${statusText} for ${url}`);
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

  return {
    currentUrl,
    pageDomain,
    pageTitle,
    tabCount,
    textColor,
    themeColor,
  };
}
