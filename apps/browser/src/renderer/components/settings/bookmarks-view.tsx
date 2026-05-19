import { ChevronLeft, Edit2, Plus, Star, Trash2 } from "lucide-react";
import { useI18n } from "../../i18n/i18n-context";
import { Bookmark } from "./types";

interface BookmarksViewProps {
  bookmarks: Bookmark[];
  isDark: boolean;
  onAdd: () => void;
  onBack: () => void;
  onDelete: (id: string) => void;
  onEdit: (bookmark: Bookmark) => void;
}

export function BookmarksView({
  bookmarks,
  isDark,
  onAdd,
  onBack,
  onDelete,
  onEdit,
}: BookmarksViewProps) {
  const { t } = useI18n();

  return (
    <>
      <div
        className={`flex items-center justify-between px-6 py-4 border-b ${
          isDark ? "border-zinc-700" : "border-zinc-300"
        }`}
      >
        <button
          onClick={onBack}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors font-medium text-sm ${
            isDark
              ? "hover:bg-zinc-800 text-white"
              : "hover:bg-zinc-200 text-zinc-900"
          }`}
        >
          <ChevronLeft size={20} />
          {t("back")}
        </button>
        <h2
          className={`text-xl font-semibold ${
            isDark ? "text-white" : "text-zinc-900"
          }`}
        >
          {t("favorites")}
        </h2>
        <button
          onClick={onAdd}
          className={`p-2 rounded-lg transition-colors ${
            isDark
              ? "hover:bg-zinc-800 text-white"
              : "hover:bg-zinc-200 text-zinc-900"
          }`}
          title={t("addFavorite")}
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {bookmarks.length === 0 ? (
          <EmptyState isDark={isDark} />
        ) : (
          <div className="space-y-2">
            {bookmarks.map((bookmark) => (
              <BookmarkRow
                key={bookmark.id}
                bookmark={bookmark}
                isDark={isDark}
                onDelete={onDelete}
                onEdit={onEdit}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function EmptyState({ isDark }: { isDark: boolean }) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Star
        size={64}
        className={`mb-4 ${isDark ? "text-zinc-700" : "text-zinc-300"}`}
      />
      <p className={`text-center ${isDark ? "text-zinc-500" : "text-zinc-600"}`}>
        {t("noFavorites")}
        <br />
        {t("noFavoritesHint")}
      </p>
    </div>
  );
}

function BookmarkRow({
  bookmark,
  isDark,
  onDelete,
  onEdit,
}: {
  bookmark: Bookmark;
  isDark: boolean;
  onDelete: (id: string) => void;
  onEdit: (bookmark: Bookmark) => void;
}) {
  const isDefault = bookmark.id.startsWith("default-");
  const { t } = useI18n();

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl ${
        isDark ? "bg-zinc-800" : "bg-white"
      }`}
    >
      <BookmarkIcon bookmark={bookmark} isDark={isDark} />
      <div className="flex-1 min-w-0">
        <div
          className={`text-sm font-medium truncate ${
            isDark ? "text-white" : "text-zinc-900"
          }`}
        >
          {bookmark.title}
        </div>
        <div
          className={`text-xs truncate ${
            isDark ? "text-zinc-500" : "text-zinc-600"
          }`}
        >
          {formatBookmarkHost(bookmark.url)}
        </div>
      </div>
      <div className="flex items-center gap-1">
        {!isDefault && (
          <button
            onClick={() => onEdit(bookmark)}
            className={`p-2 rounded-lg transition-colors ${
              isDark
                ? "hover:bg-zinc-700 text-zinc-400 hover:text-blue-400"
                : "hover:bg-zinc-100 text-zinc-600 hover:text-blue-600"
            }`}
            title={t("editFavorite")}
          >
            <Edit2 size={18} />
          </button>
        )}
        <button
          onClick={() => onDelete(bookmark.id)}
          className={`p-2 rounded-lg transition-colors ${
            isDark
              ? "hover:bg-zinc-700 text-zinc-400 hover:text-red-400"
              : "hover:bg-zinc-100 text-zinc-600 hover:text-red-600"
          }`}
          title={isDefault ? t("removeFromFavorites") : t("removeFromFavorites")}
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}

function BookmarkIcon({
  bookmark,
  isDark,
}: {
  bookmark: Bookmark;
  isDark: boolean;
}) {
  return (
    <div
      className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
        isDark ? "bg-zinc-700" : "bg-zinc-100"
      }`}
    >
      {bookmark.favicon ? (
        <img
          src={bookmark.favicon}
          alt=""
          className="w-6 h-6 object-cover"
          onError={(event) => {
            const target = event.target as HTMLImageElement;
            target.style.display = "none";
            const parent = target.parentElement;
            if (parent) parent.textContent = bookmark.title.charAt(0).toUpperCase();
          }}
        />
      ) : (
        <span
          className={`text-sm font-semibold ${
            isDark ? "text-zinc-400" : "text-zinc-600"
          }`}
        >
          {bookmark.title.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}

function formatBookmarkHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
