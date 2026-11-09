import React, { useRef, useEffect, useCallback, useState } from 'react';

interface DinoGameProps {
  onBack: () => void;
}

// ── 8-bites Web Audio Szintetizátor ──
class SoundSynth {
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

  jump() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(360, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 0.11);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.11);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.11);
    } catch {}
  }

  speedUp() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      [520, 680, 920].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);
        gain.gain.setValueAtTime(0.09, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.06);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.06);
      });
    } catch {}
  }

  hit() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.28);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.28);
    } catch {}
  }
}

const sounds = new SoundSynth();

// ── Játék Konstansok Alapértékek (Asztali géphez, mobilon dinamikusan méretezve) ──
const DESKTOP_CANVAS_WIDTH = 800;
const DESKTOP_CANVAS_HEIGHT = 260;
const DESKTOP_GROUND_Y = 215;
const MOBILE_CANVAS_WIDTH = 560;
const MOBILE_CANVAS_HEIGHT = 300;
const MOBILE_GROUND_Y = 245;

const GRAVITY = 0.32;
const JUMP_FORCE = -8.8;

// Már Megint Player Méretek
const PLAYER_STAND_W = 56;
const PLAYER_STAND_H = 47;
const PLAYER_DUCK_W = 66;
const PLAYER_DUCK_H = 30;
const PLAYER_X = 55;

const getInitialDimensions = () => {
  if (typeof window !== 'undefined' && window.innerWidth < 640) {
    return {
      width: MOBILE_CANVAS_WIDTH,
      height: MOBILE_CANVAS_HEIGHT,
      groundY: MOBILE_GROUND_Y,
      playerX: 42,
      isMobile: true,
    };
  }
  return {
    width: DESKTOP_CANVAS_WIDTH,
    height: DESKTOP_CANVAS_HEIGHT,
    groundY: DESKTOP_GROUND_Y,
    playerX: PLAYER_X,
    isMobile: false,
  };
};

// Pontos sebességi szakaszok (Nyugodt indulás, 1000-nél a 2. szint, a MAX sokkal később és nehezebb)
const SPEED_STAGES = [
  { minScore: 0, speed: 2.4, name: '1. SZAKASZ (ALAP)' },
  { minScore: 1000, speed: 3.2, name: '2. SZAKASZ' },
  { minScore: 2500, speed: 4.2, name: '3. SZAKASZ' },
  { minScore: 5000, speed: 5.2, name: 'MAX SZAKASZ' },
];

type ObstacleType =
  | 'stone_small'
  | 'stone_large'
  | 'stick_single'
  | 'stick_double'
  | 'scooter_standing'
  | 'scooter_lying';

interface Obstacle {
  x: number;
  y: number;
  w: number;
  h: number;
  type: ObstacleType;
}

interface HorizonDot {
  x: number;
  y: number;
  size: number;
}

interface Cloud {
  x: number;
  y: number;
  w: number;
}

// ── Globális Pixel Rajzoló Segédfüggvények ──
const pFill = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string
) => {
  ctx.fillStyle = fill;
  ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
};

// 1. SZÜRKE KŐ RAJZOLÁSA
const drawStone = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  isLarge: boolean
) => {
  if (!isLarge) {
    pFill(ctx, x + 3, y, w - 6, h, '#71717a');
    pFill(ctx, x, y + 3, w, h - 3, '#71717a');
    pFill(ctx, x + 5, y, w - 10, 2, '#a1a1aa');
    pFill(ctx, x + 2, y + 3, 3, 2, '#a1a1aa');
    pFill(ctx, x + 8, y + 5, 2, 6, '#3f3f46');
    pFill(ctx, x, y + h - 2, w, 2, '#27272a');
  } else {
    pFill(ctx, x + 3, y, 18, h, '#71717a');
    pFill(ctx, x, y + 3, 24, h - 3, '#71717a');
    pFill(ctx, x + 5, y, 14, 2, '#a1a1aa');
    pFill(ctx, x + 7, y + 5, 2, 8, '#3f3f46');
    pFill(ctx, x + 18, y + 4, w - 18, h - 4, '#64748b');
    pFill(ctx, x + 20, y + 4, w - 24, 2, '#94a3b8');
    pFill(ctx, x, y + h - 2, w, 2, '#1e293b');
  }
};

