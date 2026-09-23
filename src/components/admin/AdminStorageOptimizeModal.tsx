import React, { useState } from 'react';
import { spotService } from '@/services/spotService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

interface AdminStorageOptimizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AdminStorageOptimizeModal: React.FC<AdminStorageOptimizeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [logs, setLogs] = useState<string[]>([]);
  const [isFinished, setIsFinished] = useState(false);

  const startOptimization = async () => {
    setIsProcessing(true);
    setIsFinished(false);
    setLogs(['Optimalizálási folyamat indítása...', 'Meglévő spotok vizsgálata...']);

    try {
      const res = await spotService.optimizeExistingSpotImages((current, total, log) => {
        setProgress({ current, total });
        setLogs((prev) => [log, ...prev]);
      });

      setIsFinished(true);
      if (res.processed > 0 && onSuccess) {
        onSuccess();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ismeretlen hiba';
      setLogs((prev) => [`❌ Hiba történt: ${message}`, ...prev]);
    } finally {
      setIsProcessing(false);
    }
  };

  const percent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isProcessing && onClose()}>
      <DialogContent className="sm:max-w-md bg-neutral-900 border border-neutral-800 text-white shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-white">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            Supabase Storage Optimalizálás
          </DialogTitle>
          <DialogDescription className="text-xs text-neutral-400">
            Átvizsgálja a feltöltött spot fotókat, és a nem-WebP (PNG/JPG) képeket automatikusan átméretezi (max. 1600px),
            80%-os minőségű WebP formátumra tömöríti, valamint felszabadítja a tárhelyet a régi fájlok törlésével.
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        {progress.total > 0 && (
          <div className="space-y-1.5 my-2">
            <div className="flex justify-between text-xs text-neutral-300">
              <span className="font-medium">Folyamat</span>
              <span className="font-mono text-emerald-400">
                {percent}% ({progress.current}/{progress.total})
              </span>
            </div>
            <div className="w-full h-2.5 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        )}

        {/* Log Viewer */}
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-xl p-3 h-44 overflow-y-auto font-mono text-[11px] text-neutral-300 space-y-1 my-2 leading-relaxed">
          {logs.length === 0 ? (
            <div className="h-full flex items-center justify-center text-neutral-500 text-center text-xs">
              Kattints az &quot;Optimalizálás indítása&quot; gombra a folyamat elkezdéséhez.
            </div>
          ) : (
            logs.map((l, i) => (
              <div
                key={i}
                className={
                  l.startsWith('✅')
                    ? 'text-emerald-400 font-semibold'
                    : l.startsWith('❌')
                    ? 'text-red-400 font-semibold'
                    : l.startsWith('⚠️')
                    ? 'text-amber-400'
                    : 'text-neutral-300'
                }
              >
                {l}
              </div>
            ))
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isProcessing}
            className="border-neutral-800 hover:bg-neutral-800 text-neutral-300 text-xs"
          >
            Bezárás
          </Button>
          <Button
            type="button"
            onClick={startOptimization}
            disabled={isProcessing}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs gap-1.5 shadow-lg shadow-emerald-600/20"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Tömörítés folyamatban...
              </>
            ) : isFinished ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Újraindítás
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                Optimalizálás indítása
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
