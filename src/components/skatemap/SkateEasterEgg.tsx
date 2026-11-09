import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';

const COLORS = [
  'text-neutral-400 hover:text-white',       // 0 kattintás (Alap)
  'text-emerald-400 hover:text-emerald-300', // 1. színváltás
  'text-cyan-400 hover:text-cyan-300',       // 2. színváltás
  'text-fuchsia-400 hover:text-fuchsia-300', // 3. színváltás
  'text-rose-400 hover:text-rose-300',       // 4. színváltás
  'text-amber-300 hover:text-amber-200',     // 5. színváltás (elsuhanás!)
];

// ── Vektorizált, folytonos pixel art gördeszka komponens ──
// Az SVG vektorok révén nincsenek hiányzó pixelek sem nyugalmi állapotban, sem rázkódás (wobble) közben.
export const SkatePixelSvg: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 249 80"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path d="M10 0h14v2h-14zM5 2h24v3h-24zM3 5h31v1h-31zM228 5h11v2h-11zM3 6h8v2h-8zM23 6h11v1h-11zM23 7h21v1h-21zM223 7h21v3h-21zM3 8h3v2h-3zM28 8h16v2h-16zM0 10h6v1h-6zM28 10h34v1h-34zM218 10h28v1h-28zM0 11h5v1h-5zM33 11h29v1h-29zM218 11h11v1h-11zM238 11h8v1h-8zM0 12h4v4h-4zM33 12h65v1h-65zM213 12h16v1h-16zM238 12h11v1h-11zM10 13h3v1h-3zM43 13h55v2h-55zM213 13h11v2h-11zM243 13h6v3h-6zM11 14h2v1h-2zM10 15h6v3h-6zM43 15h181v1h-181zM0 16h3v4h-3zM61 16h158v2h-158zM245 16h4v2h-4zM233 17h1v1h-1zM10 18h9v1h-9zM97 18h117v3h-117zM233 18h3v2h-3zM246 18h3v5h-3zM10 19h8v1h-8zM0 20h6v1h-6zM10 20h11v1h-11zM230 20h6v3h-6zM3 21h4v1h-4zM13 21h8v2h-8zM3 22h6v3h-6zM16 23h8v2h-8zM228 23h6v2h-6zM243 23h3v5h-3zM247 23h2v1h-2zM3 25h5v1h-5zM18 25h16v1h-16zM223 25h11v1h-11zM5 26h3v1h-3zM21 26h13v2h-13zM223 26h8v2h-8zM5 27h6v1h-6zM8 28h3v3h-3zM26 28h26v1h-26zM54 28h16v2h-16zM218 28h10v3h-10zM241 28h5v1h-5zM26 29h27v1h-27zM241 29h3v2h-3zM26 30h55v1h-55zM141 30h3v1h-3zM10 31h3v2h-3zM36 31h108v2h-108zM210 31h13v2h-13zM238 31h5v1h-5zM238 32h3v1h-3zM10 33h6v1h-6zM37 33h32v1h-32zM74 33h3v3h-3zM79 33h139v3h-139zM233 33h8v1h-8zM13 34h3v1h-3zM233 34h6v2h-6zM13 35h8v1h-8zM16 36h5v2h-5zM154 36h56v3h-56zM231 36h3v2h-3zM16 38h10v1h-10zM228 38h6v1h-6zM21 39h5v2h-5zM228 39h3v2h-3zM26 41h13v3h-13zM51 41h6v2h-6zM223 41h5v2h-5zM46 43h13v1h-13zM85 43h38v3h-38zM215 43h13v2h-13zM33 44h3v4h-3zM46 44h8v2h-8zM56 44h3v2h-3zM215 45h8v1h-8zM44 46h5v2h-5zM50 46h12v1h-12zM72 46h3v2h-3zM87 46h3v7h-3zM96 46h68v1h-68zM174 46h8v2h-8zM192 46h3v2h-3zM207 46h9v4h-9zM58 47h4v2h-4zM123 47h41v2h-41zM31 48h5v1h-5zM41 48h8v3h-8zM72 48h5v1h-5zM172 48h13v1h-13zM192 48h6v1h-6zM31 49h3v9h-3zM58 49h5v1h-5zM74 49h3v10h-3zM159 49h3v4h-3zM172 49h5v2h-5zM182 49h3v2h-3zM193 49h5v1h-5zM57 50h6v1h-6zM195 50h3v1h-3zM207 50h7v1h-7zM41 51h24v2h-24zM169 51h5v1h-5zM182 51h5v2h-5zM194 51h6v1h-6zM210 51h3v8h-3zM169 52h6v2h-6zM197 52h3v14h-3zM43 53h22v1h-22zM85 53h5v1h-5zM156 53h6v1h-6zM182 53h8v1h-8zM44 54h10v2h-10zM59 54h3v5h-3zM85 54h3v5h-3zM156 54h3v10h-3zM169 54h3v1h-3zM174 54h1v1h-1zM178 54h12v1h-12zM169 55h7v1h-7zM178 55h4v1h-4zM184 55h6v1h-6zM44 56h11v1h-11zM167 56h15v2h-15zM185 56h5v2h-5zM43 57h12v1h-12zM31 58h4v1h-4zM43 58h6v3h-6zM167 58h18v1h-18zM187 58h3v1h-3zM33 59h3v5h-3zM54 59h6v1h-6zM72 59h5v2h-5zM82 59h3v2h-3zM167 59h22v2h-22zM207 59h4v6h-4zM54 60h5v2h-5zM45 61h4v1h-4zM72 61h3v3h-3zM80 61h5v1h-5zM167 61h20v1h-20zM80 62h2v1h-2zM169 62h16v2h-16zM80 63h3v1h-3zM34 64h5v1h-5zM69 64h11v2h-11zM158 64h4v1h-4zM172 64h13v3h-13zM36 65h3v1h-3zM159 65h3v4h-3zM208 65h3v1h-3zM36 66h6v1h-6zM67 66h13v1h-13zM195 66h5v1h-5zM205 66h6v1h-6zM39 67h3v1h-3zM67 67h5v2h-5zM174 67h8v1h-8zM195 67h3v2h-3zM205 67h3v2h-3zM38 68h4v1h-4zM41 69h3v2h-3zM62 69h5v2h-5zM161 69h3v2h-3zM192 69h8v1h-8zM202 69h3v2h-3zM192 70h7v1h-7zM41 71h26v1h-26zM161 71h6v1h-6zM192 71h13v1h-13zM43 72h23v1h-23zM164 72h3v2h-3zM189 72h14v2h-14zM43 73h19v1h-19zM44 74h18v1h-18zM166 74h6v1h-6zM190 74h10v2h-10zM167 75h5v2h-5zM177 76h2v1h-2zM189 76h11v1h-11zM169 77h24v2h-24zM169 79h23v1h-23z" />
  </svg>
);

