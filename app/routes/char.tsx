import { useRef, useState, useCallback } from "react";
import { data, Link, useNavigate } from "react-router";
import { Terminal, X, Copy, Heart, ArrowLeft, ExternalLink } from "lucide-react";
import type { Route } from "./+types/char";
import {
  getBlockByCodePoint,
  parseCodePoint,
} from "~/data/unicode-blocks";
import { loadCharacterName } from "~/data/unicode-names.server";
import { toHex, copyToClipboard, getCodeSnippets } from "~/lib/utils";
import { useFavorites } from "~/hooks/useFavorites";
import { Toast } from "~/components/ui/Toast";

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

  // Load character name
  const charName = loadCharacterName(block.slug, charCode);
  const hex = toHex(charCode);
  const char = String.fromCodePoint(charCode);

  return { charCode, charName, block, hex, char };
}

export default function CharacterPage({ loaderData }: Route.ComponentProps) {
  const { charCode, charName, block, hex, char } = loaderData;
  const snippets = getCodeSnippets(charCode);
  const navigate = useNavigate();

  const previewRef = useRef<HTMLDivElement>(null);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const { favorites, toggleFavorite } = useFavorites();

  const isFav = favorites.includes(charCode);

  const showToast = useCallback((msg: string) => setToastMsg(msg), []);

  const handleCopy = (text: string) => {
    copyToClipboard(text);
    showToast("Copied to clipboard");
  };

  const handleToggleFavorite = useCallback(() => {
    const wasFav = favorites.includes(charCode);
    toggleFavorite(charCode);
    showToast(wasFav ? "Removed from memory" : "Saved to memory");
  }, [favorites, toggleFavorite, charCode, showToast]);

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
    // Try to go back, or navigate to the block
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(`/block/${block.slug}`);
    }
  };

  return (
    <div className="min-h-screen bg-softcreme-98 dark:bg-darkzinc text-darkzinc-21 dark:text-lightzinc-40 font-mono selection:bg-olive-88 dark:selection:bg-olive-35 selection:text-olive-41 dark:selection:text-olive-82">
      {/* CRT Scanline Overlay */}
      <div className="fixed inset-0 pointer-events-none z-9999 crt-overlay"></div>

      {/* Main Content */}
      <div className="min-h-screen flex flex-col">
        {/* Navigation Header */}
        <header className="border-b border-softcreme-82 dark:border-darkzinc-12 bg-softcreme-94 dark:bg-darkzinc-6">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleClose}
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-lightzinc-10 hover:text-olive-41 dark:hover:text-olive-65 transition-colors"
              >
                <ArrowLeft size={16} />
                <span className="hidden sm:inline">Back</span>
              </button>
              <div className="h-4 w-px bg-softcreme-82 dark:bg-darkzinc-12"></div>
              <Link
                to={`/block/${block.slug}`}
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-olive-41 dark:text-olive-65 hover:underline"
              >
                <span>{block.name}</span>
                <ExternalLink size={12} />
              </Link>
            </div>
            <button
              onClick={handleClose}
              className="hover:bg-olive-53/10 dark:hover:bg-olive-65/20 hover:text-olive-41 dark:hover:text-olive-65 p-2 transition-colors text-lightzinc-10 active:bg-olive-53/20"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Character Detail Content */}
        <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
          <article className="bg-softcreme-98 dark:bg-darkzinc border border-softcreme-82 dark:border-darkzinc-12 w-full max-w-2xl shadow-2xl">
            {/* Terminal Header Bar */}
            <header className="bg-softcreme-94 dark:bg-darkzinc-6 border-b border-softcreme-82 dark:border-darkzinc-12 p-2 flex items-center justify-between select-none">
              <div className="flex items-center gap-2 text-olive-41 dark:text-olive-65 text-xs font-bold uppercase tracking-wide pl-2 min-w-0">
                <Terminal size={14} className="shrink-0" />
                <h1 className="shrink-0">Inspector :: U+{hex}</h1>
                {charName && (
                  <span className="text-lightzinc-10 dark:text-lightzinc-20 font-normal truncate" title={charName}>
                    {charName}
                  </span>
                )}
              </div>
              <button
                onClick={handleClose}
                className="hover:bg-olive-53/10 dark:hover:bg-olive-65/20 hover:text-olive-41 dark:hover:text-olive-65 p-1 transition-colors text-lightzinc-10 active:bg-olive-53/20"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </header>

            <div className="flex flex-col md:flex-row">
              {/* Big Preview */}
              <div className="md:w-1/3 bg-softcreme-98 dark:bg-darkzinc flex flex-col items-center justify-center min-h-[200px] md:min-h-[250px] border-b md:border-b-0 md:border-r border-softcreme-82 dark:border-darkzinc-12 relative shrink-0">
                <div className="absolute inset-0 bg-olive-53/5 dark:bg-olive-65/5 z-0 pointer-events-none"></div>

                {/* Box around char for bounding box visibility */}
                <div
                  ref={previewRef}
                  onMouseMove={handleMouseMove}
                  onClick={() => handleCopy(char)}
                  className="group relative border border-dashed border-softcreme-70/60 dark:border-darkzinc-15/60 hover:border-olive-53 dark:hover:border-olive-65 hover:bg-olive-53/5 dark:hover:bg-olive-65/10 transition-all p-6 min-w-[100px] min-h-[100px] md:min-w-[120px] md:min-h-[120px] flex items-center justify-center cursor-pointer hover:cursor-none overflow-hidden"
                  role="button"
                  aria-label={`Copy character ${char}`}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      handleCopy(char);
                    }
                  }}
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
              <div className="md:w-2/3 p-4 md:p-6 grid grid-cols-1 gap-4 font-mono">
                {snippets.map((snip) => (
                  <div key={snip.label} className="group">
                    <label className="text-[10px] font-bold text-lightzinc-10 group-hover:text-olive-41 dark:group-hover:text-olive-65 transition-colors uppercase tracking-widest mb-1 block">
                      {snip.label}
                    </label>
                    <div className="flex items-stretch h-9">
                      <div className="flex-1 flex items-center bg-softcreme-94 dark:bg-darkzinc-6 border border-softcreme-82 dark:border-darkzinc-12 px-3 text-darkzinc-21 dark:text-lightslate-8 text-xs md:text-sm truncate group-hover:border-olive-53/50 dark:group-hover:border-olive-65/60 transition-colors">
                        <span className="text-lightzinc-10 mr-2">$</span>
                        <code>{snip.val}</code>
                      </div>
                      <button
                        onClick={() => handleCopy(snip.val)}
                        className="flex items-center justify-center w-10 border-y border-r border-softcreme-82 dark:border-darkzinc-12 text-lightzinc-10 hover:text-olive-41 dark:hover:text-olive-65 hover:bg-olive-53/10 dark:hover:bg-olive-65/10 hover:border-olive-53/50 dark:hover:border-olive-65/60 transition-colors"
                        title="Copy"
                        aria-label={`Copy ${snip.label}`}
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>
                ))}

                <div className="mt-4 md:mt-6 pt-4 border-t border-softcreme-82 dark:border-darkzinc-12 flex justify-between items-center">
                  <Link
                    to={`/block/${block.slug}`}
                    className="text-xs font-bold uppercase tracking-wide text-lightzinc-10 hover:text-olive-41 dark:hover:text-olive-65 transition-colors"
                  >
                    View all in {block.name}
                  </Link>
                  <button
                    onClick={handleToggleFavorite}
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
          </article>
        </main>
      </div>

      {/* Toast Notification */}
      {toastMsg && (
        <Toast message={toastMsg} onClose={() => setToastMsg(null)} />
      )}
    </div>
  );
}
