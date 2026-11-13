import React, { useState, lazy, Suspense, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useSEO } from '@/hooks/useSEO';
import CRTWarp from '@/components/CRTWarp';

const DinoGame = lazy(() => import('@/components/games/DinoGame'));
const DinoGame2P = lazy(() => import('@/components/games/DinoGame2P'));
const PongGame = lazy(() => import('@/components/games/PongGame'));
const PongGame2P = lazy(() => import('@/components/games/PongGame2P'));

type GameChoice = 'select' | 'dino' | 'dino2p' | 'pong' | 'pong2p';

const GameLoader = () => (
  <div className="flex items-center justify-center p-12">
    <div className="w-6 h-6 rounded-full border-2 border-white/20 border-t-white animate-spin" />
  </div>
);

// ── Pixel stílusú hangszóró ikon (a referencia alapján) ──
const PixelSpeakerIcon: React.FC<{ muted: boolean; volume: number }> = ({ muted, volume }) => {
  const isSilent = muted || volume === 0;
  return (
    <svg
      viewBox="0 0 18 16"
      className="w-4 h-4 select-none shrink-0"
      fill="currentColor"
      style={{ shapeRendering: 'crispEdges' }}
    >
      <rect x="1" y="5" width="4" height="6" />
      <polygon points="5,5 10,2 10,14 5,11" />
      {isSilent ? (
        <path d="M12 5h2v2h-2z M14 7h1v2h-1z M15 9h2v2h-2z M15 5h2v2h-2z M12 9h2v2h-2z" />
      ) : (
        <>
          <path d="M12 6h1v1h-1z M13 7h1v2h-1z M12 9h1v1h-1z" />
          {volume > 0.35 && (
            <path d="M15 3h1v2h-1z M16 5h1v6h-1z M15 11h1v2h-1z" />
          )}
        </>
      )}
    </svg>
  );
};

// ── Pixel stílusú, folyamatosan húzható audio slider (referencia kép szerint) ──
const PixelVolumeControl: React.FC<{
  volume: number;         // 0–1
  muted: boolean;
  onChange: (v: number) => void;
  onToggleMute: () => void;
}> = ({ volume, muted, onChange, onToggleMute }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const displayVolume = muted ? 0 : volume;
  const pct = Math.round(displayVolume * 100);

  const updateFromPointer = useCallback((clientX: number) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    onChange(Math.round(ratio * 100) / 100);
  }, [onChange]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    isDraggingRef.current = true;
    updateFromPointer(e.clientX);

    const onPointerMove = (ev: PointerEvent) => {
      if (!isDraggingRef.current) return;
      updateFromPointer(ev.clientX);
    };

    const onPointerUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  return (
    <div
      className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-neutral-900/90 border border-white/10 backdrop-blur-md shadow-2xl font-mono select-none"
      title="Zene hangereje – kattints a némításhoz vagy húzd a csúszkát"
    >
      {/* Némítás gomb a referencia pixel hangszóróval */}
      <button
        type="button"
        onClick={onToggleMute}
        className="cursor-pointer text-neutral-400 hover:text-white transition-colors p-0.5 active:scale-90 flex items-center justify-center focus:outline-none"
        aria-label={muted ? 'Hang bekapcsolása' : 'Némítás'}
      >
        <PixelSpeakerIcon muted={muted} volume={displayVolume} />
      </button>

      {/* Húzható csúszka: track + kör alakú pixel knob */}
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        className="relative w-28 sm:w-36 h-5 flex items-center cursor-pointer select-none touch-none py-1 group"
      >
        {/* Track háttér (sötétszürke + finom keret a referencia szerint) */}
        <div className="relative w-full h-[6px] rounded-full bg-neutral-800 border border-neutral-700 overflow-hidden">
          {/* Kitöltött fehér rész (balról a gombig) */}
          <div
            className="h-full bg-white"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Kör alakú fehér gomb (thumb) a referencia alapján, pontosan húzható */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white border border-neutral-900 shadow-[0_0_3px_rgba(0,0,0,0.9)] cursor-grab active:cursor-grabbing group-hover:scale-110 active:scale-95 transition-transform"
          style={{ left: `${pct}%` }}
        />
      </div>

      {/* Százalék kiírása pixel/mono fonttal */}
      <span
        className="text-neutral-300 font-mono text-xs font-bold w-7 text-right select-none"
      >
        {pct}%
      </span>
    </div>
  );
};

