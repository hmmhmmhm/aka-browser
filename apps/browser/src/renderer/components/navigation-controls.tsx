interface NavigationControlsProps {
  onBack: () => void;
  onForward: () => void;
  onRefresh: () => void;
  theme: 'light' | 'dark';
}

function NavigationControls({
  onBack,
  onForward,
  onRefresh,
  theme,
}: NavigationControlsProps) {
  const isDark = theme === 'dark';
  const buttonBaseClass = "w-7 h-7 rounded-md border-none cursor-pointer transition-all duration-150 flex items-center justify-center text-base active:scale-95";
  const buttonThemeClass = isDark
    ? "bg-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.7)] hover:bg-[rgba(255,255,255,0.15)] hover:text-[rgba(255,255,255,0.9)] active:bg-[rgba(255,255,255,0.1)]"
    : "bg-[rgba(0,0,0,0.06)] text-[rgba(0,0,0,0.6)] hover:bg-[rgba(0,0,0,0.1)] hover:text-[rgba(0,0,0,0.85)] active:bg-[rgba(0,0,0,0.08)]";

  return (
    <div className="flex gap-2.5 [-webkit-app-region:no-drag]">
      <button
        onClick={onBack}
        title="Back"
        className={`${buttonBaseClass} ${buttonThemeClass}`}
      >
        ←
      </button>
      <button
        onClick={onForward}
        title="Forward"
        className={`${buttonBaseClass} ${buttonThemeClass}`}
      >
        →
      </button>
      <button
        onClick={onRefresh}
        title="Refresh"
        className={`${buttonBaseClass} ${buttonThemeClass}`}
      >
        ↻
      </button>
    </div>
  );
}

export default NavigationControls;
