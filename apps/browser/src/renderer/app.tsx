import { useState, useEffect, useRef } from 'react';
import TopBar from './components/top-bar';
import PhoneFrame from './components/phone-frame';

function App() {
  const [time, setTime] = useState('9:41');
  const [pageTitle, setPageTitle] = useState('Loading...');
  const [pageDomain, setPageDomain] = useState('www.google.com');
  const [themeColor, setThemeColor] = useState('#000000');
  const [textColor, setTextColor] = useState('#ffffff');
  const webviewRef = useRef<any>(null);

  // Update time
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setTime(`${hours}:${minutes}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Calculate luminance to determine if color is light or dark
  const getLuminance = (color: string): number => {
    let r: number, g: number, b: number;

    if (color.startsWith('#')) {
      const hex = color.replace('#', '');
      r = parseInt(hex.substr(0, 2), 16);
      g = parseInt(hex.substr(2, 2), 16);
      b = parseInt(hex.substr(4, 2), 16);
    } else if (color.startsWith('rgb')) {
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
  const updateThemeColor = () => {
    const webview = webviewRef.current;
    if (!webview) return;

    // Prevent concurrent executeJavaScript calls
    if (isExecutingJavaScriptRef.current) return;

    // Check if webview is still valid and not destroyed
    try {
      if (webview.getURL) {
        isExecutingJavaScriptRef.current = true;
        webview
          .executeJavaScript(
            `
            (function() {
              const metaThemeColor = document.querySelector('meta[name="theme-color"]');
              if (metaThemeColor) {
                return metaThemeColor.getAttribute('content');
              }
              
              const bodyBg = window.getComputedStyle(document.body).backgroundColor;
              return bodyBg;
            })();
          `
          )
          .then((themeColor: string) => {
            isExecutingJavaScriptRef.current = false;
            if (
              themeColor &&
              themeColor !== 'rgba(0, 0, 0, 0)' &&
              themeColor !== 'transparent'
            ) {
              setThemeColor(themeColor);
              const luminance = getLuminance(themeColor);
              setTextColor(luminance > 0.5 ? '#000000' : '#ffffff');
            } else {
              setThemeColor('#000000');
              setTextColor('#ffffff');
            }
          })
          .catch(() => {
            isExecutingJavaScriptRef.current = false;
            // Silently ignore errors during page transitions
          });
      }
    } catch (err) {
      isExecutingJavaScriptRef.current = false;
      // Silently ignore errors when webview is being destroyed
    }
  };

  // Update page info
  const updatePageInfo = () => {
    const webview = webviewRef.current;
    if (!webview) return;

    try {
      const url = webview.getURL();

      if (webview.getURL) {
        webview
          .executeJavaScript('document.title')
          .then((title: string) => {
            setPageTitle(title || 'Untitled');
          })
          .catch(() => {
            // Silently ignore errors during page transitions
          });
      }

      if (url) {
        try {
          const urlObj = new URL(url);
          setPageDomain(urlObj.hostname);
        } catch (e) {
          setPageDomain(url);
        }
      }
    } catch (err) {
      // Silently ignore errors when webview is being destroyed
    }
  };

  // Interval refs for cleanup
  const themeMonitoringIntervalRef = useRef<number | null>(null);
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
      const webview = webviewRef.current;
      if (webview) {
        webview.reload();
      }
    };

    // @ts-ignore - electronAPI is exposed via preload
    const cleanup = window.electronAPI?.onWebviewReload(handleWebviewReload);

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  // Setup gesture navigation listeners using wheel events
  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    let accumulatedDeltaX = 0;
    let isNavigating = false;
    const SWIPE_THRESHOLD = 100; // Threshold for triggering navigation
    const RESET_TIMEOUT = 300; // Reset accumulated delta after this timeout
    let resetTimer: number | null = null;

    const handleWheel = (e: WheelEvent) => {
      // Only handle horizontal swipes (two-finger left/right swipe on trackpad)
      // Ignore if there's significant vertical scrolling
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        return;
      }

      // Accumulate horizontal delta
      accumulatedDeltaX += e.deltaX;

      // Clear previous reset timer
      if (resetTimer) {
        clearTimeout(resetTimer);
      }

      // Set new reset timer
      resetTimer = window.setTimeout(() => {
        accumulatedDeltaX = 0;
        isNavigating = false;
      }, RESET_TIMEOUT);

      // Check if we've crossed the threshold and not already navigating
      if (!isNavigating) {
        if (accumulatedDeltaX < -SWIPE_THRESHOLD && webview.canGoBack()) {
          // Swipe right (negative deltaX) = go back
          webview.goBack();
          isNavigating = true;
          accumulatedDeltaX = 0;
        } else if (accumulatedDeltaX > SWIPE_THRESHOLD && webview.canGoForward()) {
          // Swipe left (positive deltaX) = go forward
          webview.goForward();
          isNavigating = true;
          accumulatedDeltaX = 0;
        }
      }
    };

    // Add wheel event listener to window
    window.addEventListener('wheel', handleWheel, { passive: true });

    // Inject script into webview to capture wheel events and forward them
    const injectGestureScript = () => {
      if (!webview || !webview.executeJavaScript) return;
      
      webview.executeJavaScript(`
        (function() {
          if (window.__gestureListenerInjected) return;
          window.__gestureListenerInjected = true;
          
          let accumulatedDeltaX = 0;
          let isNavigating = false;
          const SWIPE_THRESHOLD = 100;
          const RESET_TIMEOUT = 300;
          let resetTimer = null;
          
          window.addEventListener('wheel', (e) => {
            // Only handle horizontal swipes
            if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
              return;
            }
            
            accumulatedDeltaX += e.deltaX;
            
            if (resetTimer) clearTimeout(resetTimer);
            
            resetTimer = setTimeout(() => {
              accumulatedDeltaX = 0;
              isNavigating = false;
            }, RESET_TIMEOUT);
            
            if (!isNavigating) {
              if (accumulatedDeltaX < -SWIPE_THRESHOLD) {
                window.history.back();
                isNavigating = true;
                accumulatedDeltaX = 0;
              } else if (accumulatedDeltaX > SWIPE_THRESHOLD) {
                window.history.forward();
                isNavigating = true;
                accumulatedDeltaX = 0;
              }
            }
          }, { passive: true });
        })();
      `).catch(() => {
        // Ignore errors during injection
      });
    };

    // Inject script when webview is ready
    const handleDomReadyForGesture = () => {
      injectGestureScript();
    };

    webview.addEventListener('dom-ready', handleDomReadyForGesture);
    webview.addEventListener('did-navigate', injectGestureScript);
    webview.addEventListener('did-navigate-in-page', injectGestureScript);

    return () => {
      window.removeEventListener('wheel', handleWheel);
      if (webview) {
        webview.removeEventListener('dom-ready', handleDomReadyForGesture);
        webview.removeEventListener('did-navigate', injectGestureScript);
        webview.removeEventListener('did-navigate-in-page', injectGestureScript);
      }
      if (resetTimer) {
        clearTimeout(resetTimer);
      }
    };
  }, []);

  // Setup webview event listeners
  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

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
      setThemeColor('#000000');
      setTextColor('#ffffff');
    };

    const handleDidStopLoading = () => {
      startThemeColorMonitoring();
    };

    const handleRenderProcessGone = (event: any) => {
      stopThemeColorMonitoring();
      
      const now = Date.now();
      // Reset crash count if last crash was more than 10 seconds ago
      if (now - lastCrashTimeRef.current > 10000) {
        crashCountRef.current = 0;
      }
      
      crashCountRef.current++;
      lastCrashTimeRef.current = now;
      
      setPageTitle(`Page Crashed (${crashCountRef.current})`);
      setPageDomain('Please navigate to another page');
      setThemeColor('#000000');
      setTextColor('#ffffff');
      
      // Only auto-reload if crash count is less than 3
      if (crashCountRef.current < 3) {
        setTimeout(() => {
          try {
            if (webview && webview.reload) {
              webview.reload();
            }
          } catch (err) {
            // Failed to reload after crash
          }
        }, 2000);
      }
    };

    const handleDidFailLoad = (event: any) => {
      stopThemeColorMonitoring();
    };

    webview.addEventListener('dom-ready', handleDomReady);
    webview.addEventListener('did-navigate', handleDidNavigate);
    webview.addEventListener('did-navigate-in-page', handleDidNavigateInPage);
    webview.addEventListener('did-start-loading', handleDidStartLoading);
    webview.addEventListener('did-stop-loading', handleDidStopLoading);
    webview.addEventListener('render-process-gone', handleRenderProcessGone);
    webview.addEventListener('did-fail-load', handleDidFailLoad);

    return () => {
      stopThemeColorMonitoring();
      webview.removeEventListener('dom-ready', handleDomReady);
      webview.removeEventListener('did-navigate', handleDidNavigate);
      webview.removeEventListener('did-navigate-in-page', handleDidNavigateInPage);
      webview.removeEventListener('did-start-loading', handleDidStartLoading);
      webview.removeEventListener('did-stop-loading', handleDidStopLoading);
      webview.removeEventListener('render-process-gone', handleRenderProcessGone);
      webview.removeEventListener('did-fail-load', handleDidFailLoad);
    };
  }, []);

  const handleNavigate = (url: string) => {
    const webview = webviewRef.current;
    if (webview) {
      let finalUrl = url.trim();
      if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        finalUrl = 'https://' + finalUrl;
      }
      webview.loadURL(finalUrl);
    }
  };

  const handleBack = () => {
    const webview = webviewRef.current;
    if (webview && webview.canGoBack()) {
      webview.goBack();
    }
  };

  const handleForward = () => {
    const webview = webviewRef.current;
    if (webview && webview.canGoForward()) {
      webview.goForward();
    }
  };

  const handleRefresh = () => {
    const webview = webviewRef.current;
    if (webview) {
      webview.reload();
    }
  };

  return (
    <div className="w-screen h-screen rounded-xl overflow-hidden">
      <TopBar
        pageTitle={pageTitle}
        pageDomain={pageDomain}
        currentUrl={webviewRef.current?.getURL() || 'https://www.google.com'}
        onNavigate={handleNavigate}
        onBack={handleBack}
        onForward={handleForward}
        onRefresh={handleRefresh}
      />
      <PhoneFrame
        webviewRef={webviewRef}
        time={time}
        themeColor={themeColor}
        textColor={textColor}
      />
    </div>
  );
}

export default App;
