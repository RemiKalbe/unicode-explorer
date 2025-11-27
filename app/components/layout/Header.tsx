import { Menu, ChevronRight, Hash, Maximize2 } from "lucide-react";
import { toHex } from "~/lib/utils";

interface HeaderProps {
  title: string;
  category?: string;
  count: number;
  range?: { start: number; end: number };
  onMenuClick: () => void;
}

export function MobileHeader({ title, onMenuClick }: Pick<HeaderProps, "title" | "onMenuClick">) {
  return (
    <header className="lg:hidden h-14 border-b border-softcreme-82 dark:border-darkzinc-12 flex items-center justify-between px-4 bg-softcreme-98 dark:bg-darkzinc z-10 sticky top-0">
      <button
        onClick={onMenuClick}
        className="text-lightzinc-10 hover:text-olive-41 dark:hover:text-olive-65 p-2 -ml-2 active:bg-softcreme-90 dark:active:bg-darkzinc-15 rounded"
      >
        <Menu size={20} />
      </button>
      <span className="font-bold text-olive-41 dark:text-olive-65 uppercase text-xs tracking-wider truncate crt-flicker max-w-[200px] text-center">
        {title}
      </span>
      <div className="w-8 flex justify-end">
        {/* Spacer or optional action */}
      </div>
    </header>
  );
}

export function DesktopHeader({ title, category, count, range }: Omit<HeaderProps, "onMenuClick">) {
  const viewType = category ? "DB" : "USR";
  const catLabel = category?.toUpperCase() || "FAV";

  return (
    <div className="hidden lg:flex h-16 border-b border-softcreme-82 dark:border-darkzinc-12 items-center justify-between px-6 bg-softcreme-98 dark:bg-darkzinc">
      <div>
        <div className="flex items-center gap-2 text-lightzinc-10 dark:text-lightzinc-20 text-[10px] uppercase tracking-wider mb-1">
          <span>Root</span>
          <ChevronRight
            size={10}
            className="text-lightzinc-20 dark:text-lightzinc-4"
          />
          <span>{viewType}</span>
          <ChevronRight
            size={10}
            className="text-lightzinc-20 dark:text-lightzinc-4"
          />
          <span className="text-olive-41 dark:text-olive-65/80 font-bold">
            {catLabel}
          </span>
        </div>
        <h2 className="text-lg font-bold text-olive-41 dark:text-olive-65 uppercase tracking-tight crt-flicker">
          {title}
        </h2>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-4 px-4 py-2 border border-softcreme-82 dark:border-darkzinc-12 bg-softcreme-94 dark:bg-darkzinc-6/50 text-[10px] text-lightzinc-10 dark:text-lightzinc-20 font-bold uppercase">
          <div className="flex items-center gap-2">
            <Hash
              size={12}
              className="text-olive-47 dark:text-olive-65/50"
            />
            <span>
              Count:{" "}
              <span className="text-olive-41 dark:text-olive-65">{count}</span>
            </span>
          </div>
          <div className="w-px h-3 bg-softcreme-70 dark:bg-darkzinc-15"></div>
          <div className="flex items-center gap-2">
            <Maximize2
              size={12}
              className="text-olive-47 dark:text-olive-65/50"
            />
            <span>
              Range:{" "}
              <span className="text-olive-41 dark:text-olive-65">
                {range
                  ? `${toHex(range.start)}:${toHex(range.end)}`
                  : "N/A"}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
