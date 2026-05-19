import { ChevronDown, ChevronUp, X } from "lucide-react";
import { useEffect, useState } from "react";

interface FindInPageProps {
  onClose: () => void;
  theme: "light" | "dark";
}

export function FindInPage({ onClose, theme }: FindInPageProps) {
  const [query, setQuery] = useState("");
  const isDark = theme === "dark";

  useEffect(() => {
    return () => {
      window.electronAPI?.pageTools.stopFind();
    };
  }, []);

  const runFind = (nextQuery: string) => {
    setQuery(nextQuery);
    window.electronAPI?.pageTools.find(nextQuery, true);
  };

  const close = () => {
    window.electronAPI?.pageTools.stopFind();
    onClose();
  };

  return (
    <div className="fixed left-1/2 top-16 z-[60] -translate-x-1/2 [-webkit-app-region:no-drag]">
      <div
        className={`flex items-center gap-1 rounded-xl px-2 py-2 shadow-2xl ${
          isDark ? "bg-zinc-800 text-white" : "bg-white text-zinc-900"
        }`}
      >
        <input
          autoFocus
          value={query}
          onChange={(event) => runFind(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") close();
            if (event.key === "Enter" && event.shiftKey) {
              window.electronAPI?.pageTools.findPrevious(query);
            } else if (event.key === "Enter") {
              window.electronAPI?.pageTools.findNext(query);
            }
          }}
          className={`w-44 bg-transparent px-2 text-sm outline-none ${
            isDark ? "placeholder:text-zinc-500" : "placeholder:text-zinc-400"
          }`}
          placeholder="Find"
        />
        <button
          onClick={() => window.electronAPI?.pageTools.findPrevious(query)}
          className="rounded-md p-1 hover:bg-zinc-500/20"
        >
          <ChevronUp size={16} />
        </button>
        <button
          onClick={() => window.electronAPI?.pageTools.findNext(query)}
          className="rounded-md p-1 hover:bg-zinc-500/20"
        >
          <ChevronDown size={16} />
        </button>
        <button onClick={close} className="rounded-md p-1 hover:bg-zinc-500/20">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
