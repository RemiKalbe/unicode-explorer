import { useState, useMemo, useCallback, useRef } from "react";
import { data, useNavigate, Link } from "react-router";
import { Terminal, X, Copy, Heart } from "lucide-react";
import MiniSearch from "minisearch";
import type { Route } from "./+types/char";
import {
  getBlockByCodePoint,
  parseCodePoint,
  getCharCodesForBlock,
  parseHexSearch,
} from "~/data/unicode-blocks";
import { loadBlockNames, type CharacterNames } from "~/data/unicode-names.server";
import { Sidebar } from "~/components/layout/Sidebar";
import { MobileHeader, DesktopHeader } from "~/components/layout/Header";
import { CharGrid } from "~/components/layout/CharGrid";
import { Toast } from "~/components/ui/Toast";
import { useFavorites } from "~/hooks/useFavorites";
import { toHex, copyToClipboard, getCodeSnippets } from "~/lib/utils";

export function meta({ data, location }: Route.MetaArgs) {
  if (!data) {
    return [
      { title: "Character Not Found - Unicode Explorer" },
      { name: "description", content: "The requested Unicode character was not found." },
    ];
  }

  const { charCode, charName, block, hex, char } = data;
  const title = charName
    ? `${char} ${charName} (U+${hex}) - Unicode Explorer`
    : `${char} U+${hex} - Unicode Explorer`;
  const description = charName
    ? `Unicode character ${char} (U+${hex}) - ${charName}. Part of the ${block.name} block. Get HTML entities, CSS codes, and more.`
    : `Unicode character ${char} (U+${hex}) from the ${block.name} block. Get HTML entities, CSS codes, and more.`;

  // Get OG image URL - use the pathname to construct the relative path
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
    // Twitter Card - use large image card for better preview
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: ogImagePath },
    { name: "twitter:image:alt", content: imageAlt },
    // Additional SEO
    { name: "keywords", content: `unicode, ${charName || ""}, U+${hex}, ${block.name}, character, symbol, HTML entity` },
  ];
}

export function loader({ params }: Route.LoaderArgs) {
  const codepoint = params.codepoint;

  if (!codepoint) {
    throw data(null, { status: 400, statusText: "Code point is required" });
  }

  const charCode = parseCodePoint(codepoint);

  if (charCode === null) {
    throw data(null, { status: 400, statusText: "Invalid code point format" });
  }

  const block = getBlockByCodePoint(charCode);

  if (!block) {
    throw data(null, { status: 404, statusText: "Character not found in any Unicode block" });
  }

  // Load block names for both the modal and the background grid
  const names = loadBlockNames(block.slug);
  const hex = toHex(charCode);
  const char = String.fromCodePoint(charCode);
  const charName = getCharName(names, charCode);

  return { charCode, charName, block, hex, char, names };
}

// Helper to get character name from names object
function getCharName(names: CharacterNames, charCode: number): string | undefined {
  const hex = charCode.toString(16).toUpperCase().padStart(4, "0");
  return names[hex];
}

