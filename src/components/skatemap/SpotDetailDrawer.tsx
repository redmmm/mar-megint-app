import React from 'react';
import { Spot } from '@/types/spot';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { MapPin, Navigation, Copy, Check, ExternalLink, Image as ImageIcon, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { SpotReportModal } from './SpotReportModal';

interface SpotDetailDrawerProps {
  spot: Spot | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SpotDetailDrawer: React.FC<SpotDetailDrawerProps> = ({ spot, isOpen, onClose }) => {
  const [copied, setCopied] = React.useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = React.useState(false);

  if (!spot) return null;

  const handleCopyCoords = () => {
    const coords = `${spot.latitude.toFixed(6)}, ${spot.longitude.toFixed(6)}`;
    navigator.clipboard.writeText(coords);
    setCopied(true);
    toast.success('Koordináták vágólapra másolva!');
    setTimeout(() => setCopied(false), 2000);
  };

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${spot.latitude},${spot.longitude}`;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 bg-neutral-950/80 backdrop-blur-2xl border-l border-white/10 flex flex-col h-full overflow-hidden text-foreground"
      >
        {/* Spot Image Carousel or Cover */}
        <div className="relative w-full aspect-video bg-neutral-900 border-b border-white/10 shrink-0">
          {spot.images && spot.images.length > 0 ? (
            spot.images.length === 1 ? (
              <img
                src={spot.images[0]}
                alt={spot.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <Carousel className="w-full h-full">
                <CarouselContent className="h-full ml-0">
                  {spot.images.map((imgUrl, idx) => (
                    <CarouselItem key={idx} className="pl-0 h-full">
                      <div className="relative w-full h-full aspect-video">
                        <img
                          src={imgUrl}
                          alt={`${spot.title} - ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="left-2 bg-black/60 border-white/20 text-white hover:bg-black/80" />
                <CarouselNext className="right-2 bg-black/60 border-white/20 text-white hover:bg-black/80" />
              </Carousel>
            )
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
              <ImageIcon className="w-10 h-10 opacity-40" />
              <span className="text-xs">Nincs feltöltött kép</span>
            </div>
          )}

          <div className="absolute top-3 left-3 z-10 flex flex-col items-start gap-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-900/80 backdrop-blur-xl border border-white/20 text-white shadow-md">
              {spot.spot_type === 'skatepark' ? '🛹 Skatepark' : spot.spot_type === 'skateshop' ? '🏪 Skateshop' : '🏙️ Street spot'}
            </span>

            {/* Still orange icon-only REPORT button under the tag (no glow, no pulse) */}
            <button
              type="button"
              onClick={() => setIsReportModalOpen(true)}
              title="Probléma jelentése (anonim)"
              aria-label="Probléma jelentése"
              className="w-8 h-8 rounded-xl bg-black/80 border border-orange-500/40 hover:border-orange-400 text-orange-400 hover:text-orange-300 transition-colors duration-350 flex items-center justify-center active:scale-90 cursor-pointer"
            >
              <AlertTriangle className="w-4 h-4 text-orange-400" />
            </button>
          </div>
        </div>

        {/* Scrollable details */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <SheetHeader className="text-left space-y-2">
            <SheetTitle className="text-2xl font-black tracking-tight text-white">
              {spot.title}
            </SheetTitle>
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-900/80 backdrop-blur-xl border border-white/20 text-white shadow-sm">
                {spot.spot_type === 'skatepark' ? '🛹 Skatepark' : spot.spot_type === 'skateshop' ? '🏪 Skateshop' : '🏙️ Street spot'}
              </span>
              {spot.features && spot.features.map((feat) => {
                const featureLabels: Record<string, string> = {
                  rail: '🦯 Korlát',
                  ledge: '🧱 Padka',
                  stairs: '🪜 Lépcső',
                  gap: '🕳️ Gap',
                  flatground: '🛹 Flatground',
                };
                return (
                  <span
                    key={feat}
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-normal bg-neutral-900/60 backdrop-blur-md border border-white/10 text-neutral-300"
                  >
                    {featureLabels[feat] || feat}
                  </span>
                );
              })}
            </div>
            <SheetDescription className="text-sm text-neutral-400">
              Hozzáadva: {new Date(spot.created_at).toLocaleDateString('hu-HU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </SheetDescription>
          </SheetHeader>

          {/* Description */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Leírás & Részletek
            </h4>
            <p className="text-sm text-neutral-200 leading-relaxed whitespace-pre-wrap bg-white/[0.03] p-4 rounded-xl border border-white/5">
              {spot.description || 'Nincs részletes leírás megadva ehhez a spothoz.'}
            </p>
          </div>

          {/* Coordinates Box */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Pontos Koordináták
            </h4>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 text-sm">
              <div className="flex items-center gap-2 text-neutral-300 font-mono text-xs">
                <MapPin className="w-4 h-4 text-white shrink-0" />
                <span>
                  {spot.latitude.toFixed(6)}, {spot.longitude.toFixed(6)}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyCoords}
                className="h-8 px-2.5 rounded-lg text-xs text-neutral-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 flex items-center transition-all duration-350 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-white mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                {copied ? 'Másolva' : 'Másolás'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/10 bg-neutral-950/80 backdrop-blur-xl flex">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-12 rounded-2xl bg-neutral-900/80 hover:bg-neutral-800/80 backdrop-blur-xl border border-white/20 text-white font-medium shadow-xl flex items-center justify-center transition-all duration-350 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Navigation className="w-4 h-4 mr-2 text-white" />
            Útvonaltervezés (Google Maps)
            <ExternalLink className="w-3.5 h-3.5 ml-1.5 opacity-70" />
          </a>
        </div>

        {/* Spot Report Modal Dialog */}
        <SpotReportModal
          spot={spot}
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
        />
      </SheetContent>
    </Sheet>
  );
};
