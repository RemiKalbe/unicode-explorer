import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Heart } from "lucide-react";
import { CharCard } from "~/components/ui/CharCard";

// Cell sizes: 60px on mobile, 100px on desktop (md breakpoint = 768px)
const CELL_SIZE_MOBILE = 60;
const CELL_SIZE_DESKTOP = 100;
const GAP = 1; // 1px gap between cells

interface CharGridProps {
  charCodes: number[];
  favorites: number[];
  onCharClick: (code: number) => void;
  onToggleFav: (code: number) => void;
  emptyMessage?: string;
  emptySubMessage?: string;
  blockSlug?: string;
}

export function CharGrid({
  charCodes,
  favorites,
  onCharClick,
  onToggleFav,
  emptyMessage = "No data found",
  emptySubMessage,
  blockSlug,
}: CharGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);

  // Track container width and viewport size
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
      setIsDesktop(window.innerWidth >= 768);
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener("resize", updateDimensions);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateDimensions);
    };
  }, []);

  // Reset scroll position when block changes
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [blockSlug]);

  // Calculate grid dimensions
  const cellSize = isDesktop ? CELL_SIZE_DESKTOP : CELL_SIZE_MOBILE;
  const columnCount = useMemo(() => {
    if (containerWidth === 0) return 1;
    // Calculate how many cells fit: (width + gap) / (cellSize + gap)
    return Math.max(1, Math.floor((containerWidth + GAP) / (cellSize + GAP)));
  }, [containerWidth, cellSize]);

  const rowCount = useMemo(() => {
    return Math.ceil(charCodes.length / columnCount);
  }, [charCodes.length, columnCount]);

  // Create a Set for O(1) favorite lookups
  const favoritesSet = useMemo(() => new Set(favorites), [favorites]);

  // Virtualizer for rows
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => containerRef.current,
    estimateSize: useCallback(() => cellSize + GAP, [cellSize]),
    overscan: 5, // Render 5 extra rows above/below for smoother scrolling
  });

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

  const virtualRows = rowVirtualizer.getVirtualItems();

  return (
    <div
      ref={containerRef}
      className="h-full overflow-auto custom-scrollbar"
      style={{ contain: "strict" }}
    >
      {/* Virtual scroll container */}
      <div
        className="relative w-full border border-softcreme-90 dark:border-darkzinc-6 bg-softcreme-90 dark:bg-darkzinc-6"
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
        }}
      >
        {virtualRows.map((virtualRow) => {
          const rowStartIndex = virtualRow.index * columnCount;
          const rowItems: number[] = [];

          for (let col = 0; col < columnCount; col++) {
            const itemIndex = rowStartIndex + col;
            if (itemIndex < charCodes.length) {
              rowItems.push(charCodes[itemIndex]);
            }
          }

          return (
            <div
              key={virtualRow.key}
              className="absolute left-0 right-0 flex"
              style={{
                top: `${virtualRow.start}px`,
                height: `${cellSize}px`,
                gap: `${GAP}px`,
              }}
            >
              {rowItems.map((code) => (
                <div
                  key={code}
                  style={{
                    width: `${cellSize}px`,
                    height: `${cellSize}px`,
                  }}
                >
                  <CharCard
                    charCode={code}
                    isFav={favoritesSet.has(code)}
                    onClick={onCharClick}
                    onFav={onToggleFav}
                  />
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