export const SkateEasterEgg: React.FC = () => {
  const navigate = useNavigate();
  const [clickCount, setClickCount] = useState(0);
  const [isLureWobbling, setIsLureWobbling] = useState(false);
  const [runawayCoords, setRunawayCoords] = useState<{ x: number; y: number } | null>(null);
  const iconRef = useRef<HTMLButtonElement>(null);
  const lureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Periodikus finom remegés / csalogató mozgás (lure)
  const triggerLureWobble = useCallback(() => {
    if (runawayCoords) return;
    setIsLureWobbling(true);
    setTimeout(() => setIsLureWobbling(false), 900);
  }, [runawayCoords]);

  useEffect(() => {
    let isMounted = true;
    const scheduleNext = () => {
      if (!isMounted) return;
      const delay = 3500 + Math.random() * 3000;
      lureTimerRef.current = setTimeout(() => {
        if (!isMounted) return;
        triggerLureWobble();
        scheduleNext();
      }, delay);
    };

    lureTimerRef.current = setTimeout(() => {
      if (!isMounted) return;
      triggerLureWobble();
      scheduleNext();
    }, 2500);

    return () => {
      isMounted = false;
      if (lureTimerRef.current) clearTimeout(lureTimerRef.current);
    };
  }, [triggerLureWobble]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (runawayCoords) return;

    const nextCount = clickCount + 1;
    setClickCount(nextCount);

    // 8 bites kattintási hang-effekt
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(320 + nextCount * 90, ctx.currentTime);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      }
    } catch {}

    // 5. kattintás: elszáguld és átirányít
    if (nextCount >= 5) {
      if (iconRef.current) {
        const rect = iconRef.current.getBoundingClientRect();
        setRunawayCoords({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        });
      }

      // Animáció lefutása után navigálás a játékterembe
      setTimeout(() => {
        navigate('/game');
      }, 950);
    }
  };

  const currentColorClass = COLORS[Math.min(clickCount, COLORS.length - 1)];

  return (
    <>
      <button
        ref={iconRef}
        type="button"
        onClick={handleClick}
        aria-label="Gördeszka"
        className={`
          cursor-pointer inline-flex items-center justify-center p-0.5
          active:scale-95 transition-transform focus:outline-none select-none bg-transparent
          ${isLureWobbling && !runawayCoords ? 'skate-wobble' : ''}
          ${currentColorClass}
          ${runawayCoords ? 'opacity-0 pointer-events-none' : 'opacity-100'}
        `}
      >
        {/* Pixel art gördeszka logó (100% folytonos, nincs szürke hover doboz, nincs tooltip felirat) */}
        <SkatePixelSvg className="w-10 h-auto transition-colors select-none" />
      </button>

      {/* 5. kattintás után: elszáguld a képernyő közepe felé pixel art animációval */}
      {runawayCoords &&
        createPortal(
          <div
            className="skate-runaway-portal"
            style={
              {
                '--start-x': `${runawayCoords.x}px`,
                '--start-y': `${runawayCoords.y}px`,
              } as React.CSSProperties
            }
          >
            <div className="relative flex items-center justify-center">
              <SkatePixelSvg className="w-28 h-auto select-none text-amber-300 drop-shadow-[0_0_14px_rgba(252,211,77,0.95)]" />
              {/* Pixel füst pamacs */}
              <div className="absolute -left-3 bottom-0 w-2.5 h-2.5 bg-white/70 rounded-full animate-ping" />
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
