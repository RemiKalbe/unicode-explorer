import { memo } from "react";
import { Heart } from "lucide-react";
import { toHex } from "~/lib/utils";

interface CharCardProps {
  charCode: number;
  isFav: boolean;
  onClick: (code: number) => void;
  onFav: (code: number) => void;
}

export const CharCard = memo(function CharCard({
  charCode,
  isFav,
  onClick,
  onFav,
}: CharCardProps) {
  const char = String.fromCodePoint(charCode);

  return (
    <div
      className="relative group bg-softcreme-98 dark:bg-darkzinc z-0 hover:z-20 p-2 flex flex-col items-center justify-center aspect-square cursor-pointer transition-none hover:ring-2 hover:ring-inset hover:ring-olive-53 dark:hover:ring-olive-65 hover:bg-softcreme-99 dark:hover:bg-darkzinc-9"
      onClick={() => onClick(charCode)}
    >
      {/* Content - Wrapped in a bounding box to show invisible chars */}
      <div className="relative z-10 w-full flex-1 flex items-center justify-center mb-1">
        <div className="min-w-[2em] min-h-[2em] flex items-center justify-center border border-dashed border-softcreme-70/30 dark:border-darkzinc-15/40 group-hover:border-transparent rounded-sm transition-colors">
          <span className="text-2xl md:text-4xl text-darkzinc-21 dark:text-lightslate-8 group-hover:text-olive-41 dark:group-hover:text-olive-65 font-unicode text-center leading-none transition-colors crt-flicker">
            {char}
          </span>
        </div>
      </div>

      <div className="relative z-10 text-[8px] md:text-[10px] font-mono text-lightzinc-10 dark:text-lightzinc-20 group-hover:text-olive-41 dark:group-hover:text-olive-65 w-full flex justify-between px-1 transition-colors">
        <span>U+</span>
        <span>{toHex(charCode)}</span>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onFav(charCode);
        }}
        className={`absolute top-1 right-1 p-1.5 md:p-1 z-20 transition-colors active:scale-125 ${
          isFav
            ? "text-olive-53 dark:text-olive-65"
            : "text-lightzinc-20 hover:text-olive-53 dark:hover:text-olive-65"
        }`}
      >
        <Heart
          size={12}
          className="md:w-2.5 md:h-2.5"
          fill={isFav ? "currentColor" : "none"}
        />
      </button>
    </div>
  );
});
