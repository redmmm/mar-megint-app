import React, { useEffect, useState } from 'react';
import { SkatemapEvent } from '@/types/event';
import { getActiveEvents } from '@/services/eventService';
import { X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const EventNotificationBanner: React.FC = () => {
  const [events, setEvents] = useState<SkatemapEvent[]>([]);
  const [currentEvent, setCurrentEvent] = useState<SkatemapEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const active = await getActiveEvents();
        setEvents(active);

        // Find the first event that hasn't been dismissed by the user
        const unDismissed = active.find(
          (evt) => !localStorage.getItem(`skatemap_dismissed_event_${evt.id}`)
        );

        if (unDismissed) {
          setCurrentEvent(unDismissed);
          // Trigger smooth spring entrance
          const timer = setTimeout(() => {
            setIsVisible(true);
          }, 400);
          return () => clearTimeout(timer);
        }
      } catch (err) {
        console.warn('Failed to load active events:', err);
      }
    };

    loadEvents();
  }, []);

  const handleDismiss = () => {
    if (!currentEvent) return;

    // Trigger smooth shrink/fade-out exit animation
    setIsDismissing(true);
    setIsVisible(false);

    // Save client-side dismissal in localStorage
    try {
      localStorage.setItem(`skatemap_dismissed_event_${currentEvent.id}`, 'true');
    } catch (e) {
      console.warn('Could not save dismissal state:', e);
    }

    setTimeout(() => {
      // Check if there is another undismissed event in queue
      const nextEvent = events.find(
        (evt) =>
          evt.id !== currentEvent.id &&
          !localStorage.getItem(`skatemap_dismissed_event_${evt.id}`)
      );

      if (nextEvent) {
        setCurrentEvent(nextEvent);
        setIsDismissing(false);
        setIsVisible(true);
      } else {
        setCurrentEvent(null);
        setIsDismissing(false);
      }
    }, 250);
  };

  if (!currentEvent) return null;

  return (
    <div
      role="region"
      aria-label="Esemény értesítés"
      className={cn(
        "fixed bottom-24 left-4 sm:left-6 z-20 pointer-events-auto max-w-sm sm:max-w-md w-[calc(100%-2rem)] sm:w-auto transition-all duration-300 ease-out",
        isVisible && !isDismissing
          ? "opacity-100 translate-y-0 scale-100"
          : "opacity-0 -translate-y-3 sm:-translate-y-4 scale-95 pointer-events-none"
      )}
    >
      <div className="relative overflow-hidden rounded-2xl bg-neutral-950/85 backdrop-blur-xl border border-white/15 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] p-4 sm:p-4.5 text-foreground flex items-start gap-3.5 group">
        {/* Subtle Apple-style top highlight line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />

        {/* Icon / Emoji Badge */}
        <div className="w-10 h-10 rounded-xl bg-white/[0.08] border border-white/10 flex items-center justify-center shrink-0 text-xl select-none shadow-inner">
          {currentEvent.icon || '🏆'}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-6">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-black tracking-tight text-white leading-snug">
              {currentEvent.title}
            </h4>
          </div>
          <p className="text-xs text-neutral-300 mt-1 leading-relaxed line-clamp-3">
            {currentEvent.message}
          </p>

          {/* Optional CTA Link button */}
          {currentEvent.link_url && (
            <div className="mt-3">
              <Button
                asChild
                size="sm"
                className="h-7 px-3 text-[11px] font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 rounded-xl gap-1.5 shadow-sm transition-all hover:scale-[1.02] active:scale-95"
              >
                <a
                  href={currentEvent.link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>{currentEvent.link_text || 'Részletek'}</span>
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </a>
              </Button>
            </div>
          )}
        </div>

        {/* Apple style close button ("X") */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Értesítés bezárása"
          title="Bezárás"
          className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-neutral-400 hover:text-white flex items-center justify-center transition-colors active:scale-90 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
