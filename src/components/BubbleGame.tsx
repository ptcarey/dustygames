import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildLevel, chainScore, findColorCluster, findFloaters,
  pickShooterColor, snapToGrid,
} from "@/game/engine";
import { neighborsOf, type GridState } from "@/game/engine";
import { COLOR_HSL } from "@/game/types";
import type { Bubble, BubbleColor, LevelConfig } from "@/game/types";
import { Sfx, setSoundEnabled, isSoundEnabled, unlockAudio, startMusic, stopMusic } from "@/game/sound";
import { Dusty } from "./Dusty";
import { PossumFace, BubbleSvg } from "./BubbleSvg";
import { Button } from "./ui/button";
import possumDanceImg from "@/assets/possum-dance.png";
import { getCharacterById, getCompanionForLevel, getSupportersForLevel } from "@/characters/characters";
import { setActiveCharacterId, setStars, addPossumsRescued, setBestShots, useHint, getHintsRemaining, isColorblindMode, setAudioEnabled } from "@/game/storage";
import { getProjectileBehaviorForAbilities, type ProjectileBehavior } from "@/abilities";
import { FarewellScreen } from "./FarewellScreen";
import { PhotoAlbum } from "./PhotoAlbum";
import type { Character } from "@/game/types";
import { stageForLevel } from "@/game/stages";
import { CB_PATTERNS } from "@/game/colorblind";
import { checkAchievements, type Achievement } from "@/game/achievements";

interface Props {
  level: LevelConfig;
  audioEnabled: boolean;
  onWin: (score: number) => void;
  onLose: () => void;
  onNext: () => void;
  onExit: () => void;
  onMenu: () => void;
  onFarewell?: (character: Character) => void;
  practiceMode?: boolean;
}

interface SavedPossum { id: number; x: number; y: number; born: number; }
interface Particle { x: number; y: number; vx: number; vy: number; color: BubbleColor; born: number; life: number; size: number; }

const SHOOT_SPEED = 900; // px/sec

