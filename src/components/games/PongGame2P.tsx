import React, { useRef, useEffect, useCallback, useState } from 'react';

interface PongGame2PProps {
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

  scorePoint(isP1: boolean) {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const freq = isP1 ? [500, 700, 950] : [450, 650, 880];
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

// ── Konstansok (HAJSZÁLPONTOSAN megegyeznek az 1P móddal!) ──
const CANVAS_WIDTH = 760;
const CANVAS_HEIGHT = 440;
const PADDLE_WIDTH = 12;
const PADDLE_HEIGHT = 74;
const BALL_SIZE = 20;
const INITIAL_BALL_SPEED = 4.8;
const PADDLE_MOVE_SPEED = 7.0;
const OFFSET_X = 24;

const isTouchDevice = () =>
  typeof window !== 'undefined' &&
  ('ontouchstart' in window || navigator.maxTouchPoints > 0);

export const PongGame2P: React.FC<PongGame2PProps> = ({ onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number>(0);
  const ballImgRef = useRef<HTMLImageElement | null>(null);

  // MMBall textúra betöltése
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

  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [, setGameStatus] = useState<'idle' | 'waiting' | 'playing'>('idle');

  // Rekordok betöltése localStorage-ből
  const [bestRally, setBestRally] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('mm_pong2p_max_rally');
      return saved ? parseInt(saved, 10) || 0 : 0;
    } catch {
      return 0;
    }
  });

