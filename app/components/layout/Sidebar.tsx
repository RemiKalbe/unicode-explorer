import { Link, useLocation } from "react-router";
import { Terminal, X, Heart, Scan } from "lucide-react";
import {
  UNICODE_BLOCKS,
  CATEGORIES,
  searchBlocks,
  parseHexSearch,
  type UnicodeBlock,
} from "~/data/unicode-blocks";
import type { GlobalSearchResults } from "~/data/unicode-names.server";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  favoritesCount: number;
  globalSearchResults?: GlobalSearchResults;
  filterBlock?: string;
}

export function Sidebar({
  isOpen,
  onClose,
  searchQuery,
  onSearchChange,
  favoritesCount,
  globalSearchResults = {},
  filterBlock = "",
}: SidebarProps) {
  const location = useLocation();
  const isFavoritesPage = location.pathname === "/favorites";
  const currentBlockSlug = location.pathname.startsWith("/block/")
    ? location.pathname.replace("/block/", "")
    : null;

  // Determine which blocks to show based on search
  const hasGlobalResults = Object.keys(globalSearchResults).length > 0;
  const isNameSearch = searchQuery.length >= 2 && parseHexSearch(searchQuery) === null;

  // Calculate total results for "All Results" option
  const totalResults = Object.values(globalSearchResults).reduce(
    (sum, codes) => sum + codes.length,
    0
  );

  // If searching by name and have results, only show blocks with matches
  // Otherwise, filter by block name as before
  const filteredBlocks = isNameSearch && hasGlobalResults
    ? UNICODE_BLOCKS.filter((b) => globalSearchResults[b.slug]?.length > 0)
    : searchBlocks(searchQuery);

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 dark:bg-black/80 z-20 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-30 w-80 bg-softcreme-98 dark:bg-darkzinc border-r border-softcreme-82 dark:border-darkzinc-12 transform transition-transform duration-300 ease-out lg:relative lg:translate-x-0 flex flex-col shadow-2xl lg:shadow-none
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-softcreme-82 dark:border-darkzinc-12 flex items-center gap-3 bg-softcreme-94 dark:bg-darkzinc-6">
          <div className="w-8 h-8 flex items-center justify-center bg-olive-53 text-white dark:text-black font-bold rounded-sm shrink-0">
            <Terminal size={18} />
          </div>
          <div className="min-w-0">
            <Link to="/">
              <h1 className="text-lg font-bold tracking-tight text-olive-41 dark:text-olive-65 crt-flicker truncate">
                UNICODE_EXPLORER
              </h1>
            </Link>
            <div className="text-[10px] text-olive-47 dark:text-olive-65/70 uppercase tracking-widest flex items-center gap-1">
              Unicode 15.0 &bull; UTF-8
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden ml-auto p-2 text-lightzinc-10 hover:text-olive-53 dark:hover:text-olive-65"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-softcreme-82 dark:border-darkzinc-12">
          <div className="relative group">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-olive-41 dark:text-olive-65 font-bold group-focus-within:text-olive-35 dark:group-focus-within:text-olive-53">
              {">_"}
            </div>
            <input
              type="text"
              placeholder="Search blocks, hex, or name..."
              className="w-full bg-softcreme-98 dark:bg-darkzinc-9/50 border border-softcreme-70 dark:border-darkzinc-21 py-3 pl-9 pr-4 text-base lg:text-xs font-medium text-darkzinc-6 dark:text-olive-53 focus:outline-none focus:border-olive-53 dark:focus:border-olive-65 focus:bg-softcreme-98 dark:focus:bg-black transition-colors placeholder:text-lightzinc-10 dark:placeholder:text-lightzinc-10 rounded-none appearance-none"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              spellCheck="false"
            />
          </div>
        </div>

        {/* Nav List */}
        <nav className="flex-1 overflow-y-auto px-0 pb-4 custom-scrollbar">
          <div className="space-y-0">
            <Link
              to="/favorites"
              onClick={onClose}
              className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase transition-colors border-b border-softcreme-82 dark:border-darkzinc-12 ${
                isFavoritesPage
                  ? "bg-olive-94 dark:bg-olive-53/10 text-olive-41 dark:text-olive-65 border-olive-76 dark:border-olive-65/30"
                  : "text-lightzinc-10 dark:text-lightzinc-10 hover:text-olive-41 dark:hover:text-olive-53 hover:bg-softcreme-94 dark:hover:bg-darkzinc-9/50 active:bg-softcreme-90 dark:active:bg-darkzinc-15"
              }`}
            >
              <Heart
                size={14}
                fill={isFavoritesPage ? "currentColor" : "none"}
              />
              Favorites
              <span
                className={`ml-auto text-[10px] border px-1.5 ${
                  isFavoritesPage
                    ? "border-olive-53 dark:border-olive-65/50"
                    : "border-softcreme-70 dark:border-darkzinc-21"
                }`}
              >
                {favoritesCount}
              </span>
            </Link>

            <div className="h-4"></div>

            {/* Show "All Results" option when searching */}
            {isNameSearch && hasGlobalResults && (
              <Link
                to={`/block/${currentBlockSlug || UNICODE_BLOCKS[0].slug}?q=${encodeURIComponent(searchQuery)}`}
                onClick={onClose}
                className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase transition-colors border-b border-softcreme-82 dark:border-darkzinc-12 ${
                  !filterBlock
                    ? "bg-olive-94 dark:bg-olive-53/10 text-olive-41 dark:text-olive-65 border-olive-76 dark:border-olive-65/30"
                    : "text-lightzinc-10 dark:text-lightzinc-10 hover:text-olive-41 dark:hover:text-olive-53 hover:bg-softcreme-94 dark:hover:bg-darkzinc-9/50 active:bg-softcreme-90 dark:active:bg-darkzinc-15"
                }`}
              >
                <Scan size={14} />
                All Results
                <span
                  className={`ml-auto text-[10px] border px-1.5 ${
                    !filterBlock
                      ? "border-olive-53 dark:border-olive-65/50"
                      : "border-softcreme-70 dark:border-darkzinc-21"
                  }`}
                >
                  {totalResults}
                </span>
              </Link>
            )}

            {CATEGORIES.map((cat) => {
              const catBlocks = filteredBlocks.filter((b) => b.cat === cat);
              if (catBlocks.length === 0) return null;

              return (
                <div key={cat} className="mb-0">
                  <div className="px-4 py-2 text-[10px] font-bold text-lightzinc-10 dark:text-lightzinc-20 uppercase tracking-[0.1em] border-b border-softcreme-82 dark:border-darkzinc-12/40 mt-2 mb-1 flex items-center gap-2">
                    <Scan
                      size={10}
                      className="text-lightzinc-20 dark:text-lightzinc-10"
                    />
                    {cat}
                  </div>
                  {catBlocks.map((block) => {
                    const hitCount = globalSearchResults[block.slug]?.length || 0;
                    // When searching, clicking a block filters to that specific block
                    const blockUrl = isNameSearch && searchQuery
                      ? `/block/${block.slug}?q=${encodeURIComponent(searchQuery)}&filterBlock=${block.slug}`
                      : `/block/${block.slug}`;
                    const isFilteredToThisBlock = filterBlock === block.slug;
                    return (
                      <Link
                        key={block.name}
                        to={blockUrl}
                        onClick={onClose}
                        className={`w-full text-left px-4 py-3 md:py-1.5 text-xs font-medium transition-colors flex items-center justify-between group ${
                          isFilteredToThisBlock
                            ? "bg-olive-53 dark:bg-olive-65 text-white dark:text-black"
                            : "text-darkzinc-21 dark:text-lightzinc-40 hover:text-olive-41 dark:hover:text-olive-53 hover:bg-softcreme-94 dark:hover:bg-darkzinc-9/50 active:bg-softcreme-90 dark:active:bg-darkzinc-15"
                        }`}
                      >
                        <span className="truncate pr-2">{block.name}</span>
                        {isNameSearch && hitCount > 0 ? (
                          <span className={`text-[10px] px-1.5 ${
                            isFilteredToThisBlock
                              ? "bg-white/20 dark:bg-black/20"
                              : "bg-olive-88 dark:bg-olive-35/30 text-olive-41 dark:text-olive-65"
                          }`}>
                            {hitCount}
                          </span>
                        ) : currentBlockSlug === block.slug && !isNameSearch ? (
                          <span className="font-bold">{"<"}</span>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </nav>

        <div className="p-3 border-t border-softcreme-82 dark:border-darkzinc-12 bg-softcreme-94 dark:bg-darkzinc-6 text-[10px] text-lightzinc-10 dark:text-lightzinc-20 text-center font-mono">
          Unicode 15.0 &bull; UTF-8
        </div>
      </aside>
    </>
  );
}
