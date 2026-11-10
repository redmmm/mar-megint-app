import React, { useRef, useEffect, useCallback, useState } from 'react';

interface DinoGame2PProps {
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

// ── 2-Játékos Konstansok ──
// Kicsit hosszabb és nagyobb vászon, hogy a 2 játékos kényelmesen elférjen
const DESKTOP_CANVAS_WIDTH = 920;
const DESKTOP_CANVAS_HEIGHT = 280;
const DESKTOP_GROUND_Y = 232;

const MOBILE_CANVAS_WIDTH = 640;
const MOBILE_CANVAS_HEIGHT = 310;
const MOBILE_GROUND_Y = 255;

const GRAVITY = 0.32;
const JUMP_FORCE = -8.8;

// Már Megint Player Méretek (ugyanaz, mint 1P)
const PLAYER_STAND_W = 56;
const PLAYER_STAND_H = 47;
const PLAYER_DUCK_W = 66;
const PLAYER_DUCK_H = 30;

// P1 az eredeti pozícióban (elöl), P2 kissé mögötte (hátul)
const P1_DEFAULT_X = 110;
const P2_DEFAULT_X = 35;

const getInitialDimensions = () => {
  if (typeof window !== 'undefined' && window.innerWidth < 640) {
    return {
      width: MOBILE_CANVAS_WIDTH,
      height: MOBILE_CANVAS_HEIGHT,
      groundY: MOBILE_GROUND_Y,
      p1X: 95,
      p2X: 25,
      isMobile: true,
    };
  }
  return {
    width: DESKTOP_CANVAS_WIDTH,
    height: DESKTOP_CANVAS_HEIGHT,
    groundY: DESKTOP_GROUND_Y,
    p1X: P1_DEFAULT_X,
    p2X: P2_DEFAULT_X,
    isMobile: false,
  };
};

// Sebességi szakaszok – HAJSZÁLPONTOSAN MEGEGYEZIK az 1 játékos móddal
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

interface PlayerEntity {
  x: number;
  baseX: number;
  y: number;
  velocity: number;
  isJumping: boolean;
  isDucking: boolean;
  isAlive: boolean;
  deathOffset: number;
  scoreAtDeath: number | null;
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

export const DinoGame2P: React.FC<DinoGame2PProps> = ({ onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);

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
      state.current.p1.baseX = next.p1X;
      state.current.p2.baseX = next.p2X;
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const playerImgRef = useRef<HTMLImageElement | null>(null);
  const playerDuckImgRef = useRef<HTMLImageElement | null>(null);
  const [, setImagesLoaded] = useState(false);

  const [highScore, setHighScore] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('mm_dino2p_hi');
      return saved ? parseInt(saved, 10) || 0 : 0;
    } catch {
      return 0;
    }
  });

  const [, setCurrentScore] = useState<number>(0);
  const [, setCurrentStageName] = useState<string>('1. SZAKASZ (ALAP)');
  const [stageFlashMessage, setStageFlashMessage] = useState<string | null>(null);

  // Két játékos külön állapota
  const state = useRef({
    canvasWidth: dims.width,
    canvasHeight: dims.height,
    groundY: dims.groundY,
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
    minSpawnDistance: 290,
    p1: {
      x: dims.p1X,
      baseX: dims.p1X,
      y: dims.groundY - PLAYER_STAND_H,
      velocity: 0,
      isJumping: false,
      isDucking: false,
      isAlive: true,
      deathOffset: 0,
      scoreAtDeath: null,
    } as PlayerEntity,
    p2: {
      x: dims.p2X,
      baseX: dims.p2X,
      y: dims.groundY - PLAYER_STAND_H,
      velocity: 0,
      isJumping: false,
      isDucking: false,
      isAlive: true,
      deathOffset: 0,
      scoreAtDeath: null,
    } as PlayerEntity,
  });

  state.current.highScore = highScore;

  // Képek betöltése
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

  const initScenery = useCallback((width?: number, groundY?: number) => {
    const w = width ?? state.current.canvasWidth;
    const g = groundY ?? state.current.groundY;
    state.current.clouds = [
      { x: w * 0.15, y: 38, w: 52 },
      { x: w * 0.5, y: 65, w: 45 },
      { x: w * 0.82, y: 35, w: 58 },
    ];
    state.current.horizonDots = [];
    for (let i = 0; i < 48; i++) {
      state.current.horizonDots.push({
        x: Math.random() * w,
        y: g + 2 + Math.random() * 32,
        size: Math.random() > 0.6 ? 2 : 1,
      });
    }
  }, []);

  // Játék indítása / újraindítása 2 játékossal
  const startGame = useCallback(() => {
    sounds.jump();
    const s = state.current;
    initScenery(s.canvasWidth, s.groundY);

    // P1 (elöl)
    s.p1.x = s.p1.baseX;
    s.p1.y = s.groundY - PLAYER_STAND_H;
    s.p1.velocity = 0;
    s.p1.isJumping = false;
    s.p1.isDucking = false;
    s.p1.isAlive = true;
    s.p1.deathOffset = 0;
    s.p1.scoreAtDeath = null;

    // P2 (hátul)
    s.p2.x = s.p2.baseX;
    s.p2.y = s.groundY - PLAYER_STAND_H;
    s.p2.velocity = 0;
    s.p2.isJumping = false;
    s.p2.isDucking = false;
    s.p2.isAlive = true;
    s.p2.deathOffset = 0;
    s.p2.scoreAtDeath = null;

    s.score = 0;
    s.speed = SPEED_STAGES[0].speed;
    s.currentStageIndex = 0;
    s.stageFlashTimer = 0;
    s.distance = 0;
    s.obstacles = [];
    s.status = 'playing';
    s.tick = 0;
    s.minSpawnDistance = isMobileRef.current ? 250 : 290;

    setCurrentScore(0);
    setCurrentStageName(SPEED_STAGES[0].name);
    setStageFlashMessage(null);
  }, [initScenery]);

  // ── Játékos 1 Ugrás & Lehajolás (W, S) ──
  const p1Jump = useCallback(() => {
    const s = state.current;
    if (s.status === 'idle' || s.status === 'gameover') {
      startGame();
      return;
    }
    if (s.status === 'playing' && s.p1.isAlive && !s.p1.isJumping) {
      s.p1.velocity = JUMP_FORCE;
      s.p1.isJumping = true;
      s.p1.isDucking = false;
      sounds.jump();
    }
  }, [startGame]);

  const p1Duck = useCallback((ducking: boolean) => {
    const s = state.current;
    if (s.status !== 'playing' || !s.p1.isAlive) return;
    s.p1.isDucking = ducking;
    if (ducking && s.p1.isJumping) {
      s.p1.velocity = Math.max(s.p1.velocity, 6.0);
    }
  }, []);

  // ── Játékos 2 Ugrás & Lehajolás (HJKU / Numpad 5123) ──
  const p2Jump = useCallback(() => {
    const s = state.current;
    if (s.status === 'idle' || s.status === 'gameover') {
      startGame();
      return;
    }
    if (s.status === 'playing' && s.p2.isAlive && !s.p2.isJumping) {
      s.p2.velocity = JUMP_FORCE;
      s.p2.isJumping = true;
      s.p2.isDucking = false;
      sounds.jump();
    }
  }, [startGame]);

  const p2Duck = useCallback((ducking: boolean) => {
    const s = state.current;
    if (s.status !== 'playing' || !s.p2.isAlive) return;
    s.p2.isDucking = ducking;
    if (ducking && s.p2.isJumping) {
      s.p2.velocity = Math.max(s.p2.velocity, 6.0);
    }
  }, []);

  // ── Billentyűzetfigyelő (P1 = WASD, P2 = HJKU & Numpad 5123) ──
  useEffect(() => {
    const activeKeys = new Set<string>();

    const onKeyDown = (e: KeyboardEvent) => {
      activeKeys.add(e.code);

      // Közös indító gombok idle/gameover állapotban
      if (state.current.status !== 'playing') {
        if (
          e.code === 'Space' ||
          e.code === 'Enter' ||
          e.code === 'KeyW' ||
          e.code === 'KeyU' ||
          e.code === 'ArrowUp'
        ) {
          e.preventDefault();
          startGame();
          return;
        }
      }

      // ── Player 1 Controls (W A S D) ──
      if (e.code === 'KeyW') {
        e.preventDefault();
        p1Jump();
      } else if (e.code === 'KeyS') {
        e.preventDefault();
        p1Duck(true);
      }

      // ── Player 2 Controls (H J K U  &  Nyilak: ArrowUp, ArrowDown) ──
      // Ugrás: U vagy Nyíl fel (ArrowUp)
      if (e.code === 'KeyU' || e.code === 'ArrowUp') {
        e.preventDefault();
        p2Jump();
      }
      // Lehajolás: J vagy Nyíl le (ArrowDown)
      else if (e.code === 'KeyJ' || e.code === 'ArrowDown') {
        e.preventDefault();
        p2Duck(true);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      activeKeys.delete(e.code);

      // P1 Lehajolás felengedése
      if (e.code === 'KeyS') {
        p1Duck(false);
      }

      // P2 Lehajolás felengedése
      if (e.code === 'KeyJ' || e.code === 'ArrowDown') {
        p2Duck(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [p1Jump, p1Duck, p2Jump, p2Duck, startGame]);

  // ── Játék Főciklusa Fix 144Hz fizikai lépésekkel ──
  useEffect(() => {
    initScenery(state.current.canvasWidth, state.current.groundY);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updatePhysics = (s: typeof state.current) => {
      s.tick++;

      // Legalább egy játékos él még -> távolság és pont nő!
      const atLeastOneAlive = s.p1.isAlive || s.p2.isAlive;
      if (atLeastOneAlive) {
        s.distance += s.speed;
        s.score = Math.floor(s.distance / 10);
        if (s.score > s.highScore) {
          s.highScore = s.score;
          setHighScore(s.score);
          try {
            localStorage.setItem('mm_dino2p_hi', String(s.score));
          } catch {}
        }
        setCurrentScore(s.score);

        // Sebességi szakaszok ellenőrzése
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
      }

      // ── P1 Fizika ──
      const p1H = s.p1.isDucking ? PLAYER_DUCK_H : PLAYER_STAND_H;
      if (s.p1.isAlive) {
        s.p1.velocity += GRAVITY;
        s.p1.y += s.p1.velocity;
        if (s.p1.y >= s.groundY - p1H) {
          s.p1.y = s.groundY - p1H;
          s.p1.velocity = 0;
          s.p1.isJumping = false;
        }
      } else {
        // Kiesett P1: lassan hátracsúszik és elhagyja a pályát
        s.p1.deathOffset += s.speed * 0.9;
        s.p1.y = Math.min(s.p1.y + 2, s.groundY - p1H);
      }

      // ── P2 Fizika ──
      const p2H = s.p2.isDucking ? PLAYER_DUCK_H : PLAYER_STAND_H;
      if (s.p2.isAlive) {
        s.p2.velocity += GRAVITY;
        s.p2.y += s.p2.velocity;
        if (s.p2.y >= s.groundY - p2H) {
          s.p2.y = s.groundY - p2H;
          s.p2.velocity = 0;
          s.p2.isJumping = false;
        }
      } else {
        // Kiesett P2: lassan hátracsúszik és elhagyja a pályát
        s.p2.deathOffset += s.speed * 0.9;
        s.p2.y = Math.min(s.p2.y + 2, s.groundY - p2H);
      }

      // ── Akadályok Spawolása ──
      const rightmostX = s.obstacles.length > 0 ? Math.max(...s.obstacles.map((o) => o.x)) : 0;
      const currentMinDist = isMobileRef.current
        ? Math.max(170, 250 - s.currentStageIndex * 20)
        : Math.max(200, s.minSpawnDistance - s.currentStageIndex * 25);

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

      // Akadályok és háttér mozgatása
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

      // ── Ütközésvizsgálat P1-re ──
      if (s.p1.isAlive) {
        const p1W = s.p1.isDucking ? PLAYER_DUCK_W : PLAYER_STAND_W;
        const p1Left = s.p1.x + 12;
        const p1Right = s.p1.x + p1W - 14;
        const p1Top = s.p1.y + 8;
        const p1Bottom = s.p1.y + p1H - 5;

        for (const obs of s.obstacles) {
          const obsLeft = obs.x + 6;
          const obsRight = obs.x + obs.w - 6;
          const obsTop = obs.y + 5;
          const obsBottom = obs.y + obs.h - 1;

          if (p1Right > obsLeft && p1Left < obsRight && p1Bottom > obsTop && p1Top < obsBottom) {
            sounds.hit();
            s.p1.isAlive = false;
            s.p1.scoreAtDeath = s.score;
            break;
          }
        }
      }

      // ── Ütközésvizsgálat P2-re ──
      if (s.p2.isAlive) {
        const p2W = s.p2.isDucking ? PLAYER_DUCK_W : PLAYER_STAND_W;
        const p2Left = s.p2.x + 12;
        const p2Right = s.p2.x + p2W - 14;
        const p2Top = s.p2.y + 8;
        const p2Bottom = s.p2.y + p2H - 5;

        for (const obs of s.obstacles) {
          const obsLeft = obs.x + 6;
          const obsRight = obs.x + obs.w - 6;
          const obsTop = obs.y + 5;
          const obsBottom = obs.y + obs.h - 1;

          if (p2Right > obsLeft && p2Left < obsRight && p2Bottom > obsTop && p2Top < obsBottom) {
            sounds.hit();
            s.p2.isAlive = false;
            s.p2.scoreAtDeath = s.score;
            break;
          }
        }
      }

      // Ha mindkét játékos kiesett -> Játék Vége!
      if (!s.p1.isAlive && !s.p2.isAlive) {
        s.status = 'gameover';
        if (s.score > s.highScore) {
          setHighScore(s.score);
          try {
            localStorage.setItem('mm_dino2p_hi', String(s.score));
          } catch {}
        }
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

      // Háttér rajzolás
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

      // Talaj textúra
      s.horizonDots.forEach((dot) => {
        pFill(ctx, dot.x, dot.y, dot.size, 1, '#262626');
      });

      // ── IDLE ÁLLAPOT ──
      if (s.status === 'idle') {
        const img = playerImgRef.current;
        // P2 rajzolása hátul
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, s.p2.x, s.p2.y, PLAYER_STAND_W, PLAYER_STAND_H);
          ctx.drawImage(img, s.p1.x, s.p1.y, PLAYER_STAND_W, PLAYER_STAND_H);
        } else {
          pFill(ctx, s.p2.x, s.p2.y, PLAYER_STAND_W, PLAYER_STAND_H, '#38bdf8');
          pFill(ctx, s.p1.x, s.p1.y, PLAYER_STAND_W, PLAYER_STAND_H, '#34d399');
        }

        // P1 & P2 címke a fejük felett
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText('P2 (HÁTUL)', s.p2.x + PLAYER_STAND_W / 2, s.p2.y - 8);
        ctx.fillStyle = '#34d399';
        ctx.fillText('P1 (ELÖL)', s.p1.x + PLAYER_STAND_W / 2, s.p1.y - 8);

        ctx.fillStyle = '#ffffff';
        ctx.font = isMobileRef.current ? 'bold 13px monospace' : 'bold 15px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(
          'NYOMJ SZÓKÖZT VAGY KOPPINTS AZ INDÍTÁSHOZ',
          s.canvasWidth / 2,
          110
        );

        ctx.font = '11px monospace';
        ctx.fillStyle = '#a3a3a3';
        ctx.fillText(
          '1. Játékos: W (ugrás) / S (lehajolás)   ·   2. Játékos: U / ↑ (ugrás) / J / ↓ (lehajolás)',
          s.canvasWidth / 2,
          135
        );
        ctx.fillStyle = '#737373';
        ctx.fillText(
          'Ha az egyik kiesik, a másik tovább küzdhet!',
          s.canvasWidth / 2,
          155
        );

        frameRef.current = requestAnimationFrame(loop);
        return;
      }

      // ── FOLYAMATBAN LÉVŐ JÁTÉK ──
      if (s.status === 'playing') {
        accumulator += elapsed;
        while (accumulator >= STEP) {
          updatePhysics(s);
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

      // Segédfüggvény játékos rajzolásához
      const renderPlayer = (
        p: PlayerEntity,
        label: string,
        labelColor: string,
        isP1: boolean
      ) => {
        const currentH = p.isDucking ? PLAYER_DUCK_H : PLAYER_STAND_H;
        const currentW = p.isDucking ? PLAYER_DUCK_W : PLAYER_STAND_W;
        const renderX = p.x - p.deathOffset;

        // Ha teljesen elhagyta a képernyőt balra
        if (renderX + currentW < -50) return;

        ctx.save();
        if (!p.isAlive) {
          ctx.globalAlpha = 0.45;
        }

        // Árnyék ugráskor
        if (p.isJumping && p.isAlive) {
          const shadowW = Math.max(20, currentW - (s.groundY - p.y - currentH) * 0.4);
          pFill(
            ctx,
            renderX + (currentW - shadowW) / 2,
            s.groundY - 1,
            shadowW,
            2,
            'rgba(255,255,255,0.18)'
          );
        }

        // Dőlés ugráskor
        if (p.isJumping && p.isAlive) {
          ctx.translate(renderX + currentW / 2, p.y + currentH / 2);
          const tilt = Math.max(-0.15, Math.min(0.15, p.velocity * 0.015));
          ctx.rotate(tilt);
          ctx.translate(-(renderX + currentW / 2), -(p.y + currentH / 2));
        }

        const activeImg = p.isDucking ? playerDuckImgRef.current : playerImgRef.current;
        if (activeImg && activeImg.complete && activeImg.naturalWidth > 0) {
          ctx.drawImage(activeImg, renderX, p.y, currentW, currentH);
        } else {
          pFill(ctx, renderX, p.y, currentW, currentH, p.isAlive ? labelColor : '#ef4444');
        }

        // Címke az élő játékos felett
        if (p.isAlive) {
          ctx.font = 'bold 9px monospace';
          ctx.textAlign = 'center';
          ctx.fillStyle = labelColor;
          ctx.fillText(label, renderX + currentW / 2, p.y - 6);
        } else {
          ctx.font = 'bold 9px monospace';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#ef4444';
          ctx.fillText('KO', renderX + currentW / 2, p.y - 6);
        }

        ctx.restore();
      };

      // P2 (hátul) rajzolása először, majd P1 (elöl) rajzolása
      renderPlayer(s.p2, 'P2', '#38bdf8', false);
      renderPlayer(s.p1, 'P1', '#34d399', true);

      // ── PONTJELZŐK ÉS STATISZTIKA ──
      ctx.textAlign = 'right';
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`REKORD ${String(s.highScore).padStart(5, '0')}`, s.canvasWidth - 110, 28);
      ctx.fillText(String(s.score).padStart(5, '0'), s.canvasWidth - 20, 28);

      // Sebességi szakasz
      ctx.textAlign = 'left';
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = s.currentStageIndex === 3 ? '#fbbf24' : '#34d399';
      ctx.fillText(SPEED_STAGES[s.currentStageIndex].name, 20, 28);

      // Játékosok élő állapota
      ctx.font = '10px monospace';
      ctx.fillStyle = s.p1.isAlive ? '#34d399' : '#737373';
      ctx.fillText(`P1: ${s.p1.isAlive ? 'ÉLŐ' : 'KIESETT'}`, 20, 46);

      ctx.fillStyle = s.p2.isAlive ? '#38bdf8' : '#737373';
      ctx.fillText(`P2: ${s.p2.isAlive ? 'ÉLŐ' : 'KIESETT'}`, 80, 46);

      // Gyorsulás felvillanás
      if (s.stageFlashTimer > 0) {
        ctx.textAlign = 'center';
        ctx.font = 'bold 18px monospace';
        ctx.fillStyle = '#34d399';
        ctx.fillText(s.stageFlashText, s.canvasWidth / 2, 75);
      }

      // ── JÁTÉK VÉGE KÉPERNYŐ (mindketten kiestek) ──
      if (s.status === 'gameover') {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, s.canvasWidth, s.canvasHeight);

        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('M I N D K É T   J Á T É K O S   K I E S E T T', s.canvasWidth / 2, 95);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px monospace';
        const p1ScoreText = s.p1.scoreAtDeath !== null ? `${s.p1.scoreAtDeath} m` : `${s.score} m`;
        const p2ScoreText = s.p2.scoreAtDeath !== null ? `${s.p2.scoreAtDeath} m` : `${s.score} m`;
        ctx.fillText(
          `P1 rekord: ${p1ScoreText}   |   P2 rekord: ${p2ScoreText}`,
          s.canvasWidth / 2,
          125
        );

        ctx.fillStyle = '#e5e5e5';
        ctx.font = '12px monospace';
        ctx.fillText(
          'NYOMJ SZÓKÖZT VAGY KOPPINTS AZ ÚJRAINDÍTÁSHOZ',
          s.canvasWidth / 2,
          155
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
    <div className="flex flex-col items-center justify-between w-full max-w-5xl px-1 sm:px-3 min-h-[calc(100dvh-5.5rem)] sm:min-h-0 landscape:min-h-0 animate-in fade-in duration-300 gap-2 sm:gap-3.5 landscape:gap-1.5">
      {/* Vissza gomb és indikátorok */}
      <div className="w-full flex items-center justify-between">
        <button
          onClick={onBack}
          type="button"
          className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-mono text-neutral-400 hover:text-white transition-colors select-none py-1"
        >
          <span>← Vissza a választáshoz</span>
        </button>
        <div className="text-[11px] font-mono text-neutral-400 flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            P1: WASD
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            P2: HJKU / Nyilak
          </span>
        </div>
      </div>

      {/* Játékvászon konténer */}
      <div
        onClick={() => {
          if (state.current.status !== 'playing') {
            startGame();
          }
        }}
        className="w-full relative rounded-2xl overflow-hidden border border-white/15 bg-neutral-950 shadow-2xl select-none touch-none flex items-center justify-center"
        style={{ touchAction: 'none' }}
      >
        <canvas
          ref={canvasRef}
          width={dims.width}
          height={dims.height}
          className="w-full block touch-none max-h-[44vh] landscape:max-h-[58vh] sm:max-h-none object-contain"
          style={{ imageRendering: 'pixelated', touchAction: 'none' }}
        />
      </div>

      {/* Mobil vezérlők – Lent elhelyezve, nagy fel/le nyilakkal */}
      <div className="flex sm:hidden w-full items-stretch justify-between gap-2.5 pt-2 pb-1 mt-auto landscape:mt-0 landscape:pt-1 landscape:pb-0 touch-none">
        {/* P1 Gombok (Zöld / Emerald) */}
        <div className="flex-1 flex gap-2">
          <button
            type="button"
            onTouchStart={(e) => {
              e.preventDefault();
              p1Jump();
            }}
            onClick={p1Jump}
            className="flex-1 min-h-[72px] landscape:min-h-[44px] py-3.5 landscape:py-1 bg-emerald-950/85 border-2 border-emerald-500/40 active:border-emerald-400 active:bg-emerald-900 rounded-2xl flex flex-col items-center justify-center gap-0.5 shadow-lg active:scale-95 transition-all touch-none select-none cursor-pointer"
            aria-label="P1 Ugrás"
          >
            <span className="text-3xl landscape:text-xl font-black text-emerald-300 leading-none">▲</span>
            <span className="text-[11px] landscape:text-[8px] font-mono font-bold tracking-wider text-emerald-200 uppercase">P1 Ugrás</span>
          </button>
          <button
            type="button"
            onTouchStart={(e) => {
              e.preventDefault();
              p1Duck(true);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              p1Duck(false);
            }}
            className="flex-1 min-h-[72px] landscape:min-h-[44px] py-3.5 landscape:py-1 bg-emerald-950/85 border-2 border-emerald-500/40 active:border-emerald-400 active:bg-emerald-900 rounded-2xl flex flex-col items-center justify-center gap-0.5 shadow-lg active:scale-95 transition-all touch-none select-none cursor-pointer"
            aria-label="P1 Lehajolás"
          >
            <span className="text-3xl landscape:text-xl font-black text-emerald-300 leading-none">▼</span>
            <span className="text-[11px] landscape:text-[8px] font-mono font-bold tracking-wider text-emerald-200 uppercase">P1 Le</span>
          </button>
        </div>

        {/* P2 Gombok (Kék / Sky) */}
        <div className="flex-1 flex gap-2">
          <button
            type="button"
            onTouchStart={(e) => {
              e.preventDefault();
              p2Jump();
            }}
            onClick={p2Jump}
            className="flex-1 min-h-[72px] landscape:min-h-[44px] py-3.5 landscape:py-1 bg-sky-950/85 border-2 border-sky-500/40 active:border-sky-400 active:bg-sky-900 rounded-2xl flex flex-col items-center justify-center gap-0.5 shadow-lg active:scale-95 transition-all touch-none select-none cursor-pointer"
            aria-label="P2 Ugrás"
          >
            <span className="text-3xl landscape:text-xl font-black text-sky-300 leading-none">▲</span>
            <span className="text-[11px] landscape:text-[8px] font-mono font-bold tracking-wider text-sky-200 uppercase">P2 Ugrás</span>
          </button>
          <button
            type="button"
            onTouchStart={(e) => {
              e.preventDefault();
              p2Duck(true);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              p2Duck(false);
            }}
            className="flex-1 min-h-[72px] landscape:min-h-[44px] py-3.5 landscape:py-1 bg-sky-950/85 border-2 border-sky-500/40 active:border-sky-400 active:bg-sky-900 rounded-2xl flex flex-col items-center justify-center gap-0.5 shadow-lg active:scale-95 transition-all touch-none select-none cursor-pointer"
            aria-label="P2 Lehajolás"
          >
            <span className="text-3xl landscape:text-xl font-black text-sky-300 leading-none">▼</span>
            <span className="text-[11px] landscape:text-[8px] font-mono font-bold tracking-wider text-sky-200 uppercase">P2 Le</span>
          </button>
        </div>
      </div>

      {/* Lábléc útmutató */}
      <div className="text-neutral-400 text-[11px] font-mono text-center flex flex-wrap justify-center gap-x-4 gap-y-1 landscape:hidden">
        <span>
          <strong className="text-emerald-400">1. Játékos (Elöl):</strong> W = Ugrás, S = Lehajolás
        </span>
        <span>
          <strong className="text-sky-400">2. Játékos (Hátul):</strong> U / ↑ = Ugrás, J / ↓ = Lehajolás
        </span>
      </div>
    </div>
  );
};

export default DinoGame2P;
