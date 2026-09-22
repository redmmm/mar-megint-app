import React, { useState } from 'react';
import { Spot } from '@/types/spot';
import { reportSpot } from '@/services/spotService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Loader2, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface SpotReportModalProps {
  spot: Spot | null;
  isOpen: boolean;
  onClose: () => void;
  onReportSuccess?: () => void;
}

export const SpotReportModal: React.FC<SpotReportModalProps> = ({
  spot,
  isOpen,
  onClose,
  onReportSuccess,
}) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!spot) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanReason = reason.trim();

    if (!cleanReason || cleanReason.length < 5) {
      setErrorMessage('Kérjük, írd le az indoklást legalább 5 karakterben!');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await reportSpot(spot.id, cleanReason, spot);

      if (res.success) {
        // Update spot instance in memory
        spot.is_reported = true;
        spot.report_reason = cleanReason;
        spot.reported_at = new Date().toISOString();

        // As requested: both for already reported and newly reported,
        // user receives a clean, polite message: "Köszönjük és hamarosan felülvizsgáljuk."
        toast.success('Köszönjük és hamarosan felülvizsgáljuk.', {
          description: res.alreadyReported
            ? 'A hibajelzést erre a spotra már korábban rögzítettük.'
            : 'A bejelentés sikeresen továbbítva az adminisztrátoroknak.',
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
        });

        setReason('');
        onReportSuccess?.();
        onClose();
      } else {
        setErrorMessage(res.message || 'Hiba történt a bejelentés küldése során.');
      }
    } catch (err: any) {
      console.error('Report submission error:', err);
      setErrorMessage('Nem sikerült elküldeni a bejelentést. Kérjük próbáld újra.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !isSubmitting) {
      setReason('');
      setErrorMessage(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[460px] bg-neutral-950/95 border border-orange-500/30 backdrop-blur-2xl shadow-[0_0_50px_rgba(249,115,22,0.15)] text-foreground">
        <DialogHeader className="space-y-2 text-left">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 shadow-[0_0_12px_rgba(249,115,22,0.4)]">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                Probléma jelentése
              </DialogTitle>
              <p className="text-xs font-semibold text-orange-400/90 truncate max-w-[280px]">
                {spot.title}
              </p>
            </div>
          </div>
          <DialogDescription className="text-xs text-neutral-400 leading-relaxed pt-1">
            Hibás a kép, rossz a helyszín vagy megszűnt a spot? Segíts rendben tartani a győri skatemap-et egy anonim bejelentéssel.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="report-reason" className="text-xs font-bold text-neutral-200">
                Miért nem jó ez a spot? <span className="text-orange-400">*</span>
              </Label>
              <span className="text-[10px] text-neutral-400 font-mono">
                {reason.length}/500 (min. 5)
              </span>
            </div>

            <Textarea
              id="report-reason"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (errorMessage && e.target.value.trim().length >= 5) {
                  setErrorMessage(null);
                }
              }}
              placeholder="Pl.: Rossz fotó van csatolva ehhez a spothoz, vagy a jelölő nem pontos, esetleg magánterület és elhajtanak..."
              maxLength={500}
              rows={4}
              required
              className="bg-white/[0.04] border-white/10 text-white placeholder:text-neutral-500 text-xs focus-visible:border-orange-500/60 focus-visible:ring-orange-500/30 resize-none rounded-xl"
            />

            {errorMessage && (
              <p className="text-xs text-rose-400 font-medium flex items-center gap-1 pt-1 animate-in fade-in">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {errorMessage}
              </p>
            )}
          </div>

          {/* Anonymous notice */}
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-neutral-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              A bejelentés <strong>teljesen anonim</strong>, semmilyen személyes adat nem kerül rögzítésre. A bejelentés kizárólag az adminisztrátorok számára lesz látható felülvizsgálat céljából.
            </span>
          </div>

          <DialogFooter className="pt-2 flex flex-row items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-9 px-3 text-xs border-white/10 text-neutral-300 hover:bg-white/5"
            >
              Mégse
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || reason.trim().length < 5}
              className="h-9 px-4 text-xs font-bold bg-gradient-to-r from-orange-500 via-rose-500 to-red-500 hover:from-orange-600 hover:via-rose-600 hover:to-red-600 text-white shadow-[0_0_20px_rgba(249,115,22,0.4)] hover:shadow-[0_0_25px_rgba(239,68,68,0.6)] border border-orange-400/40 transition-all flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Küldés folyamatban...</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Bejelentés elküldése</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
