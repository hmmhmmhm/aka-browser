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

    try {
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
        .catch((err: Error) => {
          console.error('Failed to get theme color:', err);
        });
    } catch (err) {
      console.error('Error updating theme color:', err);
    }
  };

  // Update page info
  const updatePageInfo = () => {
    const webview = webviewRef.current;
    if (!webview) return;

    try {
      const url = webview.getURL();

      webview
        .executeJavaScript('document.title')
        .then((title: string) => {
          setPageTitle(title || 'Untitled');
        })
        .catch(() => {
          setPageTitle('Untitled');
        });

      if (url) {
        try {
          const urlObj = new URL(url);
          setPageDomain(urlObj.hostname);
        } catch (e) {
          setPageDomain(url);
        }
      }
    } catch (err) {
      console.error('Error updating page info:', err);
    }
  };

  // Start theme color monitoring
  const startThemeColorMonitoring = () => {
    updateThemeColor();

    let pollCount = 0;
    const fastInterval = setInterval(() => {
      updateThemeColor();
      pollCount++;
      if (pollCount >= 20) {
        clearInterval(fastInterval);
        const slowInterval = setInterval(updateThemeColor, 500);
        return () => clearInterval(slowInterval);
      }
    }, 50);

    return () => clearInterval(fastInterval);
  };

  // Setup webview event listeners
  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const handleDomReady = () => {
      console.log('Webview DOM ready');
      updatePageInfo();
      startThemeColorMonitoring();
    };

    const handleDidNavigate = () => {
      startThemeColorMonitoring();
      updatePageInfo();
    };

    const handleDidNavigateInPage = () => {
      updateThemeColor();
      setTimeout(updateThemeColor, 50);
      updatePageInfo();
    };

    const handleDidStartLoading = () => {
      setThemeColor('#000000');
      setTextColor('#ffffff');
    };

    const handleDidStopLoading = () => {
      startThemeColorMonitoring();
    };

    webview.addEventListener('dom-ready', handleDomReady);
    webview.addEventListener('did-navigate', handleDidNavigate);
    webview.addEventListener('did-navigate-in-page', handleDidNavigateInPage);
    webview.addEventListener('did-start-loading', handleDidStartLoading);
    webview.addEventListener('did-stop-loading', handleDidStopLoading);

    return () => {
      webview.removeEventListener('dom-ready', handleDomReady);
      webview.removeEventListener('did-navigate', handleDidNavigate);
      webview.removeEventListener('did-navigate-in-page', handleDidNavigateInPage);
      webview.removeEventListener('did-start-loading', handleDidStartLoading);
      webview.removeEventListener('did-stop-loading', handleDidStopLoading);
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
