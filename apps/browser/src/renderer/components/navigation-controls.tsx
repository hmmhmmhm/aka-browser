interface NavigationControlsProps {
  onBack: () => void;
  onForward: () => void;
  onRefresh: () => void;
}

function NavigationControls({
  onBack,
  onForward,
  onRefresh,
}: NavigationControlsProps) {
  return (
    <div className="flex gap-2.5 [-webkit-app-region:no-drag]">
      <button
        onClick={onBack}
        title="Back"
        className="w-7 h-7 rounded-md border-none bg-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.7)] cursor-pointer transition-all duration-150 flex items-center justify-center text-base hover:bg-[rgba(255,255,255,0.15)] hover:text-[rgba(255,255,255,0.9)] active:bg-[rgba(255,255,255,0.1)] active:scale-95"
      >
        ←
      </button>
      <button
        onClick={onForward}
        title="Forward"
        className="w-7 h-7 rounded-md border-none bg-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.7)] cursor-pointer transition-all duration-150 flex items-center justify-center text-base hover:bg-[rgba(255,255,255,0.15)] hover:text-[rgba(255,255,255,0.9)] active:bg-[rgba(255,255,255,0.1)] active:scale-95"
      >
        →
      </button>
      <button
        onClick={onRefresh}
        title="Refresh"
        className="w-7 h-7 rounded-md border-none bg-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.7)] cursor-pointer transition-all duration-150 flex items-center justify-center text-base hover:bg-[rgba(255,255,255,0.15)] hover:text-[rgba(255,255,255,0.9)] active:bg-[rgba(255,255,255,0.1)] active:scale-95"
      >
        ↻
      </button>
    </div>
  );
}

export default NavigationControls;