// 2. BARNA BOT / FAÁG RAJZOLÁSA
const drawStick = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  isDouble: boolean
) => {
  if (!isDouble) {
    pFill(ctx, x, y + h - 5, w, 5, '#854d0e');
    pFill(ctx, x + 2, y + h - 5, w - 4, 2, '#a16207');
    pFill(ctx, x, y + h - 2, w, 2, '#451a03');
    pFill(ctx, x + 8, y + 3, 3, 7, '#713f12');
    pFill(ctx, x + 7, y, 3, 5, '#854d0e');
    pFill(ctx, x + 15, y + 5, 2, 4, '#a16207');
  } else {
    pFill(ctx, x, y + h - 5, w, 5, '#713f12');
    pFill(ctx, x, y + h - 2, w, 2, '#3b1702');
    pFill(ctx, x + 5, y + h - 10, 8, 7, '#854d0e');
    pFill(ctx, x + 10, y + 3, 6, 10, '#9a3412');
    pFill(ctx, x + 15, y, 6, 7, '#b45309');
    pFill(ctx, x + 22, y + 5, 10, 4, '#854d0e');
  }
};

// 3. ROLLER RAJZOLÁSA
const drawScooter = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  isLying: boolean
) => {
  if (!isLying) {
    pFill(ctx, x, y + h - 5, 5, 5, '#0f172a');
    pFill(ctx, x + 1, y + h - 4, 3, 3, '#38bdf8');
    pFill(ctx, x + w - 6, y + h - 5, 5, 5, '#0f172a');
    pFill(ctx, x + w - 5, y + h - 4, 3, 3, '#38bdf8');
    pFill(ctx, x + 3, y + h - 4, w - 8, 3, '#94a3b8');
    pFill(ctx, x + 6, y + h - 5, w - 14, 2, '#10b981');
    pFill(ctx, x + w - 5, y + 5, 3, h - 9, '#e2e8f0');
    pFill(ctx, x + w - 14, y, 16, 4, '#f8fafc');
    pFill(ctx, x + w - 14, y, 5, 4, '#f43f5e');
    pFill(ctx, x + w - 3, y, 5, 4, '#f43f5e');
  } else {
    pFill(ctx, x + 5, y + h - 4, w - 10, 4, '#94a3b8');
    pFill(ctx, x + 8, y + h - 5, w - 16, 2, '#eab308');
    pFill(ctx, x, y + h - 5, 5, 5, '#0f172a');
    pFill(ctx, x + w - 8, y + h - 5, 5, 5, '#0f172a');
    pFill(ctx, x + 12, y + 3, w - 18, 3, '#cbd5e1');
    pFill(ctx, x + w - 8, y, 3, 10, '#f43f5e');
  }
};

// ── Akadály Magyarázó Mini Kártya Elem ──
const ObstacleLegendItem: React.FC<{
  type: 'stone' | 'stick' | 'scooter';
  label: string;
}> = ({ type, label }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (type === 'stone') {
      drawStone(ctx, 4, 9, 30, 19, true);
    } else if (type === 'stick') {
      drawStick(ctx, 4, 10, 34, 18, true);
    } else if (type === 'scooter') {
      drawScooter(ctx, 6, 2, 28, 34, false);
    }
  }, [type]);

  return (
    <div className="flex items-center gap-3 py-0.5">
      <canvas
        ref={canvasRef}
        width={40}
        height={38}
        className="shrink-0"
        style={{ imageRendering: 'pixelated' }}
      />
      <span className="text-neutral-500 font-bold font-mono text-sm select-none">=</span>
      <span className="text-neutral-300 font-mono font-bold text-xs uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
};

