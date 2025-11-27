import { useState, useCallback } from "react";
import type { Route } from "./+types/favorites";
import { Sidebar } from "~/components/layout/Sidebar";
import { MobileHeader, DesktopHeader } from "~/components/layout/Header";
import { CharGrid } from "~/components/layout/CharGrid";
import { CharDetailModal } from "~/components/ui/CharDetailModal";
import { Toast } from "~/components/ui/Toast";
import { useFavorites } from "~/hooks/useFavorites";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Favorites - Unicode Explorer" },
    {
      name: "description",
      content: "Your saved Unicode characters",
    },
  ];
}

export default function FavoritesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [modalChar, setModalChar] = useState<number | null>(null);
  const { favorites, toggleFavorite } = useFavorites();

  // Auto-open sidebar on desktop
  useState(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      setIsSidebarOpen(true);
    }
  });

  const showToast = useCallback((msg: string) => setToastMsg(msg), []);

  const handleToggleFavorite = useCallback(
    (code: number) => {
      const wasFav = favorites.includes(code);
      toggleFavorite(code);
      showToast(wasFav ? "Removed from memory" : "Saved to memory");
    },
    [favorites, toggleFavorite, showToast]
  );

  return (
    <div className="flex h-screen bg-softcreme-98 dark:bg-darkzinc text-darkzinc-21 dark:text-lightzinc-40 font-mono overflow-hidden relative selection:bg-olive-88 dark:selection:bg-olive-35 selection:text-olive-41 dark:selection:text-olive-82">
      {/* CRT Scanline Overlay */}
      <div className="fixed inset-0 pointer-events-none z-9999 crt-overlay"></div>

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        favoritesCount={favorites.length}
      />

      <main className="flex-1 flex flex-col min-w-0 bg-softcreme-98 dark:bg-darkzinc relative">
        <MobileHeader
          title="Favorites"
          onMenuClick={() => setIsSidebarOpen(true)}
        />
        <DesktopHeader title="Favorites" count={favorites.length} />

        <div className="flex-1 overflow-y-auto p-2 lg:p-6 custom-scrollbar">
          <CharGrid
            charCodes={favorites}
            favorites={favorites}
            onCharClick={(code) => setModalChar(code)}
            onToggleFav={handleToggleFavorite}
            emptyMessage="Memory Empty"
            emptySubMessage="Mark sectors to save"
          />
        </div>
      </main>

      {/* Detail Modal */}
      {modalChar !== null && (
        <CharDetailModal
          charCode={modalChar}
          onClose={() => setModalChar(null)}
          onToggleFav={handleToggleFavorite}
          isFav={favorites.includes(modalChar)}
          onCopy={() => showToast("Copied to clipboard")}
        />
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <Toast message={toastMsg} onClose={() => setToastMsg(null)} />
      )}
    </div>
  );
}
