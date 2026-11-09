import React, { useRef, useEffect, useCallback, useState } from 'react';

interface PongGameProps {
  onBack: () => void;
}

// ── Web Audio Synth a Pong játékhoz ──
class PongSynth {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  paddleHit() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(450, ctx.currentTime);
      gain.gain.setValueAtTime(0.07, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {}
  }

  wallBounce() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(260, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch {}
  }

  scorePoint(isPlayer: boolean) {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const freq = isPlayer ? [500, 700, 950] : [350, 240, 150];
      freq.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(f, now + idx * 0.09);
        gain.gain.setValueAtTime(0.08, now + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.08);
      });
    } catch {}
  }
}

const sounds = new PongSynth();

// ── Konstansok ──
const CANVAS_WIDTH = 760;
const CANVAS_HEIGHT = 440;
const PADDLE_WIDTH = 12;
const PADDLE_HEIGHT = 74;
const BALL_SIZE = 20;
const INITIAL_BALL_SPEED = 4.8;
const PADDLE_MOVE_SPEED = 7.0;
const BASE_AI_SPEED = 4.2;
const OFFSET_X = 24;

const isTouchDevice = () =>
  typeof window !== 'undefined' &&
  ('ontouchstart' in window || navigator.maxTouchPoints > 0);

export const PongGame: React.FC<PongGameProps> = ({ onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number>(0);
  const ballImgRef = useRef<HTMLImageElement | null>(null);

  // MMBall textúra betöltése (tökéletesen vágott, nulla transzparens margóval)
  useEffect(() => {
    const img = new Image();
    img.src = `${import.meta.env.BASE_URL}mmball.png`;
    img.onload = () => {
      ballImgRef.current = img;
    };
    img.onerror = () => {
      if (!img.src.endsWith('/mmball.png')) {
        img.src = '/mmball.png';
      }
    };
    ballImgRef.current = img;
  }, []);

  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [gameStatus, setGameStatus] = useState<'idle' | 'waiting' | 'playing'>('idle');

  // Rekordok betöltése localStorage-ből
  const [bestRally, setBestRally] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('mm_pong_max_rally');
      return saved ? parseInt(saved, 10) || 0 : 0;
    } catch {
      return 0;
    }
  });

  const [bestScore, setBestScore] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('mm_pong_best_score');
      return saved ? parseInt(saved, 10) || 0 : 0;
    } catch {
      return 0;
    }
  });

  // Kezdőképernyő állapota – induláskor nem indul instant, menü fogadja a játékost
  const [hasStarted, setHasStarted] = useState(false);
  // ESC pause overlay – cursor látható, játék megáll
  const [isPaused, setIsPaused] = useState(false);
  const isMobile = isTouchDevice();

  // ── Mobil Scroll & Gesztus Zárolása Pong alatt ──
  useEffect(() => {
    const origBodyOverflow = document.body.style.overflow;
    const origBodyTouchAction = document.body.style.touchAction;
    const origBodyOverscroll = document.body.style.overscrollBehavior;
    const origHtmlOverflow = document.documentElement.style.overflow;
    const origHtmlTouchAction = document.documentElement.style.touchAction;
    const origHtmlOverscroll = document.documentElement.style.overscrollBehavior;

    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    document.body.style.overscrollBehavior = 'none';
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.touchAction = 'none';
    document.documentElement.style.overscrollBehavior = 'none';

    return () => {
      document.body.style.overflow = origBodyOverflow;
      document.body.style.touchAction = origBodyTouchAction;
      document.body.style.overscrollBehavior = origBodyOverscroll;
      document.documentElement.style.overflow = origHtmlOverflow;
      document.documentElement.style.touchAction = origHtmlTouchAction;
      document.documentElement.style.overscrollBehavior = origHtmlOverscroll;
    };
  }, []);

  const keys = useRef<Record<string, boolean>>({});

  const state = useRef({
    playerY: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
    aiY: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
    ballX: CANVAS_WIDTH / 2 - BALL_SIZE / 2,
    ballY: CANVAS_HEIGHT / 2 - BALL_SIZE / 2,
    ballVX: INITIAL_BALL_SPEED,
    ballVY: 2,
    playerScore: 0,
    aiScore: 0,
    status: 'idle' as 'idle' | 'waiting' | 'playing',
    rallyCount: 0,
    lastScoredDir: 1 as 1 | -1,
    paused: false,
    hasStarted: false,
    bestRally: bestRally,
    bestScore: bestScore,
  });

  // ── Kurzor: cursor:none a body-n játék közben ──
  // Kezdőmenüben és pause alatt látható a kurzor; csak aktív játék közben rejtjük el.
  useEffect(() => {
    if (isMobile) return;
    if (isPaused || !hasStarted) {
      document.body.style.cursor = '';
    } else {
      document.body.style.cursor = 'none';
    }
    return () => {
      document.body.style.cursor = '';
    };
  }, [isPaused, isMobile, hasStarted]);

  // ── Syncronizáció: state.current.paused / hasStarted ↔ React state ──
  useEffect(() => {
    state.current.paused = isPaused;
  }, [isPaused]);

  useEffect(() => {
    state.current.hasStarted = hasStarted;
  }, [hasStarted]);

  const resetBall = useCallback((direction: 1 | -1) => {
    const s = state.current;
    s.ballX = CANVAS_WIDTH / 2 - BALL_SIZE / 2;
    s.ballY = CANVAS_HEIGHT / 2 - BALL_SIZE / 2;
    s.ballVX = 0;
    s.ballVY = 0;
    s.rallyCount = 0;
    s.lastScoredDir = direction;
    s.status = 'waiting';
    setGameStatus('waiting');
  }, []);

  const startPlaying = useCallback(() => {
    const s = state.current;
    if (s.status !== 'idle' && s.status !== 'waiting') return;
    const dir = s.status === 'waiting' ? s.lastScoredDir : (Math.random() > 0.5 ? 1 : -1);
    s.status = 'playing';
    setGameStatus('playing');
    const angle = (Math.random() * 0.7 - 0.35) * Math.PI;
    const speed = INITIAL_BALL_SPEED;
    s.ballX = CANVAS_WIDTH / 2 - BALL_SIZE / 2;
    s.ballY = CANVAS_HEIGHT / 2 - BALL_SIZE / 2;
    s.ballVX = Math.cos(angle) * speed * dir;
    s.ballVY = Math.sin(angle) * speed;
  }, []);

  // Játék indítása a kezdőmenüből
  const handleStartGame = useCallback(() => {
    state.current.hasStarted = true;
    setHasStarted(true);
    startPlaying();
  }, [startPlaying]);

  // Resume: ESC overlay bezárása → kurzor elrejtése, játék folytatása
  const handleResume = useCallback(() => {
    setIsPaused(false);
  }, []);

  // Új játék: visszaállítás a kezdőmenübe
  const handleRestart = useCallback(() => {
    const s = state.current;
    s.playerScore = 0;
    s.aiScore = 0;
    s.rallyCount = 0;
    s.playerY = CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2;
    s.aiY = CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2;
    s.ballX = CANVAS_WIDTH / 2 - BALL_SIZE / 2;
    s.ballY = CANVAS_HEIGHT / 2 - BALL_SIZE / 2;
    s.ballVX = 0;
    s.ballVY = 0;
    s.paused = false;
    s.hasStarted = false;
    s.status = 'idle';
    setPlayerScore(0);
    setAiScore(0);
    setIsPaused(false);
    setHasStarted(false);
    setGameStatus('idle');
  }, []);

  // ── Billentyűzetkezelés ──
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keys.current[e.code] = true;

      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        // Ha pausálva van, az overlay aktív → ne indítson
        if (state.current.paused) return;

        // Ha még a kezdőmenüben vagyunk, a gomb megnyomására induljon
        if (!state.current.hasStarted) {
          handleStartGame();
          return;
        }

        // Pontszerzés utáni várakozáskor szóköz/enter indítja a következő menetet
        if (state.current.status === 'idle' || state.current.status === 'waiting') {
          startPlaying();
        }
      }

      // ESC kezelés
      if (e.code === 'Escape') {
        e.preventDefault();
        if (!state.current.hasStarted) {
          // Ha még el se indult, az ESC-re visszamehet a játékválasztóhoz
          onBack();
          return;
        }
        // Játék közben ki/be kapcsolja a szünetet
        setIsPaused((prev) => !prev);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [startPlaying, handleStartGame, onBack]);

  // ── Globális egérfigyelő ──
  useEffect(() => {
    if (isMobile) return;

    const onGlobalMouseMove = (e: MouseEvent) => {
      // Ha a pause overlay vagy a kezdőmenü aktív, az egér mozgása NEM irányítja az ütőt
      if (state.current.paused || !state.current.hasStarted) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleY = CANVAS_HEIGHT / rect.height;
      const rawY = (e.clientY - rect.top) * scaleY;
      const clampedY = Math.max(8, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT - 8, rawY - PADDLE_HEIGHT / 2));
      state.current.playerY = clampedY;
    };

    document.addEventListener('mousemove', onGlobalMouseMove);
    return () => document.removeEventListener('mousemove', onGlobalMouseMove);
  }, [isMobile]);

  // ── Natív nem-passzív érintésfigyelő mobilon (megakadályozza az oldal görgetését) ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onNativeTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (state.current.paused || !state.current.hasStarted) return;
      if (e.touches.length === 0) return;
      const rect = canvas.getBoundingClientRect();
      const scaleY = CANVAS_HEIGHT / rect.height;
      const touchY = (e.touches[0].clientY - rect.top) * scaleY;
      state.current.playerY = Math.max(
        8,
        Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT - 8, touchY - PADDLE_HEIGHT / 2)
      );
    };

    const onNativeTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (state.current.paused || !state.current.hasStarted) return;
      if (state.current.status === 'waiting') {
        startPlaying();
      }
    };

    canvas.addEventListener('touchmove', onNativeTouchMove, { passive: false });
    canvas.addEventListener('touchstart', onNativeTouchStart, { passive: false });

    return () => {
      canvas.removeEventListener('touchmove', onNativeTouchMove);
      canvas.removeEventListener('touchstart', onNativeTouchStart);
    };
  }, [startPlaying]);

  const handleActivate = useCallback(() => {
    if (state.current.paused || !state.current.hasStarted) return;
    if (state.current.status === 'waiting') {
      startPlaying();
    }
  }, [startPlaying]);

  const pFill = (
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, fill: string
  ) => {
    ctx.fillStyle = fill;
    ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
  };

  // ── Játékciklus ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawBackground = () => {
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      pFill(ctx, 0, 0, CANVAS_WIDTH, 6, '#262626');
      pFill(ctx, 0, CANVAS_HEIGHT - 6, CANVAS_WIDTH, 6, '#262626');
      ctx.setLineDash([10, 10]);
      ctx.strokeStyle = '#262626';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(CANVAS_WIDTH / 2, 6);
      ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 6);
      ctx.stroke();
      ctx.setLineDash([]);
    };

    const drawPaddlesBallAndScores = (s: typeof state.current) => {
      ctx.font = 'bold 54px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#262626';
      ctx.fillText(String(s.playerScore), CANVAS_WIDTH / 2 - 90, 75);
      ctx.fillText(String(s.aiScore), CANVAS_WIDTH / 2 + 90, 75);
      ctx.font = '10px monospace';
      ctx.fillStyle = '#404040';
      ctx.fillText('TE', CANVAS_WIDTH / 2 - 90, 95);
      ctx.fillText('GÉP', CANVAS_WIDTH / 2 + 90, 95);
      pFill(ctx, OFFSET_X, s.playerY, PADDLE_WIDTH, PADDLE_HEIGHT, '#34d399');
      pFill(ctx, CANVAS_WIDTH - OFFSET_X - PADDLE_WIDTH, s.aiY, PADDLE_WIDTH, PADDLE_HEIGHT, '#ef4444');

      const ballImg = ballImgRef.current;
      if (ballImg && ballImg.complete && ballImg.naturalWidth > 0) {
        ctx.drawImage(
          ballImg,
          Math.floor(s.ballX),
          Math.floor(s.ballY),
          BALL_SIZE,
          BALL_SIZE
        );
      } else {
        pFill(ctx, s.ballX, s.ballY, BALL_SIZE, BALL_SIZE, '#ffffff');
      }
    };

    // ── Fizika frissítése (Fix 144Hz lépésköz, mobilon és asztali gépen azonos tempó) ──
    const updatePongPhysics = (s: typeof state.current) => {
      if (keys.current['ArrowUp'] || keys.current['KeyW']) {
        s.playerY = Math.max(8, s.playerY - PADDLE_MOVE_SPEED);
      }
      if (keys.current['ArrowDown'] || keys.current['KeyS']) {
        s.playerY = Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT - 8, s.playerY + PADDLE_MOVE_SPEED);
      }

      // AI követés a labda pontos közepéhez
      const aiTarget = s.ballY + BALL_SIZE / 2;
      const aiCenter = s.aiY + PADDLE_HEIGHT / 2;
      const deltaY = aiTarget - aiCenter;
      const effectiveAISpeed = BASE_AI_SPEED + Math.min(s.rallyCount * 0.08, 3.8);
      if (Math.abs(deltaY) > 8) {
        s.aiY += Math.sign(deltaY) * Math.min(Math.abs(deltaY), effectiveAISpeed);
      }
      s.aiY = Math.max(8, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT - 8, s.aiY));

      s.ballX += s.ballVX;
      s.ballY += s.ballVY;

      // Felső és alsó fal ütközés: pontosan a 6px-es vizuális vonalhoz illeszkedve
      if (s.ballY <= 6) {
        s.ballY = 6;
        s.ballVY = Math.abs(s.ballVY);
        sounds.wallBounce();
      } else if (s.ballY + BALL_SIZE >= CANVAS_HEIGHT - 6) {
        s.ballY = CANVAS_HEIGHT - 6 - BALL_SIZE;
        s.ballVY = -Math.abs(s.ballVY);
        sounds.wallBounce();
      }

      const playerX = OFFSET_X;
      if (
        s.ballX <= playerX + PADDLE_WIDTH && s.ballX + BALL_SIZE >= playerX &&
        s.ballY + BALL_SIZE >= s.playerY && s.ballY <= s.playerY + PADDLE_HEIGHT &&
        s.ballVX < 0
      ) {
        s.ballX = playerX + PADDLE_WIDTH;
        const hitOffset = (s.ballY + BALL_SIZE / 2 - (s.playerY + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2);
        const angle = hitOffset * (50 * Math.PI) / 180;
        const newSpeed = Math.min(Math.sqrt(s.ballVX ** 2 + s.ballVY ** 2) + 0.35, 13.5);
        s.ballVX = Math.cos(angle) * newSpeed;
        s.ballVY = Math.sin(angle) * newSpeed;
        s.rallyCount++;
        if (s.rallyCount > s.bestRally) {
          s.bestRally = s.rallyCount;
          setBestRally(s.rallyCount);
          try {
            localStorage.setItem('mm_pong_max_rally', String(s.rallyCount));
          } catch {}
        }
        sounds.paddleHit();
      }

      const aiX = CANVAS_WIDTH - OFFSET_X - PADDLE_WIDTH;
      if (
        s.ballX + BALL_SIZE >= aiX && s.ballX <= aiX + PADDLE_WIDTH &&
        s.ballY + BALL_SIZE >= s.aiY && s.ballY <= s.aiY + PADDLE_HEIGHT &&
        s.ballVX > 0
      ) {
        s.ballX = aiX - BALL_SIZE;
        const hitOffset = (s.ballY + BALL_SIZE / 2 - (s.aiY + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2);
        const angle = Math.PI - hitOffset * (50 * Math.PI) / 180;
        const newSpeed = Math.min(Math.sqrt(s.ballVX ** 2 + s.ballVY ** 2) + 0.35, 13.5);
        s.ballVX = Math.cos(angle) * newSpeed;
        s.ballVY = Math.sin(angle) * newSpeed;
        s.rallyCount++;
        if (s.rallyCount > s.bestRally) {
          s.bestRally = s.rallyCount;
          setBestRally(s.rallyCount);
          try {
            localStorage.setItem('mm_pong_max_rally', String(s.rallyCount));
          } catch {}
        }
        sounds.paddleHit();
      }

      if (s.ballX + BALL_SIZE < 0) {
        s.aiScore++;
        setAiScore(s.aiScore);
        sounds.scorePoint(false);
        resetBall(1);
      } else if (s.ballX > CANVAS_WIDTH) {
        s.playerScore++;
        setPlayerScore(s.playerScore);
        if (s.playerScore > s.bestScore) {
          s.bestScore = s.playerScore;
          setBestScore(s.playerScore);
          try {
            localStorage.setItem('mm_pong_best_score', String(s.playerScore));
          } catch {}
        }
        sounds.scorePoint(true);
        resetBall(-1);
      }
    };

    let lastTime = performance.now();
    let accumulator = 0;
    const STEP = 1000 / 144; // 6.944 ms

    const loop = (timestamp: number) => {
      const s = state.current;
      const now = timestamp || performance.now();
      let elapsed = now - lastTime;
      if (elapsed > 100) elapsed = 100;
      lastTime = now;

      drawBackground();

      // Ha még a kezdőmenüben vagyunk, csak az alapállapotot (pálya + ütők + labda) rajzoljuk
      if (!s.hasStarted) {
        drawPaddlesBallAndScores(s);
        frameRef.current = requestAnimationFrame(loop);
        return;
      }

      if (s.status === 'idle') {
        drawPaddlesBallAndScores(s);
        frameRef.current = requestAnimationFrame(loop);
        return;
      }

      if (s.status === 'waiting') {
        drawPaddlesBallAndScores(s);
        const pulse = Math.sin(Date.now() / 350) * 0.4 + 0.6;
        ctx.globalAlpha = pulse;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('KATTINTS / KOPPINTS / SZÓKÖZ → FOLYTATÁS', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 22);
        ctx.globalAlpha = 1;
        frameRef.current = requestAnimationFrame(loop);
        return;
      }

      // ── PAUSE: csak rajzol, nem frissít ──
      if (s.paused) {
        drawPaddlesBallAndScores(s);
        // Halvány blur-effekt szimulálása a vásznon
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        frameRef.current = requestAnimationFrame(loop);
        return;
      }

      // ── FRISSÍTÉSI LOGIKA FIX TIMESTEPPEL ──
      accumulator += elapsed;
      while (accumulator >= STEP) {
        updatePongPhysics(s);
        accumulator -= STEP;
        if (s.status !== 'playing' || s.paused) break;
      }

      drawPaddlesBallAndScores(s);

      if (s.rallyCount > 4) {
        ctx.font = '11px monospace';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(
          `MENET: ${s.rallyCount}x${s.bestRally > 0 ? ` (REKORD: ${Math.max(s.rallyCount, s.bestRally)}x)` : ''}`,
          CANVAS_WIDTH / 2,
          CANVAS_HEIGHT - 20
        );
      }

      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [resetBall]);

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-4xl px-2 sm:px-3 animate-in fade-in duration-300">
      {/* Felső vezérlősáv */}
      <div className="w-full flex items-center justify-between">
        <button
          onClick={onBack}
          type="button"
          className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-mono text-neutral-400 hover:text-white transition-colors select-none py-1"
        >
          <span>← Vissza a választáshoz</span>
        </button>
        <div className="text-xs font-mono text-neutral-400 flex items-center gap-3 sm:gap-4">
          <span>TE: <strong className="text-emerald-400">{playerScore}</strong></span>
          <span>GÉP: <strong className="text-rose-400">{aiScore}</strong></span>
          {bestRally > 0 && (
            <span className="hidden sm:inline text-neutral-400 text-[11px] bg-neutral-900 border border-white/10 px-2 py-0.5 rounded">
              REKORD MENET: <strong className="text-white">{bestRally}x</strong>
            </span>
          )}
          {hasStarted && (
            isMobile ? (
              <button
                type="button"
                onClick={() => setIsPaused((p) => !p)}
                className="cursor-pointer text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-white/10 active:scale-95 transition-transform"
              >
                {isPaused ? '▶ Folytatás' : '⏸ Szünet'}
              </button>
            ) : (
              <span className="text-neutral-600 text-[10px]">ESC = szünet</span>
            )
          )}
        </div>
      </div>

      {/* Pong vászon + Menü / ESC pause overlay */}
      <div
        ref={containerRef}
        className="w-full relative rounded-2xl overflow-hidden border border-white/15 bg-neutral-950 shadow-2xl select-none touch-none"
        style={{ touchAction: 'none' }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onMouseDown={handleActivate}
          className="w-full block touch-none"
          style={{ imageRendering: 'pixelated', maxHeight: '55vh', objectFit: 'contain', touchAction: 'none' }}
        />

        {/* Kezdőképernyő / Játék kezdése overlay – hasonlóan az ESC menühöz */}
        {!hasStarted && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-4 text-center z-10"
            style={{ backdropFilter: 'blur(6px)', backgroundColor: 'rgba(0,0,0,0.6)' }}
          >
            <p
              className="text-white text-lg sm:text-xl font-black tracking-widest font-mono"
              style={{ textShadow: '2px 2px 0 #000, -2px -2px 0 #000' }}
            >
              [ MÁRMEGINT PONG ]
            </p>

            {(bestRally > 0 || bestScore > 0) && (
              <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] font-mono text-neutral-300 bg-neutral-900/80 border border-white/15 px-3 py-1.5 rounded-xl shadow-lg">
                {bestRally > 0 && (
                  <span>Rekord menet: <strong className="text-white">{bestRally}x</strong></span>
                )}
                {bestScore > 0 && (
                  <span>• Legjobb pont: <strong className="text-white">{bestScore}</strong></span>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={handleStartGame}
              className="cursor-pointer font-mono font-black text-sm text-black bg-white px-7 py-2.5 tracking-widest hover:bg-neutral-200 active:scale-95 transition-transform select-none"
              style={{ imageRendering: 'pixelated', boxShadow: '3px 3px 0 #555' }}
            >
              ▶ JÁTÉK KEZDÉSE
            </button>
            <div className="flex flex-col items-center gap-1.5">
              <p className="text-neutral-400 text-[11px] font-mono">
                nyomj Szóközt vagy kattints a Játék kezdésére
              </p>
              <p className="text-neutral-500 text-[10px] font-mono">
                Irányítás: Egér / W &amp; S / Nyilak {!isMobile && '• ESC = szünet'}
              </p>
            </div>
          </div>
        )}

        {/* ESC pause overlay – CSS blur + pixel-stílusú "Folytatás" és "Új játék" gomb */}
        {isPaused && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-4 text-center z-10"
            style={{ backdropFilter: 'blur(6px)', backgroundColor: 'rgba(0,0,0,0.6)' }}
          >
            <p
              className="text-white text-lg font-black tracking-widest font-mono"
              style={{ textShadow: '2px 2px 0 #000, -2px -2px 0 #000' }}
            >
              [ SZÜNET ]
            </p>

            {(bestRally > 0 || bestScore > 0) && (
              <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] font-mono text-neutral-300 bg-neutral-900/80 border border-white/15 px-3 py-1.5 rounded-xl shadow-lg">
                {bestRally > 0 && (
                  <span>Rekord menet: <strong className="text-white">{bestRally}x</strong></span>
                )}
                {bestScore > 0 && (
                  <span>• Legjobb pont: <strong className="text-white">{bestScore}</strong></span>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleResume}
                className="cursor-pointer font-mono font-black text-sm text-black bg-white px-6 py-2 tracking-widest hover:bg-neutral-200 active:scale-95 transition-transform select-none"
                style={{ imageRendering: 'pixelated', boxShadow: '3px 3px 0 #555' }}
              >
                ▶ FOLYTATÁS
              </button>
              <button
                type="button"
                onClick={handleRestart}
                className="cursor-pointer font-mono font-black text-sm text-neutral-200 bg-neutral-900 border border-neutral-700 px-5 py-2 tracking-widest hover:bg-neutral-800 active:scale-95 transition-transform select-none"
                style={{ imageRendering: 'pixelated', boxShadow: '3px 3px 0 #333' }}
              >
                ↺ ÚJ JÁTÉK
              </button>
            </div>
            <p className="text-neutral-500 text-[11px] font-mono">
              {!isMobile ? 'nyomj ESC-et vagy kattints a Folytatásra' : 'koppints a Folytatásra a visszatéréshez'}
            </p>
          </div>
        )}
      </div>

      {/* Lábléc */}
      <div className="text-neutral-500 text-[11px] font-mono text-center">
        Irányítás: <span className="text-neutral-300">Egérmozgatás / W &amp; S / Nyilak</span>
        {!isMobile && <> &bull; <span className="text-neutral-500">ESC = szünet</span></>}
      </div>
    </div>
  );
};

export default PongGame;