export const DinoGame: React.FC<DinoGameProps> = ({ onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);

  // Képernyőméret és dinamikus vászonméret (mobilon magasabb vászon, hogy jól látható legyen)
  const [dims, setDims] = useState(getInitialDimensions);
  const isMobileRef = useRef(dims.isMobile);

  useEffect(() => {
    const handleResize = () => {
      const next = getInitialDimensions();
      isMobileRef.current = next.isMobile;
      setDims(next);
      state.current.canvasWidth = next.width;
      state.current.canvasHeight = next.height;
      state.current.groundY = next.groundY;
      state.current.playerX = next.playerX;
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Képek betöltése
  const playerImgRef = useRef<HTMLImageElement | null>(null);
  const playerDuckImgRef = useRef<HTMLImageElement | null>(null);
  const [imagesLoaded, setImagesLoaded] = useState(false);

  const [highScore, setHighScore] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('mm_dino_hi');
      return saved ? parseInt(saved, 10) || 0 : 0;
    } catch {
      return 0;
    }
  });

  const [currentScore, setCurrentScore] = useState<number>(0);
  const [currentStageName, setCurrentStageName] = useState<string>('1. SZAKASZ (ALAP)');
  const [stageFlashMessage, setStageFlashMessage] = useState<string | null>(null);

  const state = useRef({
    canvasWidth: dims.width,
    canvasHeight: dims.height,
    groundY: dims.groundY,
    playerX: dims.playerX,
    playerY: dims.groundY - PLAYER_STAND_H,
    velocity: 0,
    isJumping: false,
    isDucking: false,
    score: 0,
    highScore: 0,
    speed: SPEED_STAGES[0].speed,
    currentStageIndex: 0,
    stageFlashTimer: 0,
    stageFlashText: '',
    distance: 0,
    obstacles: [] as Obstacle[],
    clouds: [] as Cloud[],
    horizonDots: [] as HorizonDot[],
    status: 'idle' as 'idle' | 'playing' | 'gameover',
    tick: 0,
    minSpawnDistance: 280,
  });

  state.current.highScore = highScore;

  // Képek inicializálása
  useEffect(() => {
    let loadedCount = 0;
    const checkLoaded = () => {
      loadedCount++;
      if (loadedCount >= 2) {
        setImagesLoaded(true);
      }
    };

    const img = new Image();
    img.src = '/mar-megint-player.png';
    img.onload = checkLoaded;
    img.onerror = checkLoaded;
    playerImgRef.current = img;

    const imgDuck = new Image();
    imgDuck.src = '/mar-megint-player-duck.png';
    imgDuck.onload = checkLoaded;
    imgDuck.onerror = checkLoaded;
    playerDuckImgRef.current = imgDuck;
  }, []);

  // Háttérelemek inicializálása
  const initScenery = useCallback((width?: number, groundY?: number) => {
    const w = width ?? state.current.canvasWidth;
    const g = groundY ?? state.current.groundY;
    state.current.clouds = [
      { x: w * 0.2, y: 40, w: 50 },
      { x: w * 0.55, y: 65, w: 42 },
      { x: w * 0.85, y: 35, w: 55 },
    ];
    state.current.horizonDots = [];
    for (let i = 0; i < 40; i++) {
      state.current.horizonDots.push({
        x: Math.random() * w,
        y: g + 2 + Math.random() * 32,
        size: Math.random() > 0.6 ? 2 : 1,
      });
    }
  }, []);

  // Játék indítása / újraindítása
  const startGame = useCallback(() => {
    sounds.jump();
    const s = state.current;
    initScenery(s.canvasWidth, s.groundY);
    s.playerY = s.groundY - PLAYER_STAND_H;
    s.velocity = 0;
    s.isJumping = false;
    s.isDucking = false;
    s.score = 0;
    s.speed = SPEED_STAGES[0].speed;
    s.currentStageIndex = 0;
    s.stageFlashTimer = 0;
    s.distance = 0;
    s.obstacles = [];
    s.status = 'playing';
    s.tick = 0;
    s.minSpawnDistance = isMobileRef.current ? 240 : 280;

    setCurrentScore(0);
    setCurrentStageName(SPEED_STAGES[0].name);
    setStageFlashMessage(null);
  }, [initScenery]);

  const triggerJump = useCallback(() => {
    const s = state.current;
    if (s.status === 'idle' || s.status === 'gameover') {
      startGame();
      return;
    }
    if (s.status === 'playing' && !s.isJumping) {
      s.velocity = JUMP_FORCE;
      s.isJumping = true;
      s.isDucking = false;
      sounds.jump();
    }
  }, [startGame]);

  const setDucking = useCallback((ducking: boolean) => {
    const s = state.current;
    if (s.status !== 'playing') return;
    s.isDucking = ducking;
    if (ducking && s.isJumping) {
      // Gyors leérkezés ugrás közben ha nyomja a lefelé gombot
      s.velocity = Math.max(s.velocity, 6.0);
    }
  }, []);

  // Natív nem-passzív érintés figyelő a vásznon (azonnali ugrás késleltetés és scroll nélkül)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onNativeTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      triggerJump();
    };

    canvas.addEventListener('touchstart', onNativeTouchStart, { passive: false });
    return () => {
      canvas.removeEventListener('touchstart', onNativeTouchStart);
    };
  }, [triggerJump]);

  // Billentyűzetkezelés
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        triggerJump();
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        setDucking(true);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        setDucking(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [triggerJump, setDucking]);

  // Játék főciklusa – Fix 144Hz lépésközzel, hogy 60Hz mobilon és 144Hz PC-n hajszálpontosan ugyanúgy haladjon!
  useEffect(() => {
    initScenery(state.current.canvasWidth, state.current.groundY);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updatePhysics = (s: typeof state.current, currentW: number, currentH: number) => {
      s.tick++;
      s.distance += s.speed;
      s.score = Math.floor(s.distance / 10);
      if (s.score > s.highScore) {
        s.highScore = s.score;
        setHighScore(s.score);
        try {
          localStorage.setItem('mm_dino_hi', String(s.score));
        } catch {}
      }
      setCurrentScore(s.score);

      // ── Sebességi szakaszok ellenőrzése ──
      let newStageIndex = 0;
      for (let i = SPEED_STAGES.length - 1; i >= 0; i--) {
        if (s.score >= SPEED_STAGES[i].minScore) {
          newStageIndex = i;
          break;
        }
      }

      if (newStageIndex !== s.currentStageIndex) {
        s.currentStageIndex = newStageIndex;
        s.speed = SPEED_STAGES[newStageIndex].speed;
        setCurrentStageName(SPEED_STAGES[newStageIndex].name);
        s.stageFlashTimer = 85;
        s.stageFlashText = `${SPEED_STAGES[newStageIndex].name} ELÉRVE!`;
        setStageFlashMessage(s.stageFlashText);
        sounds.speedUp();
      }

      if (s.stageFlashTimer > 0) {
        s.stageFlashTimer--;
        if (s.stageFlashTimer === 0) {
          setStageFlashMessage(null);
        }
      }

      // Gravitáció és ugrás
      s.velocity += GRAVITY;
      s.playerY += s.velocity;
      if (s.playerY >= s.groundY - currentH) {
        s.playerY = s.groundY - currentH;
        s.velocity = 0;
        s.isJumping = false;
      }

      // Akadályok generálása
      const rightmostX = s.obstacles.length > 0 ? Math.max(...s.obstacles.map((o) => o.x)) : 0;
      const currentMinDist = isMobileRef.current
        ? Math.max(160, 240 - s.currentStageIndex * 20)
        : Math.max(190, s.minSpawnDistance - s.currentStageIndex * 25);

      if (s.obstacles.length === 0 || rightmostX < s.canvasWidth - currentMinDist) {
        if (Math.random() < 0.045) {
          const roll = Math.random();
          let obsType: ObstacleType;
          let w = 20;
          let h = 14;

          if (roll < 0.38) {
            const isLarge = Math.random() > 0.55;
            obsType = isLarge ? 'stone_large' : 'stone_small';
            w = isLarge ? 30 : 20;
            h = isLarge ? 19 : 14;
          } else if (roll < 0.72) {
            const isDouble = Math.random() > 0.55;
            obsType = isDouble ? 'stick_double' : 'stick_single';
            w = isDouble ? 34 : 26;
            h = isDouble ? 18 : 13;
          } else {
            const isStanding = Math.random() > 0.45;
            obsType = isStanding ? 'scooter_standing' : 'scooter_lying';
            w = isStanding ? 28 : 38;
            h = isStanding ? 34 : 16;
          }

          s.obstacles.push({
            x: s.canvasWidth + 20,
            y: s.groundY - h,
            w,
            h,
            type: obsType,
          });
        }
      }

      // Mozgás
      s.obstacles.forEach((obs) => {
        obs.x -= s.speed;
      });
      s.obstacles = s.obstacles.filter((obs) => obs.x + obs.w > -50);

      s.clouds.forEach((cloud) => {
        cloud.x -= s.speed * 0.12;
        if (cloud.x + cloud.w < 0) {
          cloud.x = s.canvasWidth + Math.random() * 80;
          cloud.y = 25 + Math.random() * 45;
          cloud.w = 35 + Math.random() * 30;
        }
      });

      s.horizonDots.forEach((dot) => {
        dot.x -= s.speed;
        if (dot.x < 0) {
          dot.x = s.canvasWidth;
          dot.y = s.groundY + 2 + Math.random() * 32;
        }
      });

      // Ütközésvizsgálat
      const pLeft = s.playerX + 12;
      const pRight = s.playerX + currentW - 14;
      const pTop = s.playerY + 8;
      const pBottom = s.playerY + currentH - 5;

      for (const obs of s.obstacles) {
        const obsLeft = obs.x + 6;
        const obsRight = obs.x + obs.w - 6;
        const obsTop = obs.y + 5;
        const obsBottom = obs.y + obs.h - 1;

        if (pRight > obsLeft && pLeft < obsRight && pBottom > obsTop && pTop < obsBottom) {
          sounds.hit();
          s.status = 'gameover';
          if (s.score > s.highScore) {
            setHighScore(s.score);
            try {
              localStorage.setItem('mm_dino_hi', String(s.score));
            } catch {}
          }
          break;
        }
      }
    };

    let lastTime = performance.now();
    let accumulator = 0;
    const STEP = 1000 / 144; // ~6.944 ms

    const loop = (timestamp: number) => {
      const s = state.current;
      const now = timestamp || performance.now();
      let elapsed = now - lastTime;
      if (elapsed > 100) elapsed = 100;
      lastTime = now;

      // Háttér
      ctx.clearRect(0, 0, s.canvasWidth, s.canvasHeight);
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, s.canvasWidth, s.canvasHeight);

      // Felhők
      s.clouds.forEach((cloud) => {
        pFill(ctx, cloud.x, cloud.y, cloud.w, 7, '#262626');
        pFill(ctx, cloud.x + 8, cloud.y - 5, cloud.w - 16, 7, '#262626');
      });

      // Talajvonal
      ctx.fillStyle = '#404040';
      ctx.fillRect(0, s.groundY, s.canvasWidth, 2);

      // Talaj textúra pontjai
      s.horizonDots.forEach((dot) => {
        pFill(ctx, dot.x, dot.y, dot.size, 1, '#262626');
      });

      // ── IDLE ÁLLAPOT ──
      if (s.status === 'idle') {
        if (playerImgRef.current && playerImgRef.current.complete && playerImgRef.current.naturalWidth > 0) {
          ctx.drawImage(playerImgRef.current, s.playerX, s.playerY, PLAYER_STAND_W, PLAYER_STAND_H);
        } else {
          pFill(ctx, s.playerX, s.playerY, PLAYER_STAND_W, PLAYER_STAND_H, '#34d399');
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = isMobileRef.current ? 'bold 13px monospace' : 'bold 15px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(
          isMobileRef.current ? 'KOPPINTS AZ INDÍTÁSHOZ' : 'NYOMJ SZÓKÖZT VAGY KOPPINTS AZ INDÍTÁSHOZ',
          s.canvasWidth / 2,
          110
        );
        ctx.font = '11px monospace';
        ctx.fillStyle = '#737373';
        ctx.fillText(
          isMobileRef.current ? 'Gombok alul: Ugrás és Lehajolás' : 'SZÓKÖZ / ↑ / W = Ugrás   ·   ↓ / S = Lehajolás',
          s.canvasWidth / 2,
          135
        );

        frameRef.current = requestAnimationFrame(loop);
        return;
      }

      // ── JÁTÉK FOLYAMATBAN (Fix 144Hz fizika) ──
      if (s.status === 'playing') {
        accumulator += elapsed;
        const currentH = s.isDucking ? PLAYER_DUCK_H : PLAYER_STAND_H;
        const currentW = s.isDucking ? PLAYER_DUCK_W : PLAYER_STAND_W;

        while (accumulator >= STEP) {
          updatePhysics(s, currentW, currentH);
          accumulator -= STEP;
          if (s.status !== 'playing') break;
        }
      } else {
        accumulator = 0;
      }

      // ── AKADÁLYOK KIRAJZOLÁSA ──
      s.obstacles.forEach((obs) => {
        if (obs.type === 'stone_small' || obs.type === 'stone_large') {
          drawStone(ctx, obs.x, obs.y, obs.w, obs.h, obs.type === 'stone_large');
        } else if (obs.type === 'stick_single' || obs.type === 'stick_double') {
          drawStick(ctx, obs.x, obs.y, obs.w, obs.h, obs.type === 'stick_double');
        } else {
          drawScooter(ctx, obs.x, obs.y, obs.w, obs.h, obs.type === 'scooter_lying');
        }
      });

      // ── MÁR MEGINT PIXEL JÁTÉKOS KIRAJZOLÁSA ──
      const currentH = s.isDucking ? PLAYER_DUCK_H : PLAYER_STAND_H;
      const currentW = s.isDucking ? PLAYER_DUCK_W : PLAYER_STAND_W;

      if (s.isJumping) {
        const shadowW = Math.max(20, currentW - (s.groundY - s.playerY - currentH) * 0.4);
        pFill(ctx, s.playerX + (currentW - shadowW) / 2, s.groundY - 1, shadowW, 2, 'rgba(255,255,255,0.18)');
      }

      ctx.save();
      if (s.isJumping) {
        ctx.translate(s.playerX + currentW / 2, s.playerY + currentH / 2);
        const tilt = Math.max(-0.15, Math.min(0.15, s.velocity * 0.015));
        ctx.rotate(tilt);
        ctx.translate(-(s.playerX + currentW / 2), -(s.playerY + currentH / 2));
      }

      const activeImg = s.isDucking ? playerDuckImgRef.current : playerImgRef.current;
      if (activeImg && activeImg.complete && activeImg.naturalWidth > 0) {
        ctx.drawImage(activeImg, s.playerX, s.playerY, currentW, currentH);
      } else {
        pFill(ctx, s.playerX, s.playerY, currentW, currentH, s.status === 'gameover' ? '#ef4444' : '#ffffff');
      }
      ctx.restore();

      // ── PONTJELZŐ ÉS INFORMÁCIÓK ──
      ctx.textAlign = 'right';
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`REKORD ${String(s.highScore).padStart(5, '0')}`, s.canvasWidth - 110, 28);
      ctx.fillText(String(s.score).padStart(5, '0'), s.canvasWidth - 20, 28);

      // Sebességi szakasz jelző
      ctx.textAlign = 'left';
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = s.currentStageIndex === 3 ? '#fbbf24' : '#34d399';
      ctx.fillText(SPEED_STAGES[s.currentStageIndex].name, 20, 28);

      // Gyorsulás felvillanó értesítés
      if (s.stageFlashTimer > 0) {
        ctx.textAlign = 'center';
        ctx.font = 'bold 18px monospace';
        ctx.fillStyle = '#34d399';
        ctx.fillText(s.stageFlashText, s.canvasWidth / 2, 75);
      }

      // ── JÁTÉK VÉGE KÉPERNYŐ ──
      if (s.status === 'gameover') {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, s.canvasWidth, s.canvasHeight);

        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('J Á T É K   V É G E', s.canvasWidth / 2, 105);

        ctx.fillStyle = '#e5e5e5';
        ctx.font = '13px monospace';
        ctx.fillText(
          isMobileRef.current ? 'KOPPINTS AZ ÚJRAINDÍTÁSHOZ' : 'NYOMJ SZÓKÖZT VAGY KOPPINTS AZ ÚJRAINDÍTÁSHOZ',
          s.canvasWidth / 2,
          140
        );
      }

      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [initScenery]);

  return (
    <div className="flex flex-col items-center gap-2 sm:gap-3.5 w-full max-w-4xl px-1 sm:px-3 animate-in fade-in duration-300">
      {/* Vissza gomb - háttér nélkül, csak szöveg nyíllal */}
      <div className="w-full flex items-center justify-start">
        <button
          onClick={onBack}
          type="button"
          className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-mono text-neutral-400 hover:text-white transition-colors select-none py-1"
        >
          <span>← Vissza a választáshoz</span>
        </button>
      </div>

      {/* Játékvászon konténer – mobilon kitölti a szélességet, nagy felület */}
      <div
        onClick={triggerJump}
        className="w-full relative rounded-2xl overflow-hidden border border-white/15 bg-neutral-950 shadow-2xl cursor-pointer select-none touch-none"
        style={{ touchAction: 'none' }}
      >
        <canvas
          ref={canvasRef}
          width={dims.width}
          height={dims.height}
          className="w-full block touch-none"
          style={{ imageRendering: 'pixelated', maxHeight: 'none', objectFit: 'contain', touchAction: 'none' }}
        />
      </div>

      {/* Mobil érintéses vezérlőgombok (kényelmes, nagy gombok azonnali reagálással) */}
      <div className="flex sm:hidden w-full items-center justify-center gap-2.5 pt-0.5 touch-none">
        <button
          type="button"
          onTouchStart={(e) => {
            e.preventDefault();
            triggerJump();
          }}
          onClick={triggerJump}
          className="flex-1 py-3.5 bg-neutral-900 border border-white/20 rounded-xl text-sm font-bold font-mono text-white active:bg-neutral-800 touch-none select-none active:scale-[0.98] transition-transform"
          style={{ touchAction: 'manipulation' }}
        >
          UGRÁS ⤒
        </button>
        <button
          type="button"
          onTouchStart={(e) => {
            e.preventDefault();
            setDucking(true);
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            setDucking(false);
          }}
          className="flex-1 py-3.5 bg-neutral-900 border border-white/20 rounded-xl text-sm font-bold font-mono text-white active:bg-neutral-800 touch-none select-none active:scale-[0.98] transition-transform"
          style={{ touchAction: 'manipulation' }}
        >
          LEHAJOLÁS ⤓
        </button>
      </div>

      {/* Akadályok listája – kompakt vízszintes elrendezés helytakarékosan */}
      <div className="flex items-center justify-center gap-4 sm:gap-6 pt-0.5 select-none flex-wrap">
        <ObstacleLegendItem type="stone" label="Kő" />
        <ObstacleLegendItem type="stick" label="Bot" />
        <ObstacleLegendItem type="scooter" label="Roller" />
      </div>

      {/* Billentyűzet tippek lábléc */}
      <div className="text-neutral-500 text-[11px] font-mono text-center">
        Irányítás: <span className="text-neutral-300">SZÓKÖZ / ↑ / W</span> = Ugrás &bull;{' '}
        <span className="text-neutral-300">↓ / S</span> = Lehajolás
      </div>
    </div>
  );
};

export default DinoGame;
