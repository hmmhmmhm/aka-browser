import { useState, useEffect } from 'react';

interface StatusBarProps {
  themeColor: string;
  textColor: string;
  orientation: 'portrait' | 'landscape';
}

function StatusBar({ themeColor, textColor, orientation }: StatusBarProps) {
  const [time, setTime] = useState('9:41');
  const isLandscape = orientation === 'landscape';

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

  return (
    <div
      className={`absolute ${
        isLandscape
          ? 'top-0 left-0 bottom-0 w-[58px] rounded-l-[32px]'
          : 'top-0 left-0 right-0 h-[58px] rounded-t-[32px]'
      } flex items-center justify-center transition-colors duration-300`}
      style={{ backgroundColor: themeColor, zIndex: 50, pointerEvents: 'none' }}
    >
      {/* Dynamic Island */}
      <div
        className={`absolute bg-black z-20 ${
          isLandscape
            ? 'top-1/2 left-[11.5px] -translate-y-1/2 w-[35px] h-[120px] rounded-[20px]'
            : 'top-[11.5px] left-1/2 -translate-x-1/2 w-[120px] h-[35px] rounded-[20px]'
        }`}
      />

      {/* Time Display */}
      <div
        className={`absolute text-[15px] font-semibold tracking-tight z-15 ${
          isLandscape
            ? 'bottom-[calc((50%-60px)/2-10px)] left-1/2 -translate-x-1/2 -rotate-90 origin-center whitespace-nowrap'
            : 'left-[calc((50%-60px)/2-35px)] top-1/2 -translate-y-1/2'
        }`}
        style={{ color: textColor }}
      >
        {time}
      </div>
    </div>
  );
}

export default StatusBar;
