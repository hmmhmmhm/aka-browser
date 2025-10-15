import { RefObject, useEffect } from 'react';

interface PhoneFrameProps {
  webContainerRef: RefObject<HTMLDivElement | null>;
  time: string;
  themeColor: string;
  textColor: string;
}

function PhoneFrame({ webContainerRef, time, themeColor, textColor }: PhoneFrameProps) {
  // Update WebContentsView bounds when component mounts or window resizes
  useEffect(() => {
    const updateBounds = () => {
      if (!webContainerRef.current) return;
      
      const rect = webContainerRef.current.getBoundingClientRect();
      // @ts-ignore - electronAPI is exposed via preload
      window.electronAPI?.webContents.setBounds({
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      });
    };

    // Initial bounds update with multiple attempts to ensure it's set
    setTimeout(updateBounds, 100);
    setTimeout(updateBounds, 300);
    setTimeout(updateBounds, 500);

    // Update bounds on window resize
    window.addEventListener('resize', updateBounds);

    return () => {
      window.removeEventListener('resize', updateBounds);
    };
  }, [webContainerRef]);

  return (
    <div className="absolute top-[72px] left-2 w-[calc(100%-16px)] h-[calc(100%-80px)] z-10 overflow-hidden rounded-[40px]">
      <div className="absolute top-0 left-0 w-full h-full rounded-[47px] bg-[#11111d] box-border pointer-events-none p-px">
        <div className="relative w-full h-full rounded-[46px] bg-[#54545b] box-border pointer-events-none p-px before:content-[''] before:absolute before:top-px before:left-px before:right-px before:bottom-px before:rounded-[45px] before:bg-[#525252] before:pointer-events-none before:z-0 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:right-0.5 after:bottom-0.5 after:rounded-[44px] after:bg-[#2b2c2c] after:pointer-events-none after:z-0">
          <div className="absolute top-[15px] left-[15px] right-[15px] bottom-[15px] rounded-[32px] overflow-hidden z-10 bg-transparent pointer-events-auto">
            <div 
              ref={webContainerRef}
              className="absolute top-[58px] left-0 w-full h-[calc(100%-58px)] rounded-b-[32px] overflow-hidden bg-white"
            />
            <div
              className="absolute top-0 left-0 right-0 h-[58px] z-[2] pointer-events-none rounded-t-[32px] overflow-hidden"
              style={{ backgroundColor: themeColor }}
            />
            <div className="absolute top-[11.5px] left-1/2 -translate-x-1/2 w-[120px] h-[35px] bg-black rounded-[20px] z-20 pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-[58px] flex justify-center items-center text-[15px] z-[15] bg-transparent rounded-t-[32px] overflow-hidden pointer-events-none" style={{ color: textColor }}>
              <div className="font-[590] absolute left-0 right-0 text-left pl-[calc((50%-60px)/2-10px)] text-[15px] tracking-[-0.3px]">
                {time}
              </div>
            </div>
          </div>
          <div className="absolute top-[7px] left-[7px] right-[7px] bottom-[7px] rounded-[40px] bg-transparent pointer-events-none box-border border-[8px] border-[#000100] z-[5]" />
        </div>
      </div>
    </div>
  );
}

export default PhoneFrame;
