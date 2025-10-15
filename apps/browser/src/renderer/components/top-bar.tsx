import { useState } from "react";
import WindowControls from "./window-controls";
import NavigationControls from "./navigation-controls";

interface TopBarProps {
  pageTitle: string;
  pageDomain: string;
  currentUrl: string;
  onNavigate: (url: string) => void;
  onBack: () => void;
  onForward: () => void;
  onRefresh: () => void;
}

function TopBar({
  pageTitle,
  pageDomain,
  currentUrl,
  onNavigate,
  onBack,
  onForward,
  onRefresh,
}: TopBarProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [urlInput, setUrlInput] = useState("");

  const handleTitleClick = () => {
    setIsEditing(true);
    setUrlInput(currentUrl);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      // Clean the URL input by trimming and removing any control characters
      const cleanUrl = urlInput.trim().replace(/[\x00-\x1F\x7F]/g, "");
      onNavigate(cleanUrl);
      setIsEditing(false);
    } else if (e.key === "Escape") {
      setIsEditing(false);
    }
  };

  const handleBlur = () => {
    setTimeout(() => setIsEditing(false), 100);
  };

  return (
    <div className="h-[52px] flex items-center justify-start px-5 mx-2 my-2 mb-3 bg-[rgba(40,40,40,0.95)] backdrop-blur-[40px] backdrop-saturate-[180%] rounded-xl [-webkit-app-region:drag] gap-3">
      <WindowControls />

      <div
        className={`text-[13px] font-medium tracking-[0.3px] text-[rgba(255,255,255,0.85)] flex flex-col gap-0.5 flex-1 min-w-0 overflow-hidden cursor-pointer [-webkit-app-region:no-drag] px-2 py-1 rounded-md transition-colors duration-150 ${
          isEditing
            ? "bg-[rgba(255,255,255,0.1)] cursor-text"
            : "hover:bg-[rgba(255,255,255,0.05)]"
        }`}
        onClick={!isEditing ? handleTitleClick : undefined}
      >
        {isEditing ? (
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            autoFocus
            className="w-full bg-transparent border-none outline-none text-[rgba(255,255,255,0.85)] text-[13px] font-medium font-[inherit] p-0 m-0 placeholder:text-[rgba(255,255,255,0.4)]"
            placeholder="Enter URL..."
          />
        ) : (
          <>
            <div className="text-[13px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis">
              {pageTitle}
            </div>
            <div className="text-[11px] text-[rgba(255,255,255,0.5)] font-normal whitespace-nowrap overflow-hidden text-ellipsis">
              {pageDomain}
            </div>
          </>
        )}
      </div>

      <NavigationControls
        onBack={onBack}
        onForward={onForward}
        onRefresh={onRefresh}
      />
    </div>
  );
}

export default TopBar;
