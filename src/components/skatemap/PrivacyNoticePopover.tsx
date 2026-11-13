import React from 'react';
import { Info, ShieldCheck } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface PrivacyNoticePopoverProps {
  side?: 'top' | 'bottom';
  align?: 'start' | 'center' | 'end';
  className?: string;
  isMobile?: boolean;
}

export const PrivacyNoticePopover: React.FC<PrivacyNoticePopoverProps> = ({
  side = 'bottom',
  align = 'start',
  className,
}) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Adatkezelési tájékoztató"
          title="Adatkezelési tájékoztató"
          className={cn(
            'group cursor-pointer inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold select-none shrink-0',
            'premium-glass text-white border-white/20 hover:border-white/35 hover:bg-white/10 shadow-md backdrop-blur-xl',
            'active:scale-95 transition-all duration-200 focus:outline-none',
            className
          )}
        >
          <Info className="w-3.5 h-3.5 text-white/90 group-hover:text-white transition-colors shrink-0" />
          <span className="leading-none whitespace-nowrap tracking-tight">
            Adatkezelési tájékoztató
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        sideOffset={8}
        className="max-w-[290px] bg-neutral-900/95 border border-white/15 text-neutral-200 text-xs p-3.5 backdrop-blur-xl shadow-2xl rounded-2xl space-y-2 z-50"
      >
        <p className="font-bold text-white flex items-center gap-1.5 text-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-white" />
          Adatkezelési tájékoztató
        </p>
        <p className="text-[11px] text-neutral-300 leading-relaxed">
          A helyzetedet (GPS / IP koordinátáidat) kizárólag a böngésződben használjuk a térképen való megjelenítéshez.
        </p>
        <div className="pt-1.5 border-t border-white/10 text-[10px] text-neutral-400 space-y-1">
          <p>✓ Semmilyen személyes vagy helyadatot nem mentünk el.</p>
          <p>✓ Az adatokat nem használjuk fel semmire és nem továbbítjuk.</p>
          <p>✓ Az oldalon egyáltalán nincs reklám vagy hirdetés.</p>
        </div>
      </PopoverContent>
    </Popover>
  );
};