  const [hasStarted, setHasStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const isMobile = isTouchDevice();

  // Mobil Scroll Zárolása
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
    p1Y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
    p2Y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
    ballX: CANVAS_WIDTH / 2 - BALL_SIZE / 2,
    ballY: CANVAS_HEIGHT / 2 - BALL_SIZE / 2,
    ballVX: INITIAL_BALL_SPEED,
    ballVY: 2,
    p1Score: 0,
    p2Score: 0,
    status: 'idle' as 'idle' | 'waiting' | 'playing',
    rallyCount: 0,
    lastScoredDir: 1 as 1 | -1,
    paused: false,
    hasStarted: false,
    bestRally: bestRally,
  });

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

  const handleStartGame = useCallback(() => {
    state.current.hasStarted = true;
    setHasStarted(true);
    startPlaying();
  }, [startPlaying]);

  const handleResume = useCallback(() => {
    setIsPaused(false);
  }, []);

  const handleRestart = useCallback(() => {
    const s = state.current;
    s.p1Score = 0;
    s.p2Score = 0;
    s.rallyCount = 0;
    s.p1Y = CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2;
    s.p2Y = CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2;
    s.ballX = CANVAS_WIDTH / 2 - BALL_SIZE / 2;
    s.ballY = CANVAS_HEIGHT / 2 - BALL_SIZE / 2;
    s.ballVX = 0;
    s.ballVY = 0;
    s.paused = false;
    s.hasStarted = false;
    s.status = 'idle';
    setP1Score(0);
    setP2Score(0);
    setIsPaused(false);
    setHasStarted(false);
    setGameStatus('idle');
  }, []);

  // ── Billentyűzetkezelés ──
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      if (e.key) keys.current[e.key] = true;

      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (state.current.paused) return;

        if (!state.current.hasStarted) {
          handleStartGame();
          return;
        }

        if (state.current.status === 'idle' || state.current.status === 'waiting') {
          startPlaying();
        }
      }

      if (e.code === 'Escape') {
        e.preventDefault();
        if (!state.current.hasStarted) {
          onBack();
          return;
        }
        setIsPaused((prev) => !prev);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
      if (e.key) keys.current[e.key] = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [startPlaying, handleStartGame, onBack]);

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
      ctx.fillText(String(s.p1Score), CANVAS_WIDTH / 2 - 90, 75);
      ctx.fillText(String(s.p2Score), CANVAS_WIDTH / 2 + 90, 75);

      ctx.font = '10px monospace';
      ctx.fillStyle = '#34d399';
      ctx.fillText('P1 (BAL)', CANVAS_WIDTH / 2 - 90, 95);
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('P2 (JOBB)', CANVAS_WIDTH / 2 + 90, 95);

      // Bal ütő: Player 1 (Emerald)
      pFill(ctx, OFFSET_X, s.p1Y, PADDLE_WIDTH, PADDLE_HEIGHT, '#34d399');
      // Jobb ütő: Player 2 (Sky)
      pFill(ctx, CANVAS_WIDTH - OFFSET_X - PADDLE_WIDTH, s.p2Y, PADDLE_WIDTH, PADDLE_HEIGHT, '#38bdf8');

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

    // ── Fizika frissítése Fix 144Hz lépésközzel (Ugyanaz a tempó és dinamika!) ──
    const updatePongPhysics = (s: typeof state.current) => {
      // ── P1 (Bal oldal) Irányítás: W és S ──
      if (keys.current['KeyW']) {
        s.p1Y = Math.max(8, s.p1Y - PADDLE_MOVE_SPEED);
      }
      if (keys.current['KeyS']) {
        s.p1Y = Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT - 8, s.p1Y + PADDLE_MOVE_SPEED);
      }

      // ── P2 (Jobb oldal) Irányítás: U / ArrowUp (Fel) és J / ArrowDown (Le) ──
      const p2Up = keys.current['KeyU'] || keys.current['ArrowUp'];
      const p2Down = keys.current['KeyJ'] || keys.current['ArrowDown'];

      if (p2Up) {
        s.p2Y = Math.max(8, s.p2Y - PADDLE_MOVE_SPEED);
      }
      if (p2Down) {
        s.p2Y = Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT - 8, s.p2Y + PADDLE_MOVE_SPEED);
      }

      s.ballX += s.ballVX;
      s.ballY += s.ballVY;

      // Felső és alsó fal ütközés
      if (s.ballY <= 6) {
        s.ballY = 6;
        s.ballVY = Math.abs(s.ballVY);
        sounds.wallBounce();
      } else if (s.ballY + BALL_SIZE >= CANVAS_HEIGHT - 6) {
        s.ballY = CANVAS_HEIGHT - 6 - BALL_SIZE;
        s.ballVY = -Math.abs(s.ballVY);
        sounds.wallBounce();
      }

      // Bal ütő ütközés (Player 1)
      const p1X = OFFSET_X;
      if (
        s.ballX <= p1X + PADDLE_WIDTH && s.ballX + BALL_SIZE >= p1X &&
        s.ballY + BALL_SIZE >= s.p1Y && s.ballY <= s.p1Y + PADDLE_HEIGHT &&
        s.ballVX < 0
      ) {
        s.ballX = p1X + PADDLE_WIDTH;
        const hitOffset = (s.ballY + BALL_SIZE / 2 - (s.p1Y + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2);
        const angle = hitOffset * (50 * Math.PI) / 180;
        const newSpeed = Math.min(Math.sqrt(s.ballVX ** 2 + s.ballVY ** 2) + 0.35, 13.5);
        s.ballVX = Math.cos(angle) * newSpeed;
        s.ballVY = Math.sin(angle) * newSpeed;
        s.rallyCount++;
        if (s.rallyCount > s.bestRally) {
          s.bestRally = s.rallyCount;
          setBestRally(s.rallyCount);
          try {
            localStorage.setItem('mm_pong2p_max_rally', String(s.rallyCount));
          } catch {}
        }
        sounds.paddleHit();
      }

      // Jobb ütő ütközés (Player 2)
      const p2X = CANVAS_WIDTH - OFFSET_X - PADDLE_WIDTH;
      if (
        s.ballX + BALL_SIZE >= p2X && s.ballX <= p2X + PADDLE_WIDTH &&
        s.ballY + BALL_SIZE >= s.p2Y && s.ballY <= s.p2Y + PADDLE_HEIGHT &&
        s.ballVX > 0
      ) {
        s.ballX = p2X - BALL_SIZE;
        const hitOffset = (s.ballY + BALL_SIZE / 2 - (s.p2Y + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2);
        const angle = Math.PI - hitOffset * (50 * Math.PI) / 180;
        const newSpeed = Math.min(Math.sqrt(s.ballVX ** 2 + s.ballVY ** 2) + 0.35, 13.5);
        s.ballVX = Math.cos(angle) * newSpeed;
        s.ballVY = Math.sin(angle) * newSpeed;
        s.rallyCount++;
        if (s.rallyCount > s.bestRally) {
          s.bestRally = s.rallyCount;
          setBestRally(s.rallyCount);
          try {
            localStorage.setItem('mm_pong2p_max_rally', String(s.rallyCount));
          } catch {}
        }
        sounds.paddleHit();
      }

      // Pontszerzés
      if (s.ballX + BALL_SIZE < 0) {
        // Labda kiment balra -> Player 2 pontot kap!
        s.p2Score++;
        setP2Score(s.p2Score);
        sounds.scorePoint(false);
        resetBall(1);
      } else if (s.ballX > CANVAS_WIDTH) {
        // Labda kiment jobbra -> Player 1 pontot kap!
        s.p1Score++;
        setP1Score(s.p1Score);
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
        ctx.fillText('SZÓKÖZ / KOPPINTÁS → ADOGATÁS', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 22);
        ctx.globalAlpha = 1;
        frameRef.current = requestAnimationFrame(loop);
        return;
      }

      if (s.paused) {
        drawPaddlesBallAndScores(s);
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        frameRef.current = requestAnimationFrame(loop);
        return;
      }

      // Fizika frissítése
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
          <span>P1: <strong className="text-emerald-400">{p1Score}</strong></span>
          <span>P2: <strong className="text-sky-400">{p2Score}</strong></span>
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

        {/* Kezdőképernyő overlay */}
        {!hasStarted && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-4 text-center z-10"
            style={{ backdropFilter: 'blur(6px)', backgroundColor: 'rgba(0,0,0,0.6)' }}
          >
            <p
              className="text-white text-lg sm:text-xl font-black tracking-widest font-mono"
              style={{ textShadow: '2px 2px 0 #000, -2px -2px 0 #000' }}
            >
              [ 2 JÁTÉKOS PONG ]
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-mono text-neutral-300 bg-neutral-900/80 border border-white/15 px-4 py-2 rounded-xl shadow-lg">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                P1 (Bal): <strong className="text-white">W / S</strong>
              </span>
              <span className="text-neutral-600">vs</span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                P2 (Jobb): <strong className="text-white">U / J vagy Nyilak (↑ / ↓)</strong>
              </span>
            </div>

            <button
              type="button"
              onClick={handleStartGame}
              className="cursor-pointer font-mono font-black text-sm text-black bg-white px-7 py-2.5 tracking-widest hover:bg-neutral-200 active:scale-95 transition-transform select-none"
              style={{ imageRendering: 'pixelated', boxShadow: '3px 3px 0 #555' }}
            >
              ▶ MÉRKŐZÉS INDÍTÁSA
            </button>
            <p className="text-neutral-400 text-[11px] font-mono">
              nyomj Szóközt vagy kattints az indításhoz
            </p>
          </div>
        )}

        {/* ESC pause overlay */}
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
          </div>
        )}
      </div>

      {/* Mobilos érintésvezérlők */}
      <div className="flex sm:hidden w-full items-center justify-between gap-3 pt-1 touch-none">
        {/* P1 Bal oldali gombok */}
        <div className="flex-1 flex gap-1.5">
          <button
            type="button"
            onTouchStart={(e) => {
              e.preventDefault();
              keys.current['KeyW'] = true;
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              keys.current['KeyW'] = false;
            }}
            className="flex-1 py-3 bg-emerald-950/70 border border-emerald-500/30 rounded-xl text-xs font-bold font-mono text-emerald-300 active:bg-emerald-900 select-none active:scale-95 transition-transform"
          >
            P1 ⤒
          </button>
          <button
            type="button"
            onTouchStart={(e) => {
              e.preventDefault();
              keys.current['KeyS'] = true;
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              keys.current['KeyS'] = false;
            }}
            className="flex-1 py-3 bg-emerald-950/70 border border-emerald-500/30 rounded-xl text-xs font-bold font-mono text-emerald-300 active:bg-emerald-900 select-none active:scale-95 transition-transform"
          >
            P1 ⤓
          </button>
        </div>

        {/* P2 Jobb oldali gombok */}
        <div className="flex-1 flex gap-1.5">
          <button
            type="button"
            onTouchStart={(e) => {
              e.preventDefault();
              keys.current['KeyU'] = true;
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              keys.current['KeyU'] = false;
            }}
            className="flex-1 py-3 bg-sky-950/70 border border-sky-500/30 rounded-xl text-xs font-bold font-mono text-sky-300 active:bg-sky-900 select-none active:scale-95 transition-transform"
          >
            P2 ⤒
          </button>
          <button
            type="button"
            onTouchStart={(e) => {
              e.preventDefault();
              keys.current['KeyJ'] = true;
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              keys.current['KeyJ'] = false;
            }}
            className="flex-1 py-3 bg-sky-950/70 border border-sky-500/30 rounded-xl text-xs font-bold font-mono text-sky-300 active:bg-sky-900 select-none active:scale-95 transition-transform"
          >
            P2 ⤓
          </button>
        </div>
      </div>

      {/* Lábléc */}
      <div className="text-neutral-400 text-[11px] font-mono text-center flex flex-wrap justify-center gap-x-4 gap-y-1">
        <span>
          <strong className="text-emerald-400">P1 (Bal ütő):</strong> W = Fel, S = Le
        </span>
        <span>
          <strong className="text-sky-400">P2 (Jobb ütő):</strong> U / ↑ = Fel, J / ↓ = Le
        </span>
        {!isMobile && <span className="text-neutral-500">• ESC = szünet</span>}
      </div>
    </div>
  );
};

export default PongGame2P;