// ── Monokróm CRT képernyő effekt ki/be kapcsoló gomb (magyar felirat, középre igazítva, fehér pont nélkül) ──
const CrtToggleButton: React.FC<{
  enabled: boolean;
  onToggle: () => void;
}> = ({ enabled, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    className={`flex items-center justify-center text-center min-w-[5.25rem] px-3 py-1.5 rounded-xl border font-mono text-xs font-bold transition-all backdrop-blur-md shadow-2xl cursor-pointer select-none active:scale-95 ${
      enabled
        ? 'bg-neutral-900/90 border-white/30 text-white shadow-[0_0_12px_rgba(255,255,255,0.06)]'
        : 'bg-neutral-900/80 border-white/10 text-neutral-400 hover:text-white hover:border-white/20'
    }`}
    title={enabled ? 'CRT képernyő effekt kikapcsolása' : 'CRT képernyő effekt bekapcsolása'}
    aria-label={enabled ? 'CRT: BE' : 'CRT: KI'}
  >
    <span className="text-neutral-400">CRT:</span>
    <span className={`ml-1.5 ${enabled ? 'text-white font-black' : 'text-neutral-500 font-normal'}`}>
      {enabled ? 'BE' : 'KI'}
    </span>
  </button>
);

const GameSelector: React.FC<{ onSelect: (game: GameChoice) => void }> = ({ onSelect }) => (
  <div className="flex flex-col items-center gap-8 px-4 max-w-xl mx-auto animate-in fade-in duration-300">
    {/* Titkos Már Megint Gördeszkás Kabala & Cím */}
    <div className="flex flex-col items-center text-center space-y-3">
      <div className="relative">
        <img
          src="/mar-megint-player.png"
          alt="Már Megint Pixel"
          fetchPriority="high"
          className="w-20 h-16 object-contain"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>

      <div className="space-y-1">
        <h1
          className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center justify-center gap-2"
          style={{ fontFamily: 'monospace' }}
        >
          <span className="text-neutral-500">{'>'}</span> TITKOS JÁTÉKTEREM <span className="text-neutral-500">{'<'}</span>
        </h1>
        <p className="text-neutral-400 text-xs sm:text-sm font-mono">
          Megtaláltad a titkos easter egget! Válassz egy játékot:
        </p>
      </div>
    </div>

    {/* Játékválasztó kártyák */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
      {/* MÁR MEGINT RUN KÁRTYA */}
      <div className="group relative rounded-2xl bg-neutral-900/80 border border-white/10 hover:border-white/25 backdrop-blur-xl shadow-2xl transition-all duration-200 flex flex-col overflow-hidden">
        {/* Felső információs rész */}
        <div className="p-6 pb-5 flex flex-col items-center gap-3 text-center flex-1">
          <img
            src="/mar-megint-player.png"
            alt="Már Megint Run"
            fetchPriority="high"
            className="w-14 h-12 object-contain"
            style={{ imageRendering: 'pixelated' }}
          />
          <div className="space-y-1">
            <h2 className="text-base font-black text-white tracking-wider font-mono">MÁR MEGINT RUN</h2>
            <p className="text-[11px] text-neutral-400">Ugorj át a köveken, ágakon és rollereken</p>
          </div>
        </div>

        {/* Egyenes vízszintes elválasztó vonal */}
        <div className="w-full h-px bg-white/10" />

        {/* Alsó sáv függőlegesen kettéosztva: 1 Játékos és 2 Játékos */}
        <div className="grid grid-cols-2 divide-x divide-white/10 w-full text-xs font-mono font-bold">
          <button
            type="button"
            onClick={() => onSelect('dino')}
            className="py-3 px-2 text-center text-neutral-300 hover:text-white hover:bg-white/10 active:bg-white/15 transition-colors cursor-pointer flex items-center justify-center gap-1.5 select-none"
          >
            <span>1 JÁTÉKOS</span>
          </button>
          <button
            type="button"
            onClick={() => onSelect('dino2p')}
            className="py-3 px-2 text-center text-neutral-300 hover:text-white hover:bg-white/10 active:bg-white/15 transition-colors cursor-pointer flex items-center justify-center gap-1.5 select-none"
          >
            <span>2 JÁTÉKOS</span>
          </button>
        </div>
      </div>

      {/* MÁR MEGINT PONG KÁRTYA */}
      <div className="group relative rounded-2xl bg-neutral-900/80 border border-white/10 hover:border-white/25 backdrop-blur-xl shadow-2xl transition-all duration-200 flex flex-col overflow-hidden">
        {/* Felső információs rész */}
        <div className="p-6 pb-5 flex flex-col items-center gap-3 text-center flex-1">
          <img
            src="/mar-megint-pong.png"
            alt="Már Megint Pong"
            fetchPriority="high"
            className="w-14 h-14 object-contain"
            style={{ imageRendering: 'pixelated' }}
          />
          <div className="space-y-1">
            <h2 className="text-base font-black text-white tracking-wider font-mono">MÁR MEGINT PONG</h2>
            <p className="text-[11px] text-neutral-400">1:1 klasszikus arcade asztalitenisz</p>
          </div>
        </div>

        {/* Egyenes vízszintes elválasztó vonal */}
        <div className="w-full h-px bg-white/10" />

        {/* Alsó sáv függőlegesen kettéosztva: 1 Játékos és 2 Játékos */}
        <div className="grid grid-cols-2 divide-x divide-white/10 w-full text-xs font-mono font-bold">
          <button
            type="button"
            onClick={() => onSelect('pong')}
            className="py-3 px-2 text-center text-neutral-300 hover:text-white hover:bg-white/10 active:bg-white/15 transition-colors cursor-pointer flex items-center justify-center gap-1.5 select-none"
          >
            <span>1 JÁTÉKOS</span>
          </button>
          <button
            type="button"
            onClick={() => onSelect('pong2p')}
            className="py-3 px-2 text-center text-neutral-300 hover:text-white hover:bg-white/10 active:bg-white/15 transition-colors cursor-pointer flex items-center justify-center gap-1.5 select-none"
          >
            <span>2 JÁTÉKOS</span>
          </button>
        </div>
      </div>
    </div>

    {/* Vissza */}
    <Link
      to="/skatemap"
      className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-white transition-colors font-mono py-1 select-none"
    >
      <span>← Vissza a Skate Map-hez</span>
    </Link>
  </div>
);

const GamePage: React.FC = () => {
  useSEO({
    title: 'Titkos Játékterem | Már Megint?',
    description: 'Titkos easter egg játékterem a Már Megint skate mapen.',
  });

  const [selectedGame, setSelectedGame] = useState<GameChoice>('select');

  // ── Desktop nézet észlelése (min-width: 1024px) a WebGL CRT effekthez ──
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(min-width: 1024px)').matches;
  });

  // ── CRT effekt toggle állapot (alapértelmezetten desktopon BE, mobilon KI; a választást localStorage őrzi) ──
  const [crtEnabled, setCrtEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('game_page_crt_enabled');
      if (saved !== null) {
        return saved === 'true';
      }
      // Ha még nincs tárolt beállítás: asztalin automatikusan BE, mobilon automatikusan KI
      if (typeof window !== 'undefined') {
        return window.matchMedia('(min-width: 1024px)').matches;
      }
      return false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(min-width: 1024px)');
    const onChange = (e: MediaQueryListEvent) => {
      setIsDesktop(e.matches);
    };
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  const handleToggleCrt = useCallback(() => {
    setCrtEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('game_page_crt_enabled', String(next));
      } catch {}
      return next;
    });
  }, []);

  // ── Háttérzene ──
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [volume, setVolume] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('mm_game_volume');
      return saved !== null ? Math.max(0, Math.min(1, parseFloat(saved))) : 0.5;
    } catch {
      return 0.5;
    }
  });
  const [muted, setMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('mm_game_muted') === 'true';
    } catch {
      return false;
    }
  });

  // Létrehozzuk az Audio elemet egyszer, és loopoljuk
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'none';
    audio.src = '/game-music.mp3';
    audio.loop = true;
    audio.volume = muted ? 0 : volume;
    audioRef.current = audio;

    // Biztosítjuk a folyamatos loopolást akkor is, ha a loop attribútumot egyes böngészők eldobnák
    const handleEnded = () => {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    };
    audio.addEventListener('ended', handleEnded);

    // Autoplay – böngészők csak user interaction után engedik, ezért try/catch
    audio.play().catch(() => {
      // Első felhasználói interakció után próbáljuk újra
      const tryPlay = () => {
        audio.play().catch(() => {});
        document.removeEventListener('click', tryPlay);
        document.removeEventListener('keydown', tryPlay);
        document.removeEventListener('touchstart', tryPlay);
      };
      document.addEventListener('click', tryPlay, { once: true });
      document.addEventListener('keydown', tryPlay, { once: true });
      document.addEventListener('touchstart', tryPlay, { once: true });
    });

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, []);

  // Hangerő és némítás frissítése
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = muted ? 0 : volume;
  }, [volume, muted]);

  const lastVolumeRef = useRef(volume > 0 ? volume : 0.5);

  const handleVolumeChange = (v: number) => {
    setVolume(v);
    if (v > 0) lastVolumeRef.current = v;
    if (muted && v > 0) setMuted(false);
    try {
      localStorage.setItem('mm_game_volume', String(v));
      if (muted && v > 0) localStorage.setItem('mm_game_muted', 'false');
    } catch {}
  };

  const handleToggleMute = () => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    try {
      localStorage.setItem('mm_game_muted', String(nextMuted));
    } catch {}

    if (!nextMuted && volume === 0) {
      const fallback = lastVolumeRef.current || 0.5;
      setVolume(fallback);
      try {
        localStorage.setItem('mm_game_volume', String(fallback));
      } catch {}
    }
  };

  const isPong = selectedGame === 'pong' || selectedGame === 'pong2p';
  const isDino = selectedGame === 'dino' || selectedGame === 'dino2p';

  return (
    <div
      className={`min-h-screen min-h-[100dvh] bg-neutral-950 flex flex-col items-center ${
        isPong
          ? 'overflow-hidden touch-none justify-center p-2 sm:p-4 landscape:p-1'
          : isDino
          ? 'justify-start sm:justify-center pt-8 sm:pt-4 px-2 py-2 sm:p-4 landscape:pt-1 landscape:py-1'
          : 'justify-center p-4'
      }`}
    >
      {/* Fejléc vezérlők – mobilon és asztali nézetben is elérhető CRT kapcsoló, asztalin hangerővel */}
      <div className="fixed top-3 right-3 sm:top-4 sm:right-4 z-[60] flex flex-col items-end gap-1 select-none pointer-events-auto">
        <div className="flex items-center gap-2">
          <CrtToggleButton
            enabled={crtEnabled}
            onToggle={handleToggleCrt}
          />
          <div className="hidden sm:block">
            <PixelVolumeControl
              volume={volume}
              muted={muted}
              onChange={handleVolumeChange}
              onToggleMute={handleToggleMute}
            />
          </div>
        </div>
        <span className="hidden sm:block text-[10px] font-mono text-neutral-400/80 pr-1 tracking-wider drop-shadow select-none pointer-events-none">
          zene: made by cefi
        </span>
      </div>

      {selectedGame === 'select' && <GameSelector onSelect={setSelectedGame} />}
      {selectedGame === 'dino' && (
        <Suspense fallback={<GameLoader />}>
          <DinoGame onBack={() => setSelectedGame('select')} />
        </Suspense>
      )}
      {selectedGame === 'dino2p' && (
        <Suspense fallback={<GameLoader />}>
          <DinoGame2P onBack={() => setSelectedGame('select')} />
        </Suspense>
      )}
      {selectedGame === 'pong' && (
        <Suspense fallback={<GameLoader />}>
          <PongGame onBack={() => setSelectedGame('select')} />
        </Suspense>
      )}
      {selectedGame === 'pong2p' && (
        <Suspense fallback={<GameLoader />}>
          <PongGame2P onBack={() => setSelectedGame('select')} />
        </Suspense>
      )}

      {/* WebGL2 CRT optikai overlay – a CRT toggle állapota szerint (desktopon alapértelmezetten BE, mobilon KI) */}
      {crtEnabled && (
        <CRTWarp
          bloom={1.2}
          flicker={0.12}
          interference={0.15}
          mask="aperture"
          maskStrength={0.28}
          noise={0.08}
          persistence={0.65}
          scanlineFrequency={260}
          scanlineStrength={0.55}
          vignette={0.25}
        />
      )}
    </div>
  );
};

export default GamePage;