export function BubbleGame({ level, audioEnabled, onWin, onLose, onNext, onExit, onMenu, onFarewell, practiceMode = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<{
    grid: GridState | null;
    canvasW: number;
    canvasH: number;
    dpr: number;
    shooterX: number;
    shooterY: number;
    currentColor: BubbleColor;
    nextColor: BubbleColor;
    projectile: {
      x: number; y: number; vx: number; vy: number; color: BubbleColor;
      // Optional zig-zag flight (Will's Zigzag Zapper ability).
      zigzag?: {
        behavior: Extract<ProjectileBehavior, { kind: "zigzag-explode" }>;
        startY: number;
        rowsTravelled: number;
        nextRowY: number;        // y at which to flip horizontal direction
        dir: 1 | -1;             // current horizontal direction
        poppedIds: Set<number>;  // bubbles already popped along the path
        baseSpeed: number;
        aimFromVertical: number; // player's aim angle (0 = straight up, neg = left)
        wobble: number;          // zigzag amplitude added/subtracted from aim
      };
      // Optional love-bomb flight (Bella's Love Bomb ability) — straight
      // line along the player's aim, heart-rendered, explodes on first
      // contact with any bubble or the ceiling regardless of color.
      loveBomb?: {
        behavior: Extract<ProjectileBehavior, { kind: "love-bomb" }>;
      };
    } | null;
    aiming: boolean;
    aimAngle: number;
    popping: Array<Bubble & { popStart: number }>;
    falling: Array<Bubble & { vy: number; landed?: boolean; landedAt?: number }>;
    savedPossums: SavedPossum[];
    particles: Particle[];
    lastTs: number;
    rafId: number;
    scrollY: number;       // current rendered offset (animated)
    targetScrollY: number; // computed each step
    entranceT: number;     // 0..1 grid entrance animation progress (1 = done)
    trailParticles: Array<{ x: number; y: number; born: number; color: BubbleColor; size: number }>;
}>({
    grid: null,
    canvasW: 0, canvasH: 0, dpr: 1,
    shooterX: 0, shooterY: 0,
    currentColor: "red", nextColor: "blue",
    projectile: null,
    aiming: false, aimAngle: -Math.PI / 2,
    popping: [], falling: [], savedPossums: [], particles: [],
    lastTs: 0, rafId: 0,
    scrollY: 0, targetScrollY: 0,
    entranceT: 0, trailParticles: [],
  });

  const [shotsLeft, setShotsLeft] = useState(level.shots);
  const [score, setScore] = useState(0);
  const [possumsLeft, setPossumsLeft] = useState(0);
  const [dustyMood, setDustyMood] = useState<"idle" | "happy" | "wag">("wag");
  const [overlay, setOverlay] = useState<"win" | "lose" | null>(null);
  const [ballColor, setBallColor] = useState<BubbleColor>("red");
  const [nextBallColor, setNextBallColor] = useState<BubbleColor>("blue");
  const [comboText, setComboText] = useState<{ text: string; key: number } | null>(null);
  const [earnedStars, setEarnedStars] = useState(0);
  const [achievementToast, setAchievementToast] = useState<Achievement | null>(null);
  const [colorblind] = useState(() => isColorblindMode());
  const [hintsLeft, setHintsLeft] = useState(() => getHintsRemaining());
  const [showHint, setShowHint] = useState(false);
  const showHintRef = useRef(false);
  const hintClusterRef = useRef<Bubble[]>([]);
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());
  const totalShotsRef = useRef(0);
  const totalPopsRef = useRef(0);
  const maxComboRef = useRef(0);
  const missCountRef = useRef(0);
  const possumsRescuedRef = useRef(0);

  // The active companion (if any) is fully data-driven — derived from the
  // character config's `availability.levels` range. A null companion means
  // Dusty plays this level alone.
  const companion = useMemo(() => getCompanionForLevel(level.id), [level.id]);
  const companionOnThisLevel = companion !== null;
  const supporters = useMemo(() => getSupportersForLevel(level.id), [level.id]);
  const companionUnlockThreshold = companion?.availability?.initialUnlock.count ?? 0;
  const companionReactivateThreshold = companion?.availability?.reactivation.count ?? 0;
  const [popOrDropCount, setPopOrDropCount] = useState(0);
  // Cooldown baseline: when the companion fires, we record the current pop
  // count. The companion reactivates once `popOrDropCount` has grown by
  // `companionReactivateThreshold` beyond that baseline. Null = companion
  // has not yet been used this level (initial unlock uses
  // `companionUnlockThreshold`).
  const [companionCooldownBaseline, setCompanionCooldownBaseline] = useState<number | null>(null);
  const [activeThrowerId, setActiveThrowerIdState] = useState<string>(() => {
    // Reset to Dusty whenever the player enters a level — the companion
    // must be re-unlocked each level.
    setActiveCharacterId("dusty");
    return "dusty";
  });
  const companionAvailable =
    companionOnThisLevel &&
    (companionCooldownBaseline === null
      ? popOrDropCount >= companionUnlockThreshold
      : popOrDropCount - companionCooldownBaseline >= companionReactivateThreshold);
  const companionId = companion?.id ?? "dusty";
  const waitingCharacterId = activeThrowerId === "dusty" ? companionId : "dusty";
  const activeCharacter = getCharacterById(activeThrowerId);
  const projectileBehavior = useMemo(
    () => getProjectileBehaviorForAbilities(activeCharacter.abilityIds),
    [activeCharacter],
  );

  const swapThrower = useCallback(() => {
    // Allow swapping in either direction while the companion is available.
    // Swapping back to Dusty is always allowed, even after the companion
    // is used, so the player isn't trapped on the companion sprite.
    if (!companionOnThisLevel) return;
    const s = stateRef.current;
    if (s.projectile) return; // can't swap mid-shot
    const nextId = activeThrowerId === "dusty" ? companionId : "dusty";
    if (nextId === companionId && !companionAvailable) return;
    setActiveCharacterId(nextId);
    setActiveThrowerIdState(nextId);
    Sfx.click();
  }, [activeThrowerId, companionAvailable, companionOnThisLevel, companionId]);

  const onWinRef = useRef(onWin);
  const onLoseRef = useRef(onLose);
  const onFarewellRef = useRef(onFarewell);
  useEffect(() => {
    onWinRef.current = onWin;
    onLoseRef.current = onLose;
    onFarewellRef.current = onFarewell;
  });

  useEffect(() => { setSoundEnabled(audioEnabled); }, [audioEnabled]);

  const initLevel = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = container.getBoundingClientRect();
    const w = Math.floor(rect.width);
    const h = Math.floor(rect.height);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";

    const grid = buildLevel(level, w);
    const s = stateRef.current;
    s.grid = grid;
    s.canvasW = w; s.canvasH = h; s.dpr = dpr;
    s.shooterX = w / 2;
    s.shooterY = h - 60;
    s.currentColor = pickShooterColor(grid, level);
    s.nextColor = pickShooterColor(grid, level);
    setBallColor(s.currentColor);
    setNextBallColor(s.nextColor);
    s.projectile = null;
    s.popping = []; s.falling = []; s.savedPossums = []; s.particles = [];
    s.scrollY = 0; s.targetScrollY = 0;
    s.entranceT = 0; s.trailParticles = [];

    setShotsLeft(level.shots);
    setScore(0);
    setPossumsLeft(grid.bubbles.filter(b => b.hasPossum).length);
    setOverlay(null);
    setComboText(null);
    setEarnedStars(0);
    totalShotsRef.current = level.shots;
    totalPopsRef.current = 0;
    maxComboRef.current = 0;
    missCountRef.current = 0;
    possumsRescuedRef.current = 0;
    shotCounterRef.current = 0;
    setPopOrDropCount(0);
    setCompanionCooldownBaseline(null);
    setActiveCharacterId("dusty");
    setActiveThrowerIdState("dusty");

    const stage = stageForLevel(level.id);
    const stageIdx = stage ? Math.floor((level.id - 1) / 10) : 0;
    startMusic(stageIdx);
    needsRedrawRef.current = true;
  }, [level]);

  useEffect(() => {
    initLevel();
    const onResize = () => initLevel();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [initLevel]);

  const needsRedrawRef = useRef(true);
  const markDirty = () => { needsRedrawRef.current = true; };

  useEffect(() => {
    const ctxState = stateRef.current;
    let last = performance.now();
    let idleFrames = 0;

    const tick = (ts: number) => {
      const dt = Math.min(0.05, (ts - last) / 1000);
      last = ts;

      const s = ctxState;
      const isActive = !!s.projectile || s.popping.length > 0 ||
        s.falling.length > 0 || s.particles.length > 0 ||
        s.savedPossums.length > 0 || s.trailParticles.length > 0 ||
        s.entranceT < 1 || s.aiming || showHintRef.current ||
        Math.abs(s.targetScrollY - s.scrollY) > 0.5;

      if (isActive || needsRedrawRef.current) {
        step(dt);
        draw();
        needsRedrawRef.current = false;
        idleFrames = 0;
      } else {
        idleFrames++;
        if (idleFrames % 15 === 0) draw();
      }

      ctxState.rafId = requestAnimationFrame(tick);
    };
    ctxState.rafId = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(ctxState.rafId); stopMusic(); };
  }, []);

  const step = (dt: number) => {
    const s = stateRef.current;
    const grid = s.grid;
    if (!grid) return;

    // Grid entrance cascade animation
    if (s.entranceT < 1) {
      s.entranceT = Math.min(1, s.entranceT + dt * 1.8);
    }

    // Trail particles behind projectile
    if (s.projectile) {
      s.trailParticles.push({
        x: s.projectile.x + (Math.random() - 0.5) * 4,
        y: s.projectile.y + (Math.random() - 0.5) * 4,
        born: performance.now(),
        color: s.projectile.color,
        size: 2 + Math.random() * 2,
      });
    }
    const trailNow = performance.now();
    s.trailParticles = s.trailParticles.filter(p => trailNow - p.born < 300);

    // Visible window is capped at 15 rows. If the stack is taller than that,
    // anchor the BOTTOM of the stack to the bottom of the visible window so
    // the player sees the deepest 15 rows. As bubbles clear and the stack
    // shrinks below 15 rows, switch to anchoring the TOP under the header so
    // short levels never have a floating gap above row 0.
    const VISIBLE_ROWS = 15;
    let minRow = Infinity, maxRow = -Infinity;
    for (const b of grid.bubbles) {
      if (b.row < minRow) minRow = b.row;
      if (b.row > maxRow) maxRow = b.row;
    }
    if (!isFinite(minRow)) { minRow = 0; maxRow = 0; }
    const stackHeight = maxRow - minRow + 1;
    if (stackHeight > VISIBLE_ROWS) {
      // Show the bottom VISIBLE_ROWS rows of the stack.
      s.targetScrollY = (VISIBLE_ROWS - 1 - maxRow) * grid.rowHeight;
    } else {
      // Whole stack fits — pin its top row under the header.
      s.targetScrollY = -minRow * grid.rowHeight;
    }
    const diff = s.targetScrollY - s.scrollY;
    s.scrollY += diff * Math.min(1, dt * 3);

    if (s.projectile) {
      const p = s.projectile;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const wallL = grid.radius + 1;
      const wallR = s.canvasW - grid.radius - 1;
      if (p.x < wallL) {
        p.x = wallL + (wallL - p.x); p.vx = Math.abs(p.vx);
        if (p.zigzag) p.zigzag.dir = (p.zigzag.dir === 1 ? -1 : 1);
      }
      if (p.x > wallR) {
        p.x = wallR - (p.x - wallR); p.vx = -Math.abs(p.vx);
        if (p.zigzag) p.zigzag.dir = (p.zigzag.dir === 1 ? -1 : 1);
      }

      if (p.zigzag) {
        // Will's Zigzag Zapper: pop bubbles touched along the way; flip
        // horizontal direction every row; explode after rowsBeforeExplode.
        const z = p.zigzag;
        // Pop any bubble we directly contact along the path.
        for (const b of grid.bubbles) {
          if (z.poppedIds.has(b.id)) continue;
          const dx = b.x - p.x, dy = (b.y + s.scrollY) - p.y;
          if (dx * dx + dy * dy < (grid.diameter * 0.92) ** 2) {
            z.poppedIds.add(b.id);
          }
        }
        // When projectile crosses the next row threshold, flip direction
        // and increment row counter.
        if (p.y <= z.nextRowY) {
          z.rowsTravelled += 1;
          z.dir = (z.dir === 1 ? -1 : 1);
          z.nextRowY -= grid.rowHeight;
          // Re-aim around the player's aimed line, flipping wobble side.
          const speed = z.baseSpeed;
          const ang = z.aimFromVertical + z.wobble * z.dir;
          p.vx = Math.sin(ang) * speed;
          p.vy = -Math.cos(ang) * speed;
        }
        // Will's bubble always travels all the way to the ceiling. The
        // ability's `rowsBeforeExplode` value governs how far the terminal
        // explosion reaches (see `detonateZigzag`), not the flight length.
        const reachedTop = p.y <= grid.radius + 8;
        if (reachedTop) {
          p.y = grid.radius + 8;
          detonateZigzag(p, z);
          s.projectile = null;
        }
      } else {
        let hit = false;
        if (p.y <= grid.radius + 8) hit = true;
        for (const b of grid.bubbles) {
          const dx = b.x - p.x, dy = (b.y + s.scrollY) - p.y;
          if (dx * dx + dy * dy < (grid.diameter * 0.92) ** 2) { hit = true; break; }
        }
        if (hit) {
          if (p.loveBomb) {
            detonateLoveBomb(p, p.loveBomb.behavior);
          } else {
            landProjectile(p);
          }
          s.projectile = null;
        }
      }
    }

    const now = performance.now();
    s.popping = s.popping.filter(b => now - b.popStart < 400);

    const dustyTopY = s.canvasH - 80; // approximate top of Dusty's body (smaller)
    for (const f of s.falling) {
      if (f.landed) continue;
      f.vy += 1400 * dt;
      f.y += f.vy * dt;
      // Possums land softly on Dusty; non-possums keep falling off-screen
      if (f.hasPossum && f.y >= dustyTopY) {
        f.y = dustyTopY;
        f.landed = true;
        f.landedAt = now;
        Sfx.squeak();
        flashHappy();
        setPossumsLeft(p => Math.max(0, p - 1));
        // A possum landing may complete the level even if no further shot is fired.
        // Re-run end-check on the next tick so falling rescues count toward winning.
        setTimeout(() => checkEnd(shotsLeftRef.current), 50);
      }
    }
    s.falling = s.falling.filter(f => {
      if (f.landed) {
        // Linger briefly on Dusty, then disappear
        return now - (f.landedAt ?? now) < 900;
      }
      if (f.y > s.canvasH + 40) return false;
      return true;
    });
    s.savedPossums = s.savedPossums.filter(sp => now - sp.born < 1400);

    // Explosion particles
    for (const p of s.particles) {
      p.vy += 600 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    s.particles = s.particles.filter(p => now - p.born < p.life);
  };

  const flashHappy = () => {
    setDustyMood("happy");
    setTimeout(() => setDustyMood("wag"), 600);
  };

  const landProjectile = (p: { x: number; y: number; color: BubbleColor }) => {
    const s = stateRef.current;
    const grid = s.grid!;

    // Convert visible y back to logical (grid) y by removing scroll offset
    let { row, col } = snapToGrid(grid, p.x, p.y - s.scrollY);
    const occupied = new Set(grid.bubbles.map(b => `${b.row},${b.col}`));
    if (occupied.has(`${row},${col}`)) {
      const hexNbrs = neighborsOf(row, col);
      let best: [number, number] | null = null;
      let bestDist = Infinity;
      for (const [r, c] of hexNbrs) {
        if (r < 0 || c < 0 || c >= grid.cols - (r % 2 === 1 ? 1 : 0)) continue;
        if (occupied.has(`${r},${c}`)) continue;
        const bx = grid.colX(r, c), by = grid.rowY(r);
        const d = (bx - p.x) ** 2 + (by - (p.y - s.scrollY)) ** 2;
        if (d < bestDist) { bestDist = d; best = [r, c]; }
      }
      if (best) { row = best[0]; col = best[1]; }
    }
    row = Math.max(0, row);
    col = Math.max(0, Math.min(grid.cols - (row % 2 === 1 ? 2 : 1), col));

    // Power-up: "rainbow" color matches the best adjacent color
    let landColor = p.color;
    if (landColor === ("rainbow" as BubbleColor)) {
      const nbrs = neighborsOf(row, col);
      const nbrBubbles = nbrs
        .map(([r, c]) => grid.bubbles.find(b => b.row === r && b.col === c))
        .filter(Boolean) as Bubble[];
      const colorCounts = new Map<BubbleColor, number>();
      for (const nb of nbrBubbles) {
        colorCounts.set(nb.color, (colorCounts.get(nb.color) ?? 0) + 1);
      }
      let best: BubbleColor = nbrBubbles[0]?.color ?? p.color;
      let bestCount = 0;
      for (const [c, n] of colorCounts) { if (n > bestCount) { best = c; bestCount = n; } }
      landColor = best;
    }

    const newBubble: Bubble = {
      id: Math.floor(Math.random() * 1e9),
      row, col,
      x: grid.colX(row, col),
      y: grid.rowY(row),
      color: landColor,
      hasPossum: false,
    };
    grid.bubbles.push(newBubble);

    const cluster = findColorCluster(grid, newBubble);
    if (cluster.length >= 2) {
      processChain(cluster);
    } else {
      tickAfterShot(false);
    }
  };

  /**
   * Will's Zigzag Zapper terminal explosion. Pops every bubble already
   * marked along the projectile's path plus every bubble within
   * `explosionRadius` diameters of the explosion point, then runs the
   * standard floater pass and ticks the shot counter.
   */
  const detonateZigzag = (
    p: { x: number; y: number; color: BubbleColor },
    z: NonNullable<NonNullable<typeof stateRef.current.projectile>["zigzag"]>,
  ) => {
    const s = stateRef.current;
    const grid = s.grid!;
    // Always spawn a visible burst at the detonation point so the player
    // sees Will's bubble explode (otherwise an empty-area detonation would
    // look like the ball just disappeared).
    const burstPieces = 18;
    for (let k = 0; k < burstPieces; k++) {
      const ang = (Math.PI * 2 * k) / burstPieces + Math.random() * 0.3;
      const speed = 200 + Math.random() * 220;
      s.particles.push({
        x: p.x, y: p.y,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed - 80,
        color: p.color,
        born: performance.now(),
        life: 700 + Math.random() * 240,
        size: 4 + Math.random() * 3,
      });
    }
    Sfx.pop(0);

    const radiusPx = z.behavior.explosionRadius * grid.diameter + grid.radius * 0.5;
    const idsToPop = new Set<number>(z.poppedIds);
    for (const b of grid.bubbles) {
      if (idsToPop.has(b.id)) continue;
      const dx = b.x - p.x, dy = (b.y + s.scrollY) - p.y;
      if (dx * dx + dy * dy <= radiusPx * radiusPx) idsToPop.add(b.id);
    }
    const popped = grid.bubbles.filter(b => idsToPop.has(b.id));
    if (popped.length === 0) {
      // Empty-area detonation — still consume the shot. The burst above
      // gives the player visual feedback that the bubble exploded.
      tickAfterShot(false);
      return;
    }
    grid.bubbles = grid.bubbles.filter(b => !idsToPop.has(b.id));

    let chainTotal = 0;
    popped.forEach((b, i) => {
      chainTotal += (i + 1) * 10;
      const px = b.x, py = b.y + s.scrollY;
      s.popping.push({ ...b, y: py, popStart: performance.now() + i * 30 });
      const pieces = 8;
      for (let k = 0; k < pieces; k++) {
        const ang = (Math.PI * 2 * k) / pieces + Math.random() * 0.4;
        const speed = 140 + Math.random() * 180;
        s.particles.push({
          x: px, y: py,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed - 60,
          color: b.color,
          born: performance.now() + i * 30,
          life: 600 + Math.random() * 200,
          size: 3 + Math.random() * 3,
        });
      }
      setTimeout(() => Sfx.pop(i), i * 40);
      if (b.hasPossum) {
        s.savedPossums.push({ id: b.id, x: b.x, y: b.y + s.scrollY, born: performance.now() });
        setPossumsLeft(pl => Math.max(0, pl - 1));
        setTimeout(() => Sfx.squeak(), i * 40 + 60);
      }
    });
    setScore(sc => sc + chainTotal);
    flashHappy();

    const floaters = findFloaters(grid);
    if (floaters.length) {
      const fIds = new Set(floaters.map(b => b.id));
      grid.bubbles = grid.bubbles.filter(b => !fIds.has(b.id));
      floaters.forEach(b => s.falling.push({ ...b, y: b.y + s.scrollY, vy: 0 }));
      setScore(sc => sc + floaters.reduce((acc, _, i) => acc + (popped.length + i + 1) * 10, 0));
    }

    // Will's pops + drops also count toward Dusty's unlock counter — but
    // since Will only fires once already unlocked, the counter is only
    // gameplay-relevant while Dusty is active.
    setPopOrDropCount(c => c + popped.length + floaters.length);
    tickAfterShot(true);
  };

  /**
   * Bella's Love Bomb terminal explosion. Pops every bubble within
   * `explosionRadius` diameters of the impact point regardless of color,
   * then runs the standard floater pass and ticks the shot counter.
   */
  const detonateLoveBomb = (
    p: { x: number; y: number; color: BubbleColor },
    behavior: Extract<ProjectileBehavior, { kind: "love-bomb" }>,
  ) => {
    const s = stateRef.current;
    const grid = s.grid!;

    // Pink burst at the detonation point so the explosion reads even when
    // the heart lands in empty space.
    const burstPieces = 18;
    for (let k = 0; k < burstPieces; k++) {
      const ang = (Math.PI * 2 * k) / burstPieces + Math.random() * 0.3;
      const speed = 200 + Math.random() * 220;
      s.particles.push({
        x: p.x, y: p.y,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed - 80,
        color: "pink",
        born: performance.now(),
        life: 700 + Math.random() * 240,
        size: 4 + Math.random() * 3,
      });
    }
    Sfx.pop(0);

    const radiusPx = behavior.explosionRadius * grid.diameter + grid.radius * 0.5;
    const idsToPop = new Set<number>();
    for (const b of grid.bubbles) {
      const dx = b.x - p.x, dy = (b.y + s.scrollY) - p.y;
      if (dx * dx + dy * dy <= radiusPx * radiusPx) idsToPop.add(b.id);
    }
    const popped = grid.bubbles.filter(b => idsToPop.has(b.id));
    if (popped.length === 0) {
      tickAfterShot(false);
      return;
    }
    grid.bubbles = grid.bubbles.filter(b => !idsToPop.has(b.id));

    let chainTotal = 0;
    popped.forEach((b, i) => {
      chainTotal += (i + 1) * 10;
      const px = b.x, py = b.y + s.scrollY;
      s.popping.push({ ...b, y: py, popStart: performance.now() + i * 30 });
      const pieces = 8;
      for (let k = 0; k < pieces; k++) {
        const ang = (Math.PI * 2 * k) / pieces + Math.random() * 0.4;
        const speed = 140 + Math.random() * 180;
        s.particles.push({
          x: px, y: py,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed - 60,
          color: b.color,
          born: performance.now() + i * 30,
          life: 600 + Math.random() * 200,
          size: 3 + Math.random() * 3,
        });
      }
      setTimeout(() => Sfx.pop(i), i * 40);
      if (b.hasPossum) {
        s.savedPossums.push({ id: b.id, x: b.x, y: b.y + s.scrollY, born: performance.now() });
        setPossumsLeft(pl => Math.max(0, pl - 1));
        setTimeout(() => Sfx.squeak(), i * 40 + 60);
      }
    });
    setScore(sc => sc + chainTotal);
    flashHappy();

    const floaters = findFloaters(grid);
    if (floaters.length) {
      const fIds = new Set(floaters.map(b => b.id));
      grid.bubbles = grid.bubbles.filter(b => !fIds.has(b.id));
      floaters.forEach(b => s.falling.push({ ...b, y: b.y + s.scrollY, vy: 0 }));
      setScore(sc => sc + floaters.reduce((acc, _, i) => acc + (popped.length + i + 1) * 10, 0));
    }

    setPopOrDropCount(c => c + popped.length + floaters.length);
    tickAfterShot(true);
  };

  const processChain = (cluster: Bubble[]) => {
    const s = stateRef.current;
    const grid = s.grid!;
    const ids = new Set(cluster.map(b => b.id));
    grid.bubbles = grid.bubbles.filter(b => !ids.has(b.id));

    let chainTotal = 0;
    let rescuedThisChain = 0;
    cluster.forEach((b, i) => {
      chainTotal += (i + 1) * 10;
      const px = b.x, py = b.y + s.scrollY;
      s.popping.push({ ...b, y: py, popStart: performance.now() + i * 30 });
      const pieces = 8;
      for (let k = 0; k < pieces; k++) {
        const ang = (Math.PI * 2 * k) / pieces + Math.random() * 0.4;
        const speed = 120 + Math.random() * 160;
        s.particles.push({
          x: px, y: py,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed - 60,
          color: b.color,
          born: performance.now() + i * 30,
          life: 600 + Math.random() * 200,
          size: 3 + Math.random() * 3,
        });
      }
      setTimeout(() => Sfx.pop(i), i * 40);
      if (b.hasPossum) {
        s.savedPossums.push({ id: b.id, x: b.x, y: b.y + s.scrollY, born: performance.now() });
        setPossumsLeft(pl => Math.max(0, pl - 1));
        setTimeout(() => Sfx.squeak(), i * 40 + 60);
        rescuedThisChain++;
      }
    });

    totalPopsRef.current += cluster.length;
    possumsRescuedRef.current += rescuedThisChain;
    if (cluster.length > maxComboRef.current) maxComboRef.current = cluster.length;

    if (cluster.length >= 4) {
      Sfx.combo(cluster.length);
      setComboText({ text: cluster.length >= 8 ? `MEGA ${cluster.length}x!` : `${cluster.length}x Combo!`, key: Date.now() });
      setTimeout(() => setComboText(null), 1200);
    }

    setScore(sc => sc + chainTotal);
    flashHappy();

    const floaters = findFloaters(grid);
    if (floaters.length) {
      const fIds = new Set(floaters.map(b => b.id));
      grid.bubbles = grid.bubbles.filter(b => !fIds.has(b.id));
      let bonus = cluster.length;
      floaters.forEach(b => {
        bonus++;
        chainTotal += bonus * 10;
        // Bake scroll offset into the falling bubble so it drops from where it visually sits
        s.falling.push({ ...b, y: b.y + s.scrollY, vy: 0 });
      });
      setScore(sc => sc + floaters.reduce((acc, _, i) => acc + (cluster.length + i + 1) * 10, 0));
    }

    // Track pops/drops for the Will-unlock condition. Counts every bubble
    // popped in a normal color chain plus any floaters dropped.
    setPopOrDropCount(c => c + cluster.length + floaters.length);

    tickAfterShot(true);
  };

  const shotCounterRef = useRef(0);
  const tickAfterShot = (popped: boolean) => {
    const s = stateRef.current;
    shotCounterRef.current++;
    s.currentColor = s.nextColor;
    // Every 8th shot is a rainbow power-up
    if (shotCounterRef.current % 8 === 7) {
      s.nextColor = "rainbow" as BubbleColor;
      Sfx.powerUp();
    } else {
      s.nextColor = pickShooterColor(s.grid!, level);
    }
    setBallColor(s.currentColor);
    setNextBallColor(s.nextColor);
    if (!popped) missCountRef.current++;

    setShotsLeft(prev => {
      const next = prev - 1;
      setTimeout(() => checkEnd(next), popped ? 800 : 50);
      return next;
    });
  };

  const checkEnd = (shots: number) => {
    const s = stateRef.current;
    const grid = s.grid!;
    if (overlayRef.current) return;
    const remainingPossums = grid.bubbles.filter(b => b.hasPossum).length
      + s.falling.filter(b => b.hasPossum && !b.landed).length;
    if (remainingPossums === 0) {
      stopMusic();
      Sfx.win();
      const shotsUsed = totalShotsRef.current - shots;
      const pct = shots / totalShotsRef.current;
      const stars = pct >= 0.5 ? 3 : pct >= 0.2 ? 2 : 1;
      setEarnedStars(stars);
      setStars(level.id, stars);
      setBestShots(level.id, shotsUsed);
      addPossumsRescued(possumsRescuedRef.current);
      setTimeout(() => Sfx.star(), 300);
      const newAchievements = checkAchievements({
        totalPops: totalPopsRef.current,
        comboSize: maxComboRef.current,
        levelId: level.id,
        levelWon: true,
        shotsUsed: missCountRef.current,
        totalShots: totalShotsRef.current - shots,
        usedCompanion: companionOnThisLevel && popOrDropCount > 0,
      });
      if (newAchievements.length > 0) {
        setAchievementToast(newAchievements[0]);
        setTimeout(() => setAchievementToast(null), 3000);
      }
      setOverlay("win");
      onWinRef.current(scoreRef.current);
      if (companion && companion.availability && level.id === companion.availability.levels.to) {
        onFarewellRef.current?.(companion);
      }
      return;
    }
    if (shots <= 0 && !s.projectile) {
      if (practiceMode) {
        setShotsLeft(5);
      } else {
        stopMusic();
        Sfx.lose();
        setOverlay("lose");
        onLoseRef.current();
      }
    }
  };

  const scoreRef = useRef(0);
  useEffect(() => { scoreRef.current = score; }, [score]);
  const overlayRef = useRef<typeof overlay>(null);
  useEffect(() => { overlayRef.current = overlay; }, [overlay]);
  const shotsLeftRef = useRef(level.shots);
  useEffect(() => { shotsLeftRef.current = shotsLeft; }, [shotsLeft]);

  const draw = () => {
    const canvas = canvasRef.current;
    const s = stateRef.current;
    const grid = s.grid;
    if (!canvas || !grid) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
    ctx.clearRect(0, 0, s.canvasW, s.canvasH);

    // Bouncy side walls
    const wallGrad = ctx.createLinearGradient(0, 0, 6, 0);
    wallGrad.addColorStop(0, "rgba(255,255,255,0.45)");
    wallGrad.addColorStop(1, "rgba(255,255,255,0.05)");
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, 6, s.canvasH);
    const wallGrad2 = ctx.createLinearGradient(s.canvasW - 6, 0, s.canvasW, 0);
    wallGrad2.addColorStop(0, "rgba(255,255,255,0.05)");
    wallGrad2.addColorStop(1, "rgba(255,255,255,0.45)");
    ctx.fillStyle = wallGrad2;
    ctx.fillRect(s.canvasW - 6, 0, 6, s.canvasH);

    if (s.aiming && !s.projectile) {
      drawAimGuide(ctx, s);
    }

    // Render grid bubbles with scroll offset + entrance cascade
    ctx.save();
    ctx.translate(0, s.scrollY);
    for (const b of grid.bubbles) {
      if (s.entranceT < 1) {
        const delay = b.row * 0.06 + b.col * 0.015;
        const t = Math.max(0, Math.min(1, (s.entranceT - delay) * 3));
        if (t <= 0) continue;
        ctx.save();
        ctx.globalAlpha = t;
        ctx.translate(b.x, b.y);
        const sc = 0.3 + t * 0.7;
        ctx.scale(sc, sc);
        drawBubble(ctx, 0, 0, b.color, b.hasPossum);
        ctx.restore();
      } else {
        drawBubble(ctx, b.x, b.y, b.color, b.hasPossum);
      }
    }
    ctx.restore();

    // Falling/popping already have screen coords
    const nowDraw = performance.now();
    for (const b of s.falling) {
      ctx.save();
      if (b.landed && b.landedAt) {
        const lt = (nowDraw - b.landedAt) / 900;
        ctx.globalAlpha = Math.max(0, 1 - lt);
      }
      drawBubble(ctx, b.x, b.y, b.color, b.hasPossum);
      ctx.restore();
    }

    // Explosion particles
    for (const p of s.particles) {
      const pt = (nowDraw - p.born) / p.life;
      if (pt < 0) continue;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - pt);
      ctx.fillStyle = COLOR_HSL[p.color];
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 - pt * 0.5), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const now = performance.now();
    for (const b of s.popping) {
      const t = Math.max(0, (now - b.popStart) / 400);
      const scale = 1 + t * 0.6;
      const alpha = 1 - t;
      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.translate(b.x, b.y);
      ctx.scale(scale, scale);
      drawBubble(ctx, 0, 0, b.color, false);
      ctx.restore();
    }

    for (const sp of s.savedPossums) {
      const t = (now - sp.born) / 1400;
      ctx.save();
      ctx.globalAlpha = 1 - t;
      ctx.translate(sp.x, sp.y - t * 80);
      ctx.fillStyle = "white";
      ctx.font = "bold 16px Fredoka, system-ui";
      ctx.textAlign = "center";
      ctx.fillText("Yay!", 0, -28);
      ctx.restore();
    }

    // Hint highlight — pulsing ring around the cached best cluster
    if (showHintRef.current && hintClusterRef.current.length > 0) {
      const bestCluster = hintClusterRef.current;
      const pulse = 0.5 + Math.sin(now * 0.006) * 0.3;
      ctx.save();
      ctx.translate(0, s.scrollY);
      ctx.strokeStyle = `rgba(255, 200, 0, ${pulse})`;
      ctx.lineWidth = 3;
      for (const b of bestCluster) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, grid.radius + 4, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Trail particles
    for (const tp of s.trailParticles) {
      const age = (now - tp.born) / 300;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 0.5 - age * 0.5);
      ctx.fillStyle = COLOR_HSL[tp.color];
      ctx.beginPath();
      ctx.arc(tp.x, tp.y, tp.size * (1 - age * 0.6), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (s.projectile) {
      if (s.projectile.loveBomb) {
        drawHeart(ctx, s.projectile.x, s.projectile.y, s.grid!.diameter);
      } else {
        drawBubble(ctx, s.projectile.x, s.projectile.y, s.projectile.color, false);
      }
    }
  };

  /**
   * Heart-shaped projectile for Bella's Love Bomb. Sized to fit a single
   * grid bubble (`diameter`) so it reads as "one ball" but visually
   * distinct from regular shots.
   */
  const drawHeart = (
    ctx: CanvasRenderingContext2D,
    x: number, y: number, diameter: number,
  ) => {
    const r = diameter * 0.42;
    ctx.save();
    ctx.translate(x, y - r * 0.1);
    ctx.beginPath();
    ctx.moveTo(0, r * 0.9);
    ctx.bezierCurveTo(-r * 0.2, r * 0.6, -r * 1.1, r * 0.1, -r * 0.6, -r * 0.5);
    ctx.bezierCurveTo(-r * 0.3, -r * 0.9, 0, -r * 0.7, 0, -r * 0.3);
    ctx.bezierCurveTo(0, -r * 0.7, r * 0.3, -r * 0.9, r * 0.6, -r * 0.5);
    ctx.bezierCurveTo(r * 1.1, r * 0.1, r * 0.2, r * 0.6, 0, r * 0.9);
    ctx.closePath();
    const grad = ctx.createRadialGradient(
      -r * 0.2, -r * 0.25, r * 0.05,
      0, 0, r * 1.1,
    );
    grad.addColorStop(0, "hsl(345, 100%, 88%)");
    grad.addColorStop(0.4, "hsl(348, 85%, 62%)");
    grad.addColorStop(1, "hsl(350, 75%, 50%)");
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "hsl(350, 60%, 40%)";
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(-r * 0.28, -r * 0.38, r * 0.18, r * 0.12, -0.4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-r * 0.12, -r * 0.25, r * 0.08, r * 0.06, -0.3, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fill();
    ctx.restore();
  };

  const drawBubble = (
    ctx: CanvasRenderingContext2D,
    x: number, y: number, color: BubbleColor, possum: boolean, scale = 1,
  ) => {
    const r = (stateRef.current.grid?.radius ?? 15) * scale;
    const isRainbow = (color as string) === "rainbow";
    if (isRainbow) {
      const rainbow = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
      rainbow.addColorStop(0, "hsl(0,85%,65%)");
      rainbow.addColorStop(0.25, "hsl(48,95%,60%)");
      rainbow.addColorStop(0.5, "hsl(140,65%,55%)");
      rainbow.addColorStop(0.75, "hsl(210,90%,65%)");
      rainbow.addColorStop(1, "hsl(280,70%,68%)");
      ctx.fillStyle = rainbow;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.font = `${r}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("🌈", x, y + 1);
    } else {
      const grad = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.1, x, y, r);
      grad.addColorStop(0, "rgba(255,255,255,0.95)");
      grad.addColorStop(0.4, COLOR_HSL[color]);
      grad.addColorStop(1, COLOR_HSL[color]);
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.18)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.beginPath(); ctx.ellipse(x - r * 0.35, y - r * 0.45, r * 0.3, r * 0.18, 0, 0, Math.PI * 2); ctx.fill();
    }

    if (colorblind && CB_PATTERNS[color]) {
      ctx.save();
      ctx.translate(x, y);
      ctx.strokeStyle = "rgba(0,0,0,0.7)";
      ctx.lineWidth = 1.5;
      CB_PATTERNS[color](ctx, r);
      ctx.restore();
    }

    if (possum) {
      ctx.save();
      ctx.translate(x, y + 2);
      ctx.scale(0.55 * scale, 0.55 * scale);
      // Ringtail possum: grey-brown fur, large round eyes, pointed snout, pink inner ears, curled tail
      const fur = "hsl(30 20% 45%)";
      const belly = "hsl(40 30% 82%)";
      // Pointed ears
      ctx.fillStyle = fur;
      ctx.beginPath(); ctx.moveTo(-14, -6); ctx.lineTo(-10, -18); ctx.lineTo(-6, -6); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(14, -6); ctx.lineTo(10, -18); ctx.lineTo(6, -6); ctx.closePath(); ctx.fill();
      // Pink inner ears
      ctx.fillStyle = "hsl(340 60% 75%)";
      ctx.beginPath(); ctx.moveTo(-13, -7); ctx.lineTo(-10, -15); ctx.lineTo(-7, -7); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(13, -7); ctx.lineTo(10, -15); ctx.lineTo(7, -7); ctx.closePath(); ctx.fill();
      // Head
      ctx.fillStyle = fur;
      ctx.beginPath(); ctx.ellipse(0, 0, 16, 13, 0, 0, Math.PI * 2); ctx.fill();
      // Lighter face patch
      ctx.fillStyle = belly;
      ctx.beginPath(); ctx.ellipse(0, 4, 9, 7, 0, 0, Math.PI * 2); ctx.fill();
      // Large round eyes (ringtail possums have big dark eyes)
      ctx.fillStyle = "#1a1a1a";
      ctx.beginPath(); ctx.arc(-5.5, -2, 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(5.5, -2, 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "white";
      ctx.beginPath(); ctx.arc(-4.8, -3, 1.1, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(6.2, -3, 1.1, 0, Math.PI * 2); ctx.fill();
      // Small pointed nose
      ctx.fillStyle = "#3a2a2a";
      ctx.beginPath(); ctx.ellipse(0, 4, 1.8, 1.3, 0, 0, Math.PI * 2); ctx.fill();
      // Curled tail hint (small curl on right side)
      ctx.strokeStyle = fur;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(16, 8, 5, -Math.PI * 0.5, Math.PI * 1.2); ctx.stroke();
      ctx.restore();
    }
  };

  const drawAimGuide = (ctx: CanvasRenderingContext2D, s: typeof stateRef.current) => {
    let x = s.shooterX, y = s.shooterY;
    let vx = Math.cos(s.aimAngle), vy = Math.sin(s.aimAngle);
    if (vy >= -0.05) vy = -0.05;
    ctx.save();
    const guideColor = COLOR_HSL[s.currentColor];
    ctx.strokeStyle = guideColor;
    ctx.lineWidth = 4;
    ctx.setLineDash([6, 8]);
    ctx.shadowColor = "rgba(0,0,0,0.25)";
    ctx.shadowBlur = 4;

    // Cap the dotted guide length to roughly 60% of the canvas height
    const MAX_LEN = s.canvasH * 0.6;
    let remaining = MAX_LEN;

    let segments = 0;
    const grid = s.grid!;
    while (segments < 6 && remaining > 4 && y > 30) {
      let tWall = Infinity;
      const guideWallL = grid.radius + 1;
      const guideWallR = s.canvasW - grid.radius - 1;
      if (vx < 0) tWall = (guideWallL - x) / vx;
      else if (vx > 0) tWall = (guideWallR - x) / vx;
      let tHit = Infinity;
      for (const b of grid.bubbles) {
        const by = b.y + s.scrollY;
        const dx = b.x - x, dy = by - y;
        const dot = dx * vx + dy * vy;
        if (dot <= 0) continue;
        const closest = Math.sqrt(Math.max(0, dx * dx + dy * dy - dot * dot));
        if (closest < grid.diameter * 0.95) {
          const t = dot - Math.sqrt((grid.diameter * 0.95) ** 2 - closest * closest);
          if (t < tHit) tHit = t;
        }
      }
      const tCeil = (grid.radius + 8 - y) / vy;
      let t = Math.min(tWall, tHit, tCeil);
      const cappedByLen = t > remaining;
      if (cappedByLen) t = remaining;
      const ex = x + vx * t, ey = y + vy * t;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();

      if (cappedByLen) break;
      // End-cap dot only at terminal hits, not bounces
      if (t === tHit || t === tCeil) {
        ctx.setLineDash([]);
        ctx.fillStyle = guideColor;
        ctx.beginPath(); ctx.arc(ex, ey, 6, 0, Math.PI * 2); ctx.fill();
        ctx.setLineDash([6, 8]);
        break;
      }
      remaining -= t;
      x = ex; y = ey;
      vx = -vx; // wall bounce
      segments++;
    }
    ctx.restore();
  };

  const handlePointer = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const s = stateRef.current;
    const dx = x - s.shooterX;
    const dy = y - s.shooterY;
    s.aimAngle = Math.atan2(Math.min(dy, -10), dx);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (overlay) return;
    unlockAudio();
    const s = stateRef.current;
    if (s.projectile || shotsLeft <= 0) return;
    s.aiming = true;
    handlePointer(e);
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const s = stateRef.current;
    if (!s.aiming) return;
    handlePointer(e);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const s = stateRef.current;
    if (!s.aiming) return;
    s.aiming = false;
    if (s.projectile || shotsLeft <= 0) return;
    handlePointer(e);
    let vx = Math.cos(s.aimAngle), vy = Math.sin(s.aimAngle);
    if (vy > -0.15) vy = -0.15;
    const mag = Math.hypot(vx, vy);
    vx = (vx / mag) * SHOOT_SPEED;
    vy = (vy / mag) * SHOOT_SPEED;
    if (projectileBehavior && projectileBehavior.kind === "zigzag-explode") {
      const grid = s.grid!;
      // Player-directed: use the aimed angle as the base trajectory.
      // The zigzag flips horizontal direction around that aim each row
      // so the bubble snakes along the line the player chose.
      const speed = SHOOT_SPEED;
      // Aim angle measured from vertical (0 = straight up). Negative = left.
      const aimFromVertical = Math.atan2(vx, -vy);
      // Zigzag wobble amplitude added/subtracted from the aim each row.
      const wobble = Math.PI * 0.28; // ~50°
      const initialDir: 1 | -1 = vx < 0 ? -1 : 1;
      // First leg: aim + wobble in initialDir
      const firstAng = aimFromVertical + wobble * initialDir;
      const firstVx = Math.sin(firstAng) * speed;
      const firstVy = -Math.cos(firstAng) * speed;
      s.projectile = {
        x: s.shooterX,
        y: s.shooterY,
        vx: firstVx,
        vy: firstVy,
        color: s.currentColor,
        zigzag: {
          behavior: projectileBehavior,
          startY: s.shooterY,
          rowsTravelled: 0,
          nextRowY: s.shooterY - grid.rowHeight,
          dir: initialDir,
          poppedIds: new Set<number>(),
          baseSpeed: speed,
          aimFromVertical,
          wobble,
        },
      };
      // Companion fires — start the reactivation cooldown and flip the
      // active thrower back to Dusty so the next shot uses Dusty's normal
      // projectile.
      if (companionOnThisLevel && activeThrowerId === companionId) {
        setCompanionCooldownBaseline(popOrDropCount);
        setActiveCharacterId("dusty");
        setActiveThrowerIdState("dusty");
      }
    } else if (projectileBehavior && projectileBehavior.kind === "love-bomb") {
      // Bella's Love Bomb — flies straight along the player's aim and
      // explodes on first contact with any bubble or the ceiling.
      s.projectile = {
        x: s.shooterX,
        y: s.shooterY,
        vx, vy,
        color: s.currentColor,
        loveBomb: { behavior: projectileBehavior },
      };
      if (companionOnThisLevel && activeThrowerId === companionId) {
        setCompanionCooldownBaseline(popOrDropCount);
        setActiveCharacterId("dusty");
        setActiveThrowerIdState("dusty");
      }
    } else {
      s.projectile = { x: s.shooterX, y: s.shooterY, vx, vy, color: s.currentColor };
    }
    Sfx.shoot();
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-background">
      {/* App chrome: level title bar — fully outside the bubble play area */}
      <header className="z-30 flex h-11 shrink-0 items-center justify-center border-b-2 border-border bg-card px-3 shadow-md">
        <h1 className="text-base font-bold tracking-wide text-foreground">Level {level.id}</h1>
      </header>

      {/* Playfield — bubbles start here, beneath the header */}
      <div ref={containerRef} className="relative flex-1 w-full">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 touch-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />

        <div
          className={`pointer-events-none absolute bottom-0 left-1/2 z-0 -translate-x-1/2 ${overlay === "win" ? "animate-bounce-soft" : ""}`}
          style={{ marginBottom: -6 }}
        >
          <Dusty
            size={112}
            mood={overlay === "win" ? "happy" : dustyMood}
            ballColor={ballColor}
            characterId={activeThrowerId}
          />
        </div>

        {/* Waiting companion — shown on companion-eligible levels. Dimmed
            and non-interactive until unlocked, then becomes a tap target
            that swaps the active thrower. */}
        {companionOnThisLevel && companion && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); swapThrower(); }}
            onPointerDown={(e) => e.stopPropagation()}
            disabled={!companionAvailable || !!overlay || !!stateRef.current.projectile}
            aria-label={(() => {
              if (companionAvailable) return `Swap to ${getCharacterById(waitingCharacterId).name}`;
              const remaining = companionCooldownBaseline === null
                ? Math.max(0, companionUnlockThreshold - popOrDropCount)
                : Math.max(0, companionReactivateThreshold - (popOrDropCount - companionCooldownBaseline));
              return `${companion.name} — pop ${remaining} more to unlock`;
            })()}
            className={`absolute bottom-2 left-2 z-10 flex flex-col items-center rounded-2xl bg-white/70 p-1 shadow-md backdrop-blur transition-transform ${
              companionAvailable ? "hover:scale-105 active:scale-95" : "cursor-not-allowed"
            }`}
          >
            <div className={companionAvailable ? "" : "opacity-40 grayscale"}>
              <Dusty
                size={64}
                mood="idle"
                characterId={waitingCharacterId}
                showBow={false}
              />
            </div>
            <span className="mt-0.5 text-[9px] font-bold leading-none text-foreground/80">
              {companionAvailable
                ? `Tap ${getCharacterById(waitingCharacterId).name}`
                : `${
                    companionCooldownBaseline === null
                      ? Math.max(0, companionUnlockThreshold - popOrDropCount)
                      : Math.max(0, companionReactivateThreshold - (popOrDropCount - companionCooldownBaseline))
                  } to go`}
            </span>
          </button>
        )}

        {/* Supporter characters — visual-only, cheering from the left side */}
        {supporters.length > 0 && (
          <div className="pointer-events-none absolute bottom-2 left-2 z-10 flex flex-row items-end gap-1">
            {supporters.map(s => {
              const scale = s.supporter?.scale ?? 1;
              const w = Math.round(48 * scale);
              const h = Math.round(68 * scale);
              return (
                <div key={s.id} className="flex flex-col items-center">
                  <img
                    src={s.spriteRef}
                    alt={s.name}
                    width={w}
                    height={h}
                    draggable={false}
                    className={`select-none drop-shadow-md ${overlay === "win" ? "animate-bounce-soft" : "animate-idle-breathe"}`}
                  />
                  <span className="mt-0.5 text-[8px] font-bold text-foreground/70">{s.name}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Combo text overlay */}
        {comboText && (
          <div key={comboText.key} className="pointer-events-none absolute inset-x-0 top-1/3 z-20 flex justify-center animate-bounce-soft">
            <span className="text-3xl font-black text-yellow-400 drop-shadow-lg" style={{ textShadow: "2px 2px 6px rgba(0,0,0,0.5)" }}>
              {comboText.text}
            </span>
          </div>
        )}

        {/* Achievement toast */}
        {achievementToast && (
          <div className="pointer-events-none absolute top-14 inset-x-0 z-30 flex justify-center">
            <div className="rounded-2xl bg-yellow-100/95 px-4 py-2 text-center shadow-xl backdrop-blur animate-bounce-soft">
              <span className="text-lg">{achievementToast.icon}</span>
              <span className="ml-2 text-sm font-bold text-yellow-900">{achievementToast.title}</span>
            </div>
          </div>
        )}

        {/* Current + next ball indicators next to Dusty. Tap the next ball to swap. */}
        <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2" style={{ marginLeft: 64 }}>
          <BubbleSvg color={ballColor} size={32} />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (overlay) return;
              const s = stateRef.current;
              if (s.projectile) return; // can't swap mid-shot
              [s.currentColor, s.nextColor] = [s.nextColor, s.currentColor];
              setBallColor(s.currentColor);
              setNextBallColor(s.nextColor);
              Sfx.click();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Swap to next ball"
            className="rounded-full p-0.5 transition-transform active:scale-90 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <BubbleSvg color={nextBallColor} size={26} className="opacity-90" />
          </button>
          <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[9px] font-bold text-foreground/70 shadow-sm">
            ⇄ tap
          </span>
        </div>

        {/* HUD — bottom-right, inside the right wall, next to Dusty */}
        <div className="pointer-events-auto absolute bottom-2 right-2 z-10 flex w-16 flex-col items-stretch gap-1.5">
          <div className="w-full rounded-xl bg-white/85 px-2 py-1 text-center shadow-md backdrop-blur">
            <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Score</div>
            <div className="text-base font-bold leading-tight text-foreground">{score}</div>
          </div>
          <div className="w-full rounded-xl bg-white/85 px-2 py-1 text-center shadow-md backdrop-blur">
            <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Shots</div>
            <div className="text-base font-bold leading-tight text-primary">{shotsLeft}</div>
          </div>
          <div className="w-full rounded-xl bg-white/85 px-2 py-1 shadow-md backdrop-blur">
            <div className="text-center text-[9px] uppercase tracking-wide text-muted-foreground">Rescue</div>
            <div className="flex items-center justify-center gap-1">
              <svg width="22" height="22" viewBox="-20 -20 40 40" className="shrink-0">
                <PossumFace cx={0} cy={0} scale={0.9} />
              </svg>
              <span className="text-base font-bold leading-tight">{possumsLeft}</span>
            </div>
          </div>
          <button
            onClick={() => {
              if (hintsLeft <= 0) return;
              if (useHint()) {
                setHintsLeft(h => h - 1);
                const grid = stateRef.current.grid;
                if (grid) {
                  const colorGroups = new Map<string, Bubble[]>();
                  for (const b of grid.bubbles) {
                    const cluster = findColorCluster(grid, b);
                    const key = cluster.map(c => c.id).sort().join(",");
                    if (!colorGroups.has(key)) colorGroups.set(key, cluster);
                  }
                  let best: Bubble[] = [];
                  for (const cluster of colorGroups.values()) {
                    if (cluster.length > best.length) best = cluster;
                  }
                  hintClusterRef.current = best;
                }
                showHintRef.current = true;
                setShowHint(true);
                Sfx.hint();
                setTimeout(() => { showHintRef.current = false; setShowHint(false); }, 2000);
              }
            }}
            disabled={hintsLeft <= 0 || !!overlay}
            className="w-full rounded-xl bg-yellow-100/90 px-2 py-1 text-center shadow-md backdrop-blur disabled:opacity-40"
          >
            <div className="text-[9px] uppercase tracking-wide text-yellow-800">Hint</div>
            <div className="text-xs font-bold text-yellow-700">💡 {hintsLeft}</div>
          </button>
          <button
            onClick={() => {
              const next = !soundOn;
              setSoundOn(next);
              setSoundEnabled(next);
              setAudioEnabled(next);
            }}
            className="w-full rounded-xl bg-white/85 px-2 py-1 text-center shadow-md backdrop-blur"
            aria-label={soundOn ? "Mute sound" : "Unmute sound"}
          >
            <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Sound</div>
            <div className="text-base leading-tight">{soundOn ? "🔊" : "🔇"}</div>
          </button>
          {practiceMode && (
            <div className="w-full rounded-xl bg-green-100/90 px-1 py-0.5 text-center shadow-md backdrop-blur">
              <div className="text-[8px] font-bold text-green-700">PRACTICE</div>
            </div>
          )}
          <Button
            variant="secondary"
            onClick={onMenu}
            aria-label="Back to home"
            className="h-7 w-full rounded-xl px-2 text-xs"
          >
            Menu
          </Button>
        </div>

        {/* Celebration: cartoon possums dancing alongside Dusty when level is won */}
        {overlay === "win" && (
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 flex items-end justify-center gap-2 pb-1">
            {[0, 1, 2].map(i => (
              <img
                key={i}
                src={possumDanceImg}
                alt=""
                width={72}
                height={72}
                loading="lazy"
                className="animate-bounce-soft"
                style={{
                  width: 72,
                  height: 72,
                  animationDelay: `${i * 0.15}s`,
                  transform: i % 2 === 0 ? "scaleX(-1)" : undefined,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {overlay === "win" && (
        companion && companion.availability && level.id === companion.availability.levels.to ? (
          <FarewellScreen character={companion} onContinue={onNext} />
        ) : level.id === 60 ? (
          <PhotoAlbum onClose={onExit} />
        ) : (
          <Overlay
            title="🎉 You saved them all!"
            subtitle={`Score: ${score}  ${"⭐".repeat(earnedStars)}${"☆".repeat(3 - earnedStars)}`}
            ctaLabel="Next Level →"
            onCta={onNext}
          />
        )
      )}
      {overlay === "lose" && (
        <Overlay
          title="Aww, out of shots!"
          subtitle="Try again?"
          ctaLabel="Retry"
          onCta={() => initLevel()}
          onSecondary={onMenu}
        />
      )}
    </div>
  );
}

function Overlay({
  title, subtitle, ctaLabel, onCta, onSecondary,
}: { title: string; subtitle: string; ctaLabel: string; onCta: () => void; onSecondary?: () => void }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-start justify-center pt-10 animate-bounce-soft">
      <div className="pointer-events-auto w-[80%] max-w-sm rounded-3xl bg-card/95 p-5 text-center shadow-2xl backdrop-blur">
        <h2 className="mb-2 text-2xl font-bold text-foreground">{title}</h2>
        <p className="mb-5 text-base text-muted-foreground">{subtitle}</p>
        <div className="flex flex-col gap-3">
          <button className="kid-button" onClick={onCta}>{ctaLabel}</button>
          {onSecondary && (
            <button className="kid-button kid-button-secondary" onClick={onSecondary}>Menu</button>
          )}
        </div>
      </div>
    </div>
  );
}
