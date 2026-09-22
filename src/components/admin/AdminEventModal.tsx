import React, { useEffect, useState } from 'react';
import { SkatemapEvent, CreateEventInput, UpdateEventInput } from '@/types/event';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2, Calendar, Sparkles, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AdminEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingEvent: SkatemapEvent | null;
  onSave: (event: CreateEventInput | UpdateEventInput) => Promise<void>;
}

const PRESET_ICONS = ['🏆', '🛹', '🎉', '📢', '⚡', '🔥', '🌧️', '📍', '🥇', '🎵'];

// Helper to convert ISO string to datetime-local input format (YYYY-MM-DDTHH:mm)
const toDatetimeLocal = (isoString?: string): string => {
  if (!isoString) return '';
  const date = new Date(isoString);
  const offset = date.getTimezoneOffset() * 60000;
  const localDate = new Date(date.getTime() - offset);
  return localDate.toISOString().slice(0, 16);
};

export const AdminEventModal: React.FC<AdminEventModalProps> = ({
  isOpen,
  onClose,
  editingEvent,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [icon, setIcon] = useState('🏆');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingEvent) {
      setTitle(editingEvent.title);
      setMessage(editingEvent.message);
      setIcon(editingEvent.icon || '🏆');
      setLinkUrl(editingEvent.link_url || '');
      setLinkText(editingEvent.link_text || '');
      setStartAt(toDatetimeLocal(editingEvent.start_at));
      setEndAt(toDatetimeLocal(editingEvent.end_at));
      setIsActive(editingEvent.is_active);
    } else {
      // Default: starts now, ends in 3 days
      const now = new Date();
      const threeDaysLater = new Date(Date.now() + 86400000 * 3);
      setTitle('');
      setMessage('');
      setIcon('🏆');
      setLinkUrl('');
      setLinkText('Részletek');
      setStartAt(toDatetimeLocal(now.toISOString()));
      setEndAt(toDatetimeLocal(threeDaysLater.toISOString()));
      setIsActive(true);
    }
  }, [editingEvent, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanTitle = title.trim();
    const cleanMessage = message.trim();

    if (!cleanTitle || cleanTitle.length > 60) {
      toast.error('A cím kötelező és legfeljebb 60 karakter lehet!');
      return;
    }

    if (!cleanMessage || cleanMessage.length > 250) {
      toast.error('Az üzenet kötelező és legfeljebb 250 karakter lehet!');
      return;
    }

    if (!startAt || !endAt) {
      toast.error('Kérjük, add meg a kezdő és záró időpontot!');
      return;
    }

    const startDate = new Date(startAt);
    const endDate = new Date(endAt);

    if (endDate <= startDate) {
      toast.error('A lejárati időpontnak a kezdő időpont után kell lennie!');
      return;
    }

    setIsSubmitting(true);

    try {
      await onSave({
        title: cleanTitle,
        message: cleanMessage,
        icon: icon.trim() || '🏆',
        link_url: linkUrl.trim() || undefined,
        link_text: linkText.trim() || undefined,
        start_at: startDate.toISOString(),
        end_at: endDate.toISOString(),
        is_active: isActive,
      });

      onClose();
    } catch (err: any) {
      console.error('Save event error:', err);
      toast.error(err?.message || 'Nem sikerült elmenteni az eseményt.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto bg-neutral-950/95 border border-white/10 backdrop-blur-2xl text-foreground shadow-2xl">
        <DialogHeader className="space-y-1 text-left">
          <DialogTitle className="text-xl font-black tracking-tight text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-400" />
            {editingEvent ? 'Esemény / Értesítés Szerkesztése' : 'Új Esemény / Értesítés Létrehozása'}
          </DialogTitle>
          <DialogDescription className="text-xs text-neutral-400">
            Időzített, lebegő Apple-stílusú értesítő ablak a Győri Skatemap látogatói számára.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Title */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="event-title" className="text-xs font-bold text-neutral-200">
                Esemény Címe <span className="text-emerald-400">*</span>
              </Label>
              <span className="text-[10px] text-neutral-400 font-mono">
                {title.length}/60
              </span>
            </div>
            <Input
              id="event-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Pl.: Győri Tavaszi Skate Jam"
              maxLength={60}
              required
              className="bg-white/[0.04] border-white/10 text-white placeholder:text-neutral-500 text-xs rounded-xl"
            />
          </div>

          {/* Message */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="event-message" className="text-xs font-bold text-neutral-200">
                Értesítés Szövege <span className="text-emerald-400">*</span>
              </Label>
              <span className="text-[10px] text-neutral-400 font-mono">
                {message.length}/250
              </span>
            </div>
            <Textarea
              id="event-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Pl.: Találkozzunk a Radó-szigeten szombat 15:00-kor! Best trick és zene..."
              maxLength={250}
              rows={3}
              required
              className="bg-white/[0.04] border-white/10 text-white placeholder:text-neutral-500 text-xs rounded-xl resize-none"
            />
          </div>

          {/* Icon / Emoji Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-neutral-200">
              Ikon / Emoji Kiválasztása
            </Label>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 flex-wrap flex-1">
                {PRESET_ICONS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setIcon(preset)}
                    className={cn(
                      "w-8 h-8 rounded-lg border text-base flex items-center justify-center transition-all cursor-pointer",
                      icon === preset
                        ? "bg-emerald-500/20 border-emerald-400 scale-110 shadow-sm"
                        : "bg-white/[0.03] border-white/10 hover:bg-white/[0.08]"
                    )}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <Input
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="🏆"
                maxLength={4}
                className="w-14 text-center bg-white/[0.04] border-white/10 text-white font-mono text-xs rounded-xl"
                title="Egyedi emoji megadása"
              />
            </div>
          </div>

          {/* Date & Time Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="start-at" className="text-xs font-bold text-neutral-200">
                Megjelenés Kezdete <span className="text-emerald-400">*</span>
              </Label>
              <Input
                id="start-at"
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                required
                className="bg-white/[0.04] border-white/10 text-white text-xs rounded-xl font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end-at" className="text-xs font-bold text-neutral-200">
                Megjelenés Vége <span className="text-emerald-400">*</span>
              </Label>
              <Input
                id="end-at"
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                required
                className="bg-white/[0.04] border-white/10 text-white text-xs rounded-xl font-mono"
              />
            </div>
          </div>

          {/* Optional CTA Link */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="link-url" className="text-xs font-bold text-neutral-200">
                Gomb Link URL (opcionális)
              </Label>
              <Input
                id="link-url"
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://instagram.com/..."
                className="bg-white/[0.04] border-white/10 text-white placeholder:text-neutral-500 text-xs rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="link-text" className="text-xs font-bold text-neutral-200">
                Gomb Szövege (opcionális)
              </Label>
              <Input
                id="link-text"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                placeholder="Pl.: Részletek / Instagram"
                maxLength={30}
                className="bg-white/[0.04] border-white/10 text-white placeholder:text-neutral-500 text-xs rounded-xl"
              />
            </div>
          </div>

          {/* Active Switch */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <div>
              <Label htmlFor="is-active-toggle" className="text-xs font-bold text-neutral-200 cursor-pointer">
                Értesítés Aktív Állapota
              </Label>
              <p className="text-[11px] text-neutral-400">
                Ha kikapcsolod, az értesítés a megadott időtartamon belül sem fog megjelenni.
              </p>
            </div>
            <Switch
              id="is-active-toggle"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          {/* Live Apple-Style Preview */}
          <div className="space-y-1.5 pt-1">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Élő Előnézet (ahogy a térképen fog megjelenni)
            </Label>
            <div className="relative overflow-hidden rounded-2xl bg-neutral-950/90 border border-white/15 p-3.5 text-foreground flex items-start gap-3 shadow-lg">
              <div className="w-9 h-9 rounded-xl bg-white/[0.08] border border-white/10 flex items-center justify-center shrink-0 text-lg select-none">
                {icon || '🏆'}
              </div>
              <div className="flex-1 min-w-0 pr-4">
                <h4 className="text-xs font-black text-white leading-tight truncate">
                  {title || 'Esemény Címe'}
                </h4>
                <p className="text-[11px] text-neutral-300 mt-1 leading-relaxed line-clamp-2">
                  {message || 'Itt fog megjelenni a beállított értesítés szövege...'}
                </p>
                {linkUrl && (
                  <div className="mt-2">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-white/10 text-white border border-white/15">
                      {linkText || 'Részletek'}
                      <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2 flex flex-row items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-9 px-3 text-xs border-white/10"
            >
              Mégse
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !title.trim() || !message.trim()}
              className="h-9 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Mentés...
                </>
              ) : (
                'Esemény Mentése'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
