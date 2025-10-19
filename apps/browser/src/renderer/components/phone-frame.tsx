import { RefObject, useEffect } from "react";
import StatusBar from "./status-bar";

interface PhoneFrameProps {
  webContainerRef: RefObject<HTMLDivElement | null>;
  orientation: "portrait" | "landscape";
  themeColor: string;
  textColor: string;
  showTabOverview?: boolean;
  isFullscreen?: boolean;
  tabOverviewContent?: React.ReactNode;
}

function PhoneFrame({
  webContainerRef,
  orientation,
  themeColor,
  textColor,
  showTabOverview,
  isFullscreen,
  tabOverviewContent,
}: PhoneFrameProps) {
  const isLandscape = orientation === "landscape";
  // Update WebContentsView bounds when component mounts or window resizes
  useEffect(() => {
    const updateBounds = () => {
      if (!webContainerRef.current) return;

      const rect = webContainerRef.current.getBoundingClientRect();
      const isLandscape = orientation === 'landscape';
      
      // Status bar dimensions
      const statusBarHeight = 58;
      const statusBarWidth = 58;
      
      // In fullscreen mode, apply -30px offset
      if (isFullscreen) {
        // Fullscreen mode: apply offset to move content closer to edges
        window.electronAPI?.webContents.setBounds({
          x: Math.round(rect.x + (isLandscape ? statusBarWidth - 30 : 0)),
          y: Math.round(rect.y + (isLandscape ? 0 : statusBarHeight - 30)),
          width: Math.round(rect.width - (isLandscape ? statusBarWidth : 0)),
          height: Math.round(rect.height - (isLandscape ? 0 : statusBarHeight)),
        });
      } else {
        // Normal mode: standard positioning
        window.electronAPI?.webContents.setBounds({
          x: Math.round(rect.x + (isLandscape ? statusBarWidth : 0)),
          y: Math.round(rect.y + (isLandscape ? 0 : statusBarHeight)),
          width: Math.round(rect.width - (isLandscape ? statusBarWidth : 0)),
          height: Math.round(rect.height - (isLandscape ? 0 : statusBarHeight)),
        });
      }
    };

    // Initial bounds update with multiple attempts to ensure it's set
    setTimeout(updateBounds, 100);
    setTimeout(updateBounds, 300);
    setTimeout(updateBounds, 500);

    // Update bounds on window resize
    window.addEventListener("resize", updateBounds);

    return () => {
      window.removeEventListener("resize", updateBounds);
    };
  }, [webContainerRef, orientation, isFullscreen]);

  return (
    <div
      className={`absolute overflow-visible transition-all duration-300 ${
        isLandscape
          ? "top-[72px] left-3 w-[calc(100%-24px)] h-[calc(100%-80px)]"
          : "top-[72px] left-2 w-[calc(100%-16px)] h-[calc(100%-80px)]"
      }`}
      style={{ zIndex: 9999 }}
    >
      {/* Device frame - visual only, clicks pass through */}
      <div className="absolute top-0 left-0 w-full h-full rounded-[47px] bg-[#11111d] box-border pointer-events-none p-px transition-transform duration-300 overflow-hidden">
        <div className="relative w-full h-full rounded-[46px] bg-[#54545b] box-border pointer-events-none p-px overflow-hidden before:content-[''] before:absolute before:top-px before:left-px before:right-px before:bottom-px before:rounded-[45px] before:bg-[#525252] before:pointer-events-none before:z-0 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:right-0.5 after:bottom-0.5 after:rounded-[44px] after:bg-[#2b2c2c] after:pointer-events-none after:z-0">
          <div className="absolute top-[15px] left-[15px] right-[15px] bottom-[15px] rounded-[32px] overflow-hidden z-10 bg-black pointer-events-none">
            {/* Web content area - positioned for WebContentsView */}
            <div 
              ref={webContainerRef}
              className="absolute top-0 left-0 right-0 bottom-0 bg-black overflow-hidden rounded-[32px] pointer-events-none"
            />
            {/* Status bar - React component on top (hidden in fullscreen) */}
            {!isFullscreen && (
              <StatusBar 
                themeColor={themeColor}
                textColor={textColor}
                orientation={orientation}
              />
            )}
            {/* Tab overview overlay - React component */}
            {showTabOverview && (
              <div className="absolute top-0 left-0 right-0 bottom-0 rounded-[32px] overflow-hidden z-50 pointer-events-auto">
                {tabOverviewContent}
              </div>
            )}
          </div>
          <div className="absolute top-[7px] left-[7px] right-[7px] bottom-[7px] rounded-[40px] bg-transparent pointer-events-none box-border border-[8px] border-[#000100] z-[5]" />
        </div>
      </div>
    </div>
  );
}

export default PhoneFrame;
