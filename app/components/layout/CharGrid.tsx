import { useRef, useEffect, useState, useMemo } from "react";
import { Heart } from "lucide-react";
import { CharCard } from "~/components/ui/CharCard";

const ITEMS_PER_PAGE = 200;

interface CharGridProps {
  charCodes: number[];
  favorites: number[];
  onCharClick: (code: number) => void;
  onToggleFav: (code: number) => void;
  emptyMessage?: string;
  emptySubMessage?: string;
}

export function CharGrid({
  charCodes,
  favorites,
  onCharClick,
  onToggleFav,
  emptyMessage = "No data found",
  emptySubMessage,
}: CharGridProps) {
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Reset visible count when charCodes change
  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [charCodes]);

  const displayChars = useMemo(() => {
    return charCodes.slice(0, visibleCount);
  }, [charCodes, visibleCount]);

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          if (displayChars.length < charCodes.length) {
            setVisibleCount((prev) => prev + ITEMS_PER_PAGE);
          }
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [displayChars.length, charCodes.length]);

  if (charCodes.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-lightzinc-10 dark:text-lightzinc-20">
        <div className="text-center border border-dashed border-softcreme-70 dark:border-darkzinc-12 p-12 bg-softcreme-94 dark:bg-darkzinc-9/30">
          <Heart
            size={48}
            className="mx-auto mb-4 opacity-30 text-olive-53 dark:text-olive-65"
          />
          <p className="text-lg font-bold text-olive-53/70 dark:text-olive-65/70">
            {emptyMessage}
          </p>
          {emptySubMessage && (
            <p className="text-xs mt-2 uppercase">{emptySubMessage}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Grid Container */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(60px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-px bg-softcreme-90 dark:bg-darkzinc-6 border border-softcreme-90 dark:border-darkzinc-6">
        {displayChars.map((code) => (
          <CharCard
            key={code}
            charCode={code}
            isFav={favorites.includes(code)}
            onClick={onCharClick}
            onFav={onToggleFav}
          />
        ))}
      </div>

      {/* Infinite Scroll Trigger */}
      <div
        ref={observerTarget}
        className="w-full h-24 flex items-center justify-center mt-8"
      >
        {displayChars.length < charCodes.length && (
          <div className="flex items-center gap-2 text-olive-41/70 dark:text-olive-65/70 text-xs bg-softcreme-94 dark:bg-darkzinc-9/50 px-4 py-2 border border-olive-53/30 dark:border-olive-65/30">
            <span className="animate-spin font-serif">/</span>
            Fetching data stream...
          </div>
        )}
      </div>
    </>
  );
}
