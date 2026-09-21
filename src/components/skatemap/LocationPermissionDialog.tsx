import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapPinOff, RefreshCw } from 'lucide-react';

interface LocationPermissionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => void;
  isLoading?: boolean;
  errorType?: 'permission_denied' | 'timeout' | 'unavailable' | 'unknown';
}

export const LocationPermissionDialog: React.FC<LocationPermissionDialogProps> = ({
  isOpen,
  onClose,
  onRetry,
  isLoading = false,
  errorType = 'permission_denied',
}) => {
  const isPermissionDenied = errorType === 'permission_denied';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[440px] bg-background/95 backdrop-blur-xl border border-white/10 text-foreground">
        <DialogHeader className="space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto sm:mx-0">
            <MapPinOff className="w-6 h-6" />
          </div>
          <DialogTitle className="text-lg font-bold text-white text-center sm:text-left">
            {isPermissionDenied ? 'Helyhozzáférés engedélyezése szükséges' : 'Nem sikerült lekérni a pozíciót'}
          </DialogTitle>
          <DialogDescription className="text-xs text-neutral-300 leading-relaxed text-center sm:text-left">
            {isPermissionDenied
              ? 'A helymeghatározás le van tiltva a böngésződben. Engedélyezd a hozzáférést a pontos helyzeted megjelenítéséhez a térképen.'
              : 'A böngésző engedélyezve van, de az operációs rendszer (pl. asztali Windows PC) nem tudott GPS/Wi-Fi koordinátát szolgáltatni időben.'}
          </DialogDescription>
        </DialogHeader>

        <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] text-neutral-300 space-y-2">
          <p className="font-semibold text-emerald-400">
            {isPermissionDenied ? 'Megoldás böngészőben:' : 'Gyakori ok és megoldás:'}
          </p>
          {isPermissionDenied ? (
            <ol className="list-decimal list-inside space-y-1 text-neutral-400">
              <li>Kattints a böngésző címsorában lévő lakat vagy beállítás ikonra.</li>
              <li>Válaszd a <span className="text-white font-medium">Helyhozzáférés: Engedélyezés</span> lehetőséget.</li>
              <li>Kattints az alábbi <span className="text-white font-medium">Újrapróbálkozás</span> gombra.</li>
            </ol>
          ) : (
            <ul className="list-disc list-inside space-y-1 text-neutral-400">
              <li><strong className="text-white">Asztali PC korlát:</strong> Asztali gépeken nincs GPS vevő, a Windows pedig időtúllépést okozhat.</li>
              <li><strong className="text-white">Windows Gépház:</strong> Start &gt; Gépház &gt; Adatvédelem és biztonság &gt; Helyzet menüben kapcsold be a <span className="text-white font-medium">Helymeghatározási szolgáltatás</span>-t.</li>
              <li>Győződj meg róla, hogy a böngésződ hozzáférése is engedélyezve van.</li>
            </ul>
          )}
        </div>

        <DialogFooter className="pt-2 gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-white/10 hover:bg-white/5 text-xs"
          >
            Mégse
          </Button>
          <Button
            type="button"
            onClick={onRetry}
            disabled={isLoading}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold gap-1.5 shadow-lg shadow-emerald-600/20"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Újrapróbálkozás
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
