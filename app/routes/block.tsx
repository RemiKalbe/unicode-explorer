import { useState, useMemo, useCallback, useEffect } from "react";
import { data, useNavigate, useSearchParams } from "react-router";
import type { Route } from "./+types/block";
import {
  getBlockBySlug,
  getCharCodesForBlock,
  parseHexSearch,
  parseCodePoint,
} from "~/data/unicode-blocks";
import {
  loadBlockNames,
  searchAllBlocks,
  type CharacterNames,
  type GlobalSearchResults,
} from "~/data/unicode-names.server";
import { Sidebar } from "~/components/layout/Sidebar";
import { MobileHeader, DesktopHeader } from "~/components/layout/Header";
import { CharGrid } from "~/components/layout/CharGrid";
import { CharDetailModal } from "~/components/ui/CharDetailModal";
import { Toast } from "~/components/ui/Toast";
import { useFavorites } from "~/hooks/useFavorites";
import { toHex } from "~/lib/utils";

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

export function loader({ params, request }: Route.LoaderArgs) {
  const block = getBlockBySlug(params.blockSlug);

  if (!block) {
    throw data(null, { status: 404, statusText: "Block not found" });
  }

  // Load character names server-side
  const names = loadBlockNames(block.slug);

  // Check for search query in URL params
  const url = new URL(request.url);
  const searchQuery = url.searchParams.get("q") || "";

  // Perform global search if there's a query
  let globalSearchResults: GlobalSearchResults = {};
  if (searchQuery.length >= 2) {
    // Check if it's a hex search first
    const hexMatch = parseHexSearch(searchQuery);
    if (hexMatch === null) {
      // Not a hex search, do name search across all blocks
      globalSearchResults = searchAllBlocks(searchQuery);
    }
  }

  return { block, names, searchQuery, globalSearchResults };
}

// Helper to get character name from names object
function getCharName(names: CharacterNames, charCode: number): string | undefined {
  // Pad hex to at least 4 characters to match the JSON keys (e.g., "0180" not "180")
  const hex = charCode.toString(16).toUpperCase().padStart(4, "0");
  return names[hex];
}

export default function BlockPage({ loaderData }: Route.ComponentProps) {
  const { block, names, searchQuery: initialSearchQuery, globalSearchResults } = loaderData;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const { favorites, toggleFavorite } = useFavorites();

  // Get modal char from URL search params
  const charParam = searchParams.get("char");
  const modalChar = charParam ? parseCodePoint(charParam) : null;

  // Sync search query with URL
  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchQuery(query);
      // Debounce URL update
      const timeoutId = setTimeout(() => {
        const params = new URLSearchParams(searchParams);
        if (query) {
          params.set("q", query);
        } else {
          params.delete("q");
        }
        navigate(`/block/${block.slug}${params.toString() ? `?${params}` : ""}`, { replace: true });
      }, 300);
      return () => clearTimeout(timeoutId);
    },
    [navigate, block.slug, searchParams]
  );

  // Auto-open sidebar on desktop
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      setIsSidebarOpen(true);
    }
  }, []);

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

      // Use global search results for current block
      const blockResults = globalSearchResults[block.slug];
      if (blockResults && blockResults.length > 0) {
        return blockResults;
      }

      // If searching but no results for this block, show empty
      if (Object.keys(globalSearchResults).length > 0) {
        return [];
      }
    }
    return getCharCodesForBlock(block);
  }, [block, searchQuery, globalSearchResults]);

  return (
    <div className="flex h-screen bg-softcreme-98 dark:bg-darkzinc text-darkzinc-21 dark:text-lightzinc-40 font-mono overflow-hidden relative selection:bg-olive-88 dark:selection:bg-olive-35 selection:text-olive-41 dark:selection:text-olive-82">
      {/* CRT Scanline Overlay */}
      <div className="fixed inset-0 pointer-events-none z-9999 crt-overlay"></div>

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        favoritesCount={favorites.length}
        globalSearchResults={globalSearchResults}
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
            onCharClick={(code) => {
              // Update URL with char param to open modal
              const params = new URLSearchParams(searchParams);
              params.set("char", toHex(code));
              setSearchParams(params);
            }}
            onToggleFav={handleToggleFavorite}
          />
        </div>
      </main>

      {/* Detail Modal - shown when char param is in URL */}
      {modalChar !== null && (
        <CharDetailModal
          charCode={modalChar}
          charName={getCharName(names, modalChar)}
          onClose={() => {
            // Remove char param to close modal
            const params = new URLSearchParams(searchParams);
            params.delete("char");
            setSearchParams(params);
          }}
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
