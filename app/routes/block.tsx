import { useState, useMemo, useCallback, useEffect } from "react";
import { data, useNavigate, useSearchParams } from "react-router";
import type { Route } from "./+types/block";
import {
  getBlockBySlug,
  getCharCodesForBlock,
  parseHexSearch,
  parseCodePoint,
  getBlockByCodePoint,
} from "~/data/unicode-blocks";
import {
  loadBlockNames,
  searchAllBlocks,
  loadCharacterName,
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

  const { block, selectedChar } = data;

  // If a character is selected via ?char= param, show character-specific meta with OG image
  if (selectedChar) {
    const { hex, char, charName } = selectedChar;
    const title = charName
      ? `${char} ${charName} (U+${hex}) - Unicode Explorer`
      : `${char} U+${hex} - Unicode Explorer`;
    const description = charName
      ? `Unicode character ${char} (U+${hex}) - ${charName}. Part of the ${block.name} block. Get HTML entities, CSS codes, and more.`
      : `Unicode character ${char} (U+${hex}) from the ${block.name} block. Get HTML entities, CSS codes, and more.`;
    const ogImagePath = `/og/${hex}.png`;
    const imageAlt = charName
      ? `Unicode character ${char} - ${charName}`
      : `Unicode character ${char} (U+${hex})`;

    return [
      { title },
      { name: "description", content: description },
      // Open Graph
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:image", content: ogImagePath },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: imageAlt },
      // Twitter Card
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: ogImagePath },
      { name: "twitter:image:alt", content: imageAlt },
      // Additional SEO
      { name: "keywords", content: `unicode, ${charName || ""}, U+${hex}, ${block.name}, character, symbol, HTML entity` },
    ];
  }

  // Default block meta (no character selected)
  const blockDescription = `Explore Unicode characters in the ${block.name} block (U+${block.start.toString(16).toUpperCase().padStart(4, "0")} - U+${block.end.toString(16).toUpperCase().padStart(4, "0")})`;

  return [
    { title: `${block.name} - Unicode Explorer` },
    { name: "description", content: blockDescription },
    // Open Graph for block
    { property: "og:title", content: `${block.name} - Unicode Explorer` },
    { property: "og:description", content: blockDescription },
    { property: "og:type", content: "website" },
    // Twitter Card for block
    { name: "twitter:card", content: "summary" },
    { name: "twitter:title", content: `${block.name} - Unicode Explorer` },
    { name: "twitter:description", content: blockDescription },
  ];
}

export function loader({ params, request }: Route.LoaderArgs) {
  const block = getBlockBySlug(params.blockSlug);

  if (!block) {
    throw data(null, { status: 404, statusText: "Block not found" });
  }

  // Check for search query, filter, and char selection in URL params
  const url = new URL(request.url);
  const searchQuery = url.searchParams.get("q") || "";
  const filterBlock = url.searchParams.get("filterBlock") || "";
  const charParam = url.searchParams.get("char");

  // Parse selected character for OG meta tags
  let selectedChar: { charCode: number; hex: string; char: string; charName: string | undefined } | null = null;
  if (charParam) {
    const charCode = parseCodePoint(charParam);
    if (charCode !== null) {
      const charBlock = getBlockByCodePoint(charCode);
      if (charBlock) {
        const hex = charCode.toString(16).toUpperCase().padStart(4, "0");
        const char = String.fromCodePoint(charCode);
        const charName = loadCharacterName(charBlock.slug, charCode);
        selectedChar = { charCode, hex, char, charName };
      }
    }
  }

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

  // Load character names - for current block or all blocks with results
  let names: CharacterNames = {};
  const hasGlobalResults = Object.keys(globalSearchResults).length > 0;

  if (hasGlobalResults && !filterBlock) {
    // Load names for all blocks with results (for showing all results)
    for (const blockSlug of Object.keys(globalSearchResults)) {
      const blockNames = loadBlockNames(blockSlug);
      names = { ...names, ...blockNames };
    }
  } else {
    // Load names only for current block
    names = loadBlockNames(block.slug);
  }

  return { block, names, searchQuery, filterBlock, globalSearchResults, selectedChar };
}

// Helper to get character name from names object
function getCharName(names: CharacterNames, charCode: number): string | undefined {
  // Pad hex to at least 4 characters to match the JSON keys (e.g., "0180" not "180")
  const hex = charCode.toString(16).toUpperCase().padStart(4, "0");
  return names[hex];
}

export default function BlockPage({ loaderData }: Route.ComponentProps) {
  const { block, names, searchQuery: initialSearchQuery, filterBlock, globalSearchResults } = loaderData;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const { favorites, toggleFavorite } = useFavorites();

  // Determine if we're showing all results or filtered to a block
  const hasGlobalResults = Object.keys(globalSearchResults).length > 0;
  const isShowingAllResults = hasGlobalResults && !filterBlock;

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
        // Clear filterBlock when search changes (show all results for new search)
        params.delete("filterBlock");
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

      // If we have global search results
      if (hasGlobalResults) {
        if (filterBlock) {
          // Filter to specific block
          return globalSearchResults[filterBlock] || [];
        } else {
          // Show ALL results from ALL blocks
          const allResults: number[] = [];
          for (const codes of Object.values(globalSearchResults)) {
            allResults.push(...codes);
          }
          return allResults.sort((a, b) => a - b);
        }
      }
    }
    return getCharCodesForBlock(block);
  }, [block, searchQuery, globalSearchResults, filterBlock, hasGlobalResults]);

  // Calculate total results count for header
  const totalResultsCount = useMemo(() => {
    if (!hasGlobalResults) return 0;
    return Object.values(globalSearchResults).reduce((sum, codes) => sum + codes.length, 0);
  }, [globalSearchResults, hasGlobalResults]);

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
        filterBlock={filterBlock}
      />

      <main className="flex-1 flex flex-col min-w-0 bg-softcreme-98 dark:bg-darkzinc relative">
        <MobileHeader
          title={isShowingAllResults ? `Search: "${searchQuery}"` : (filterBlock ? `${block.name} (filtered)` : block.name)}
          onMenuClick={() => setIsSidebarOpen(true)}
        />
        <DesktopHeader
          title={isShowingAllResults ? `Search Results for "${searchQuery}"` : (filterBlock ? block.name : block.name)}
          category={isShowingAllResults ? "Search" : (filterBlock ? `${block.cat} (filtered)` : block.cat)}
          count={charCodes.length}
          range={isShowingAllResults ? undefined : { start: block.start, end: block.end }}
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
