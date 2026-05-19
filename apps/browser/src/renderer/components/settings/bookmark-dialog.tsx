import { X } from "lucide-react";
import { useI18n } from "../../i18n/i18n-context";
import { Bookmark } from "./types";

interface BookmarkDialogProps {
  editingBookmark: Bookmark | null;
  isDark: boolean;
  onCancel: () => void;
  onSave: () => void;
  setTitle: (title: string) => void;
  setUrl: (url: string) => void;
  title: string;
  url: string;
}

export function BookmarkDialog({
  editingBookmark,
  isDark,
  onCancel,
  onSave,
  setTitle,
  setUrl,
  title,
  url,
}: BookmarkDialogProps) {
  const isDisabled = !title.trim() || !url.trim();
  const { t } = useI18n();

  return (
    <div className="absolute inset-0 z-60 flex items-center justify-center bg-black bg-opacity-50 p-6">
      <div
        className={`w-full max-w-md rounded-2xl shadow-2xl ${
          isDark ? "bg-zinc-800" : "bg-white"
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            isDark ? "border-zinc-700" : "border-zinc-200"
          }`}
        >
          <h3
            className={`text-lg font-semibold ${
              isDark ? "text-white" : "text-zinc-900"
            }`}
          >
            {editingBookmark ? t("editFavorite") : t("addFavorite")}
          </h3>
          <button
            onClick={onCancel}
            className={`p-1 rounded-lg transition-colors ${
              isDark
                ? "hover:bg-zinc-700 text-zinc-400"
                : "hover:bg-zinc-100 text-zinc-600"
            }`}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <Field
            autoFocus
            isDark={isDark}
            label={t("title")}
            onChange={setTitle}
            placeholder={t("enterTitle")}
            type="text"
            value={title}
          />
          <Field
            isDark={isDark}
            label={t("url")}
            onChange={setUrl}
            placeholder="https://example.com"
            type="url"
            value={url}
          />
        </div>

        <div
          className={`flex gap-3 px-6 py-4 border-t ${
            isDark ? "border-zinc-700" : "border-zinc-200"
          }`}
        >
          <button
            onClick={onCancel}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              isDark
                ? "bg-zinc-700 hover:bg-zinc-600 text-white"
                : "bg-zinc-200 hover:bg-zinc-300 text-zinc-900"
            }`}
          >
            {t("cancel")}
          </button>
          <button
            onClick={onSave}
            disabled={isDisabled}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              isDisabled
                ? isDark
                  ? "bg-zinc-700 text-zinc-500 cursor-not-allowed"
                  : "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            {editingBookmark ? t("save") : t("addFavorite")}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  autoFocus,
  isDark,
  label,
  onChange,
  placeholder,
  type,
  value,
}: {
  autoFocus?: boolean;
  isDark: boolean;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  type: string;
  value: string;
}) {
  return (
    <div>
      <label
        className={`block text-sm font-medium mb-2 ${
          isDark ? "text-zinc-300" : "text-zinc-700"
        }`}
      >
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`w-full px-4 py-2 rounded-lg border ${
          isDark
            ? "bg-zinc-700 border-zinc-600 text-white placeholder-zinc-400"
            : "bg-white border-zinc-300 text-zinc-900 placeholder-zinc-500"
        } focus:outline-none focus:ring-2 focus:ring-blue-500`}
        autoFocus={autoFocus}
      />
    </div>
  );
}
