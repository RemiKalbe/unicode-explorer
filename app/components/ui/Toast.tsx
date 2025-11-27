import { useEffect } from "react";
import { Check } from "lucide-react";

interface ToastProps {
  message: string;
  onClose: () => void;
}

export function Toast({ message, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 right-6 z-200 animate-slide-in-from-bottom">
      <div className="bg-softcreme-98 dark:bg-darkzinc-3 text-olive-41 dark:text-olive-65 px-4 py-2 font-mono text-sm border border-olive-53 dark:border-olive-65 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]">
        <div className="flex items-center gap-2">
          <Check size={16} />
          <span className="font-bold uppercase">{message}</span>
        </div>
      </div>
    </div>
  );
}
