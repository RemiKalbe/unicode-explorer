import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { data } from "react-router";
import MiniSearch from "minisearch";
import type { Route } from "./+types/block";
import {
  getBlockBySlug,
  getCharCodesForBlock,
  parseHexSearch,
} from "~/data/unicode-blocks";
import { loadBlockNames, type CharacterNames } from "~/data/unicode-names.server";
import { Sidebar } from "~/components/layout/Sidebar";
import { MobileHeader, DesktopHeader } from "~/components/layout/Header";
import { CharGrid } from "~/components/layout/CharGrid";
import { CharDetailModal } from "~/components/ui/CharDetailModal";
import { Toast } from "~/components/ui/Toast";
import { useFavorites } from "~/hooks/useFavorites";

export function meta({ data }: Route.MetaArgs) {
  if (!data) {
    return [
      { title: "Block Not Found - Unicode Explorer" },
      { name: "description", content: "The requested Unicode block was not found." },
    ];
  }
  return [
    { title: `${data.block.name} - Unicode Explorer` },
    {
      name: "description",
      content: `Explore Unicode characters in the ${data.block.name} block (U+${data.block.start.toString(16).toUpperCase().padStart(4, "0")} - U+${data.block.end.toString(16).toUpperCase().padStart(4, "0")})`,
    },
  ];
}

export function loader({ params }: Route.LoaderArgs) {
  const block = getBlockBySlug(params.blockSlug);

  if (!block) {
    throw data(null, { status: 404, statusText: "Block not found" });
  }

  // Load character names server-side
  const names = loadBlockNames(block.slug);

  return { block, names };
}

// Helper to get character name from names object
function getCharName(names: CharacterNames, charCode: number): string | undefined {
  const hex = charCode.toString(16).toUpperCase();
  return names[hex];
}

export default function BlockPage({ loaderData }: Route.ComponentProps) {
  const { block, names } = loaderData;
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [modalChar, setModalChar] = useState<number | null>(null);
  const { favorites, toggleFavorite } = useFavorites();

  // Build MiniSearch index for character names
  const searchIndex = useMemo(() => {
    const index = new MiniSearch<{ id: string; name: string; code: number }>({
      fields: ["name"],
      storeFields: ["code"],
      searchOptions: {
        prefix: true,
        fuzzy: 0.2,
      },
    });

    // Convert names to documents for indexing
    const docs = Object.entries(names).map(([hex, name]) => ({
      id: hex,
      name,
      code: parseInt(hex, 16),
    }));

    index.addAll(docs);
    return index;
  }, [names]);

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

  const charCodes = useMemo(() => {
    // Check if searching for a specific hex code
    if (searchQuery.length >= 2) {
      const hexMatch = parseHexSearch(searchQuery);
      if (hexMatch !== null) {
        return [hexMatch];
      }

      // Search by character name using MiniSearch
      const results = searchIndex.search(searchQuery);
      if (results.length > 0) {
        return results.map((r) => r.code as number).sort((a, b) => a - b);
      }
    }
    return getCharCodesForBlock(block);
  }, [block, searchQuery, searchIndex]);

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
          title={block.name}
          onMenuClick={() => setIsSidebarOpen(true)}
        />
        <DesktopHeader
          title={block.name}
          category={block.cat}
          count={charCodes.length}
          range={{ start: block.start, end: block.end }}
        />

        <div className="flex-1 overflow-y-auto p-2 lg:p-6 custom-scrollbar">
          <CharGrid
            charCodes={charCodes}
            favorites={favorites}
            onCharClick={(code) => setModalChar(code)}
            onToggleFav={handleToggleFavorite}
          />
        </div>
      </main>

      {/* Detail Modal */}
      {modalChar !== null && (
        <CharDetailModal
          charCode={modalChar}
          charName={getCharName(names, modalChar)}
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
