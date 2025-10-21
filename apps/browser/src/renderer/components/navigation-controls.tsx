import { MoreVertical } from 'lucide-react';

interface NavigationControlsProps {
  onShowTabs: () => void;
  onRefresh: () => void;
  onShowMenu: () => void;
  theme: 'light' | 'dark';
  tabCount: number;
}

function NavigationControls({
  onShowTabs,
  onRefresh,
  onShowMenu,
  theme,
  tabCount,
}: NavigationControlsProps) {
  const isDark = theme === 'dark';
  const buttonBaseClass = "w-7 h-7 rounded-md border-none cursor-pointer transition-all duration-150 flex items-center justify-center text-base active:scale-95";
  const buttonThemeClass = isDark
    ? "bg-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.7)] hover:bg-[rgba(255,255,255,0.15)] hover:text-[rgba(255,255,255,0.9)] active:bg-[rgba(255,255,255,0.1)]"
    : "bg-[rgba(0,0,0,0.06)] text-[rgba(0,0,0,0.6)] hover:bg-[rgba(0,0,0,0.1)] hover:text-[rgba(0,0,0,0.85)] active:bg-[rgba(0,0,0,0.08)]";

  return (
    <div className="flex gap-2.5 [-webkit-app-region:no-drag]">
      <button
        onClick={onRefresh}
        title="Refresh"
        className={`${buttonBaseClass} ${buttonThemeClass}`}
      >
        ↻
      </button>
      <button
        onClick={onShowTabs}
        title="Show tabs"
        className={`${buttonBaseClass} ${buttonThemeClass} relative`}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="3" width="12" height="3" rx="1" fill="currentColor" opacity="0.6"/>
          <rect x="2" y="7" width="12" height="3" rx="1" fill="currentColor" opacity="0.8"/>
          <rect x="2" y="11" width="12" height="3" rx="1" fill="currentColor"/>
        </svg>
        {tabCount > 1 && (
          <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center ${
            isDark ? 'bg-white text-zinc-900' : 'bg-zinc-600 text-white'
          }`}>
            {tabCount > 9 ? '9+' : tabCount}
          </span>
        )}
      </button>
      <button
        onClick={onShowMenu}
        title="Menu"
        className={`${buttonBaseClass} ${buttonThemeClass}`}
      >
        <MoreVertical size={16} strokeWidth={2} />
      </button>
    </div>
  );
}

export default NavigationControls;
