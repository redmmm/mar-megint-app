import React, { useState, useEffect } from 'react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload, X, MapPin, ShieldCheck, Check, Info } from 'lucide-react';
import { submitSpot, uploadSpotImage } from '@/services/spotService';
import { compressImage, formatBytes } from '@/utils/imageCompressor';
import { SpotType } from '@/types/spot';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SpotSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCoords: { lat: number; lng: number } | null;
  onSuccess?: () => void;
}

// Győr Bounding Box validation
const GYOR_BOUNDS = {
  minLat: 47.5800,
  maxLat: 47.7800,
  minLng: 17.5000,
  maxLng: 17.8000,
};

const AVAILABLE_FEATURES = [
  { id: 'rail', label: 'Korlát', emoji: '🦯' },
  { id: 'ledge', label: 'Padka', emoji: '🧱' },
  { id: 'stairs', label: 'Lépcső', emoji: '🪜' },
  { id: 'gap', label: 'Gap', emoji: '🕳️' },
  { id: 'flatground', label: 'Flatground', emoji: '🛹' },
];

const RATE_LIMIT_SECONDS = 15;
const LAST_SUBMIT_KEY = 'gyor_skatemap_last_submit';

export const SpotSubmissionModal: React.FC<SpotSubmissionModalProps> = ({
  isOpen,
  onClose,
  initialCoords,
  onSuccess,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [spotType, setSpotType] = useState<SpotType>('street_spot');
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [lat, setLat] = useState<string>('47.6875');
  const [lng, setLng] = useState<string>('17.6504');
  const [images, setImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Anti-bot math verification challenge
  const [numA, setNumA] = useState(3);
  const [numB, setNumB] = useState(4);
  const [mathAnswer, setMathAnswer] = useState('');

  useEffect(() => {
    if (initialCoords) {
      setLat(initialCoords.lat.toFixed(6));
      setLng(initialCoords.lng.toFixed(6));
    }
  }, [initialCoords]);

  useEffect(() => {
    if (isOpen) {
      // Generate new challenge on open
      const a = Math.floor(Math.random() * 8) + 2;
      const b = Math.floor(Math.random() * 8) + 1;
      setNumA(a);
      setNumB(b);
      setMathAnswer('');
      setErrorMessage(null);
    }
  }, [isOpen]);

  const handleImageFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > 2) {
      setErrorMessage('Spotanként maximum 2 fotót tölthetsz fel!');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);

    try {
      const uploadedUrls: string[] = [];
      const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isImage = file.type.startsWith('image/') || /\.(heic|heif|jpe?g|png|webp)$/i.test(file.name);
        if (!isImage) {
          setErrorMessage('Csak képfájlokat (JPG, PNG, WebP, HEIC) tölthetsz fel!');
          continue;
        }
        if (file.size > MAX_FILE_SIZE) {
          setErrorMessage(`A(z) "${file.name}" túl nagy! Maximum 15 MB engedélyezett.`);
          continue;
        }

        setStatusText(`Kép tömörítése és feltöltése (${i + 1}/${files.length})...`);
        const compressed = await compressImage(file, { maxWidth: 1600, maxHeight: 1600, quality: 0.8 });
        const url = await uploadSpotImage(compressed);
        uploadedUrls.push(url);
      }
    } catch (err: unknown) {
      console.error('Képfeltöltési hiba:', err);
      const message = err instanceof Error ? err.message : 'Nem sikerült a képek feldolgozása.';
      setErrorMessage(message);
    } finally {
      setIsUploading(false);
      setStatusText('');
      e.target.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleFeature = (featId: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(featId) ? prev.filter((id) => id !== featId) : [...prev, featId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // 1. Validation
    if (!title.trim()) {
      setErrorMessage('Kérjük, add meg a spot nevét!');
      return;
    }

    if (title.trim().length > 100) {
      setErrorMessage('A spot neve legfeljebb 100 karakter lehet!');
      return;
    }

    if (description.trim().length > 1000) {
      setErrorMessage('A leírás legfeljebb 1000 karakter lehet!');
      return;
    }

    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);

    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      setErrorMessage('Érvénytelen koordináták!');
      return;
    }

    // Bounds check
    if (
      parsedLat < GYOR_BOUNDS.minLat ||
      parsedLat > GYOR_BOUNDS.maxLat ||
      parsedLng < GYOR_BOUNDS.minLng ||
      parsedLng > GYOR_BOUNDS.maxLng
    ) {
      setErrorMessage(
        `A koordinátáknak Győr határain belül kell lenniük! (${GYOR_BOUNDS.minLat} - ${GYOR_BOUNDS.maxLat}, ${GYOR_BOUNDS.minLng} - ${GYOR_BOUNDS.maxLng})`
      );
      return;
    }

    // Anti-bot check
    if (parseInt(mathAnswer.trim(), 10) !== numA + numB) {
      setErrorMessage('A biztonsági ellenőrzés válasza helytelen. Kérjük, próbáld újra!');
      return;
    }

    // Rate-limiting check
    const lastSubmit = localStorage.getItem(LAST_SUBMIT_KEY);
    if (lastSubmit) {
      const timeDiff = (Date.now() - parseInt(lastSubmit, 10)) / 1000;
      if (timeDiff < RATE_LIMIT_SECONDS) {
        setErrorMessage(
          `Kérjük várj még ${Math.ceil(RATE_LIMIT_SECONDS - timeDiff)} másodpercet a következő spot beküldése előtt!`
        );
        return;
      }
    }

    setIsSubmitting(true);

    try {
      await submitSpot({
        title: title.trim(),
        description: description.trim() || undefined,
        spot_type: spotType,
        features: spotType === 'street_spot' ? selectedFeatures : [],
        latitude: parsedLat,
        longitude: parsedLng,
        images,
      });

      // Save rate-limit timestamp
      localStorage.setItem(LAST_SUBMIT_KEY, Date.now().toString());

      toast.success('Spot beküldve! Az adminisztrátori jóváhagyás után jelenik meg a térképen.');
      
      // Reset form
      setTitle('');
      setDescription('');
      setSpotType('street_spot');
      setSelectedFeatures([]);
      setImages([]);
      setMathAnswer('');
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Hiba a beküldéskor:', err);
      setErrorMessage('Hiba történt a spot beküldésekor. Kérjük próbáld újra később!');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto bg-background/95 backdrop-blur-xl border border-white/10 text-foreground">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">Új Győri Spot Beküldése</DialogTitle>
              <DialogDescription className="text-xs text-neutral-400">
                Oszd meg a kedvenc skate helyedet a közösséggel.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {errorMessage && (
          <Alert variant="destructive" className="py-2 text-sm bg-destructive/10 border-destructive/30">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Spot Title */}
          <div className="space-y-1.5">
            <Label htmlFor="spot-title" className="text-xs font-semibold uppercase text-neutral-300">
              Spot Neve <span className="text-emerald-400">*</span>
            </Label>
            <Input
              id="spot-title"
              placeholder="pl. Radó-sziget Ledge / Árkád Lépcsők"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-white/[0.04] border-white/10 text-white placeholder:text-neutral-500"
              required
            />
          </div>

          {/* Spot Type Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-neutral-300">
              Spot Típusa <span className="text-emerald-400">*</span>
            </Label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSpotType('skatepark')}
                className={cn(
                  "flex flex-col sm:flex-row items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-semibold transition-all text-center",
                  spotType === 'skatepark'
                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-500/10"
                    : "bg-white/[0.03] border-white/10 text-neutral-400 hover:bg-white/[0.06] hover:text-white"
                )}
              >
                <span className="text-base">🛹</span> Skatepark
              </button>
              <button
                type="button"
                onClick={() => setSpotType('street_spot')}
                className={cn(
                  "flex flex-col sm:flex-row items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-semibold transition-all text-center",
                  spotType === 'street_spot'
                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-500/10"
                    : "bg-white/[0.03] border-white/10 text-neutral-400 hover:bg-white/[0.06] hover:text-white"
                )}
              >
                <span className="text-base">🏙️</span> Street spot
              </button>
              <button
                type="button"
                onClick={() => setSpotType('skateshop')}
                className={cn(
                  "flex flex-col sm:flex-row items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-semibold transition-all text-center",
                  spotType === 'skateshop'
                    ? "bg-amber-500/20 border-amber-500 text-amber-400 shadow-lg shadow-amber-500/10"
                    : "bg-white/[0.03] border-white/10 text-neutral-400 hover:bg-white/[0.06] hover:text-white"
                )}
              >
                <span className="text-base">🏪</span> Skateshop
              </button>
            </div>
          </div>

          {/* Street Spot Features (Child Category) */}
          {spotType === 'street_spot' && (
            <div className="space-y-2 p-3 rounded-xl bg-white/[0.02] border border-white/10 animate-in fade-in duration-200">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-semibold uppercase text-neutral-300">
                  Található elemek a spoton
                </Label>
                <span className="text-[10px] text-neutral-400">
                  {selectedFeatures.length === 0 ? 'Válassz elemeket' : `${selectedFeatures.length} kiválasztva`}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {AVAILABLE_FEATURES.map((feat) => {
                  const isSelected = selectedFeatures.includes(feat.id);
                  return (
                    <button
                      key={feat.id}
                      type="button"
                      onClick={() => toggleFeature(feat.id)}
                      className={cn(
                        "flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg border text-xs font-medium transition-all text-center",
                        isSelected
                          ? "bg-emerald-500/20 border-emerald-400 text-emerald-400 font-semibold shadow-sm"
                          : "bg-white/[0.03] border-white/10 text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.06]"
                      )}
                    >
                      <span>{feat.emoji}</span>
                      <span>{feat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="spot-desc" className="text-xs font-semibold uppercase text-neutral-300">
              Leírás & Jellemzők (opcionális)
            </Label>
            <Textarea
              id="spot-desc"
              placeholder={
                spotType === 'skateshop'
                  ? "Milyen márkákat árulnak? Nyitvatartási idő, elérhetőség vagy egyéb infók..."
                  : "Milyen a talaj? Van-e lépcső, korlát vagy padka? Milyen napszakban a legjobb gurulni?"
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="bg-white/[0.04] border-white/10 text-white placeholder:text-neutral-500 resize-none"
            />
          </div>

          {/* Coordinates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="spot-lat" className="text-xs font-semibold uppercase text-neutral-300">
                Szélesség (Lat)
              </Label>
              <Input
                id="spot-lat"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                step="any"
                className="bg-white/[0.04] border-white/10 font-mono text-xs text-neutral-200"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="spot-lng" className="text-xs font-semibold uppercase text-neutral-300">
                Hosszúság (Lng)
              </Label>
              <Input
                id="spot-lng"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                step="any"
                className="bg-white/[0.04] border-white/10 font-mono text-xs text-neutral-200"
                required
              />
            </div>
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-neutral-300 flex justify-between items-center">
              <span>Fotók csatolása (max. 2 kép)</span>
              <span className="text-[10px] text-neutral-400 font-normal">{images.length}/2 kép</span>
            </Label>

            {/* Uploaded thumbnails */}
            {images.length > 0 && (
              <div className="grid grid-cols-2 gap-3 mb-2">
                {images.map((img, idx) => (
                  <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-white/10 group bg-neutral-950">
                    <img src={img} alt="Spot preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/70 text-white opacity-90 hover:opacity-100 hover:bg-red-600 transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {images.length < 2 && (
              <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-white/15 hover:border-emerald-500/50 rounded-xl cursor-pointer bg-neutral-950/50 hover:bg-neutral-950 transition text-center group">
                <div className="flex items-center gap-2 text-xs font-medium text-neutral-200">
                  <Upload className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span>{isUploading ? statusText || 'Kép feldolgozása...' : `Kép kiválasztása (${images.length}/2)`}</span>
                </div>
                <span className="text-[10px] text-neutral-400 mt-1">
                  Automatikusan WebP-re tömörítve (JPG, PNG, HEIC)
                </span>
                <input
                  type="file"
                  accept="image/*,.heic,.heif"
                  multiple
                  onChange={handleImageFiles}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Bot Protection Challenge */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-neutral-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Biztonsági ellenőrzés</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-white">
                Mennyi {numA} + {numB} = ?
              </span>
              <Input
                type="number"
                placeholder="Eredmény"
                value={mathAnswer}
                onChange={(e) => setMathAnswer(e.target.value)}
                className="w-28 bg-white/[0.05] border-white/10 text-white text-center font-mono text-sm"
                required
              />
            </div>
          </div>

          <DialogFooter className="pt-1 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-white/10 hover:bg-white/5"
            >
              Mégse
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium gap-2 shadow-lg shadow-emerald-600/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Beküldés...
                </>
              ) : (
                'Spot beküldése'
              )}
            </Button>
          </DialogFooter>

          {/* Anonymous & Admin Review Notice */}
          <div className="flex items-center justify-center gap-2 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-200/90 text-center">
            <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>
              A beküldés teljesen <strong className="text-emerald-300">anonim</strong>, a spot admin jóváhagyás után jelenik meg.
            </span>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