export default function CharacterPage({ loaderData }: Route.ComponentProps) {
  const { charCode, charName, block, hex, char, names } = loaderData;
  const snippets = getCodeSnippets(charCode);
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const { favorites, toggleFavorite } = useFavorites();

  const previewRef = useRef<HTMLDivElement>(null);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

  const isFav = favorites.includes(charCode);

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

    const docs = Object.entries(names).map(([h, name]) => ({
      id: h,
      name,
      code: parseInt(h, 16),
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

  const handleCopy = (text: string) => {
    copyToClipboard(text);
    showToast("Copied to clipboard");
  };

  const handleToggleFavorite = useCallback(
    (code: number) => {
      const wasFav = favorites.includes(code);
      toggleFavorite(code);
      showToast(wasFav ? "Removed from memory" : "Saved to memory");
    },
    [favorites, toggleFavorite, showToast]
  );

  const handleMouseMove = (e: React.MouseEvent) => {
    if (previewRef.current) {
      const rect = previewRef.current.getBoundingClientRect();
      setCursorPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const handleClose = () => {
    // Navigate to the block page (removing the modal)
    navigate(`/block/${block.slug}`);
  };

  const charCodes = useMemo(() => {
    if (searchQuery.length >= 2) {
      const hexMatch = parseHexSearch(searchQuery);
      if (hexMatch !== null) {
        return [hexMatch];
      }

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
            onCharClick={(code) => {
              // Navigate to the new character
              navigate(`/char/${toHex(code)}`);
            }}
            onToggleFav={handleToggleFavorite}
          />
        </div>
      </main>

      {/* Character Detail Modal - Pre-rendered open */}
      <div
        className="fixed inset-0 z-150 flex items-center justify-center p-4 bg-jean-700/20 dark:bg-darkzinc/80 backdrop-blur-sm"
        onClick={handleClose}
      >
        <div
          className="bg-softcreme-98 dark:bg-darkzinc border border-softcreme-82 dark:border-darkzinc-12 w-full max-w-2xl max-h-[90vh] md:max-h-none flex flex-col shadow-2xl relative overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Terminal Header Bar */}
          <div className="bg-softcreme-94 dark:bg-darkzinc-6 border-b border-softcreme-82 dark:border-darkzinc-12 p-2 flex items-center justify-between select-none shrink-0">
            <div className="flex items-center gap-2 text-olive-41 dark:text-olive-65 text-xs font-bold uppercase tracking-wide pl-2 min-w-0">
              <Terminal size={14} className="shrink-0" />
              <span className="shrink-0">Inspector :: U+{hex}</span>
              {charName && (
                <span className="text-lightzinc-10 dark:text-lightzinc-20 font-normal truncate" title={charName}>
                  {charName}
                </span>
              )}
            </div>
            <button
              onClick={handleClose}
              className="hover:bg-olive-53/10 dark:hover:bg-olive-65/20 hover:text-olive-41 dark:hover:text-olive-65 p-1 transition-colors text-lightzinc-10 active:bg-olive-53/20"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex flex-col md:flex-row h-full overflow-y-auto md:overflow-visible custom-scrollbar">
            {/* Big Preview */}
            <div className="md:w-1/3 bg-softcreme-98 dark:bg-darkzinc flex flex-col items-center justify-center min-h-[200px] md:min-h-[250px] border-b md:border-b-0 md:border-r border-softcreme-82 dark:border-darkzinc-12 relative shrink-0">
              <div className="absolute inset-0 bg-olive-53/5 dark:bg-olive-65/5 z-0 pointer-events-none"></div>

              {/* Box around char for bounding box visibility */}
              <div
                ref={previewRef}
                onMouseMove={handleMouseMove}
                onClick={() => handleCopy(char)}
                className="group relative border border-dashed border-softcreme-70/60 dark:border-darkzinc-15/60 hover:border-olive-53 dark:hover:border-olive-65 hover:bg-olive-53/5 dark:hover:bg-olive-65/10 transition-all p-6 min-w-[100px] min-h-[100px] md:min-w-[120px] md:min-h-[120px] flex items-center justify-center cursor-pointer hover:cursor-none overflow-hidden"
              >
                {/* Floating Cursor Badge */}
                <div
                  className="absolute z-30 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-75"
                  style={{
                    left: cursorPos.x,
                    top: cursorPos.y,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <div className="bg-olive-53 dark:bg-olive-65 text-white dark:text-black font-bold px-3 py-1 text-xs tracking-widest uppercase shadow-lg dark:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border border-olive-35 dark:border-black whitespace-nowrap">
                    Copy
                  </div>
                </div>

                <span className="text-6xl md:text-9xl text-darkzinc-21 dark:text-lightslate-8 group-hover:text-olive-41 dark:group-hover:text-olive-65 transition-colors font-serif select-none z-10 crt-flicker">
                  {char}
                </span>
              </div>
            </div>

            {/* Code Snippets */}
            <div className="md:w-2/3 p-4 md:p-6 grid grid-cols-1 gap-4 font-mono overflow-y-auto custom-scrollbar">
              {snippets.map((snip) => (
                <div key={snip.label} className="group">
                  <label className="text-[10px] font-bold text-lightzinc-10 group-hover:text-olive-41 dark:group-hover:text-olive-65 transition-colors uppercase tracking-widest mb-1 block">
                    {snip.label}
                  </label>
                  <div className="flex items-stretch h-9">
                    <div className="flex-1 flex items-center bg-softcreme-94 dark:bg-darkzinc-6 border border-softcreme-82 dark:border-darkzinc-12 px-3 text-darkzinc-21 dark:text-lightslate-8 text-xs md:text-sm truncate group-hover:border-olive-53/50 dark:group-hover:border-olive-65/60 transition-colors">
                      <span className="text-lightzinc-10 mr-2">$</span>
                      {snip.val}
                    </div>
                    <button
                      onClick={() => handleCopy(snip.val)}
                      className="flex items-center justify-center w-10 border-y border-r border-softcreme-82 dark:border-darkzinc-12 text-lightzinc-10 hover:text-olive-41 dark:hover:text-olive-65 hover:bg-olive-53/10 dark:hover:bg-olive-65/10 hover:border-olive-53/50 dark:hover:border-olive-65/60 transition-colors"
                      title="Copy"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>
              ))}

              <div className="mt-4 md:mt-6 pt-4 border-t border-softcreme-82 dark:border-darkzinc-12 flex justify-end items-center pb-2 md:pb-0">
                <button
                  onClick={() => handleToggleFavorite(charCode)}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase border transition-all active:scale-95 ${
                    isFav
                      ? "bg-olive-53 dark:bg-olive-65 text-white dark:text-black border-olive-53 dark:border-olive-65"
                      : "text-olive-41 dark:text-olive-65 border-olive-53/50 dark:border-olive-65/50 hover:bg-olive-53/10 dark:hover:bg-olive-65/10"
                  }`}
                >
                  <Heart size={14} fill={isFav ? "currentColor" : "none"} />
                  {isFav ? "Saved" : "Save to Memory"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* JSON-LD Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            "name": charName || `Unicode Character U+${hex}`,
            "description": `Unicode character ${char} (U+${hex})${charName ? ` - ${charName}` : ""}. Part of the ${block.name} block.`,
            "mainEntity": {
              "@type": "Thing",
              "name": charName || `U+${hex}`,
              "identifier": `U+${hex}`,
              "description": `Unicode code point ${charCode} (U+${hex})`,
            },
          }),
        }}
      />

      {/* Toast Notification */}
      {toastMsg && (
        <Toast message={toastMsg} onClose={() => setToastMsg(null)} />
      )}
    </div>
  );
}
