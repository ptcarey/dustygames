import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildLevel, chainScore, findColorCluster, findFloaters,
  pickShooterColor, snapToGrid,
} from "@/game/engine";
import type { GridState } from "@/game/engine";
import { COLOR_HSL } from "@/game/types";
import type { Bubble, BubbleColor, LevelConfig } from "@/game/types";
import { Sfx, setSoundEnabled, unlockAudio } from "@/game/sound";
import { Dusty } from "./Dusty";
import { PossumFace, BubbleSvg } from "./BubbleSvg";
import { Button } from "./ui/button";
import possumDanceImg from "@/assets/possum-dance.png";
import { getCharacterById, getCompanionForLevel } from "@/characters/characters";
import { setActiveCharacterId } from "@/game/storage";
import { getProjectileBehaviorForAbilities, type ProjectileBehavior } from "@/abilities";
import { FarewellScreen } from "./FarewellScreen";
import type { Character } from "@/game/types";

interface Props {
  level: LevelConfig;
  audioEnabled: boolean;
  onWin: (score: number) => void;
  onLose: () => void;
  onNext: () => void;
  onExit: () => void;
  onMenu: () => void;
  onFarewell?: (character: Character) => void;
}

interface SavedPossum { id: number; x: number; y: number; born: number; }
interface Particle { x: number; y: number; vx: number; vy: number; color: BubbleColor; born: number; life: number; size: number; }

const SHOOT_SPEED = 900; // px/sec

export function BubbleGame({ level, audioEnabled, onWin, onLose, onNext, onExit, onMenu, onFarewell }: Props) {
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
  });

  const [shotsLeft, setShotsLeft] = useState(level.shots);
  const [score, setScore] = useState(0);
  const [possumsLeft, setPossumsLeft] = useState(0);
  const [dustyMood, setDustyMood] = useState<"idle" | "happy" | "wag">("wag");
  const [overlay, setOverlay] = useState<"win" | "lose" | null>(null);
  const [ballColor, setBallColor] = useState<BubbleColor>("red");
  const [nextBallColor, setNextBallColor] = useState<BubbleColor>("blue");

  // The active companion (if any) is fully data-driven — derived from the
  // character config's `availability.levels` range. A null companion means
  // Dusty plays this level alone.
  const companion = useMemo(() => getCompanionForLevel(level.id), [level.id]);
  const companionOnThisLevel = companion !== null;
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

    setShotsLeft(level.shots);
    setScore(0);
    setPossumsLeft(grid.bubbles.filter(b => b.hasPossum).length);
    setOverlay(null);
    // Reset companion-related state — pop counter resets per level, and
    // the active thrower returns to Dusty so the companion must be
    // re-earned.
    setPopOrDropCount(0);
    setCompanionCooldownBaseline(null);
    setActiveCharacterId("dusty");
    setActiveThrowerIdState("dusty");
  }, [level]);

  useEffect(() => {
    initLevel();
    const onResize = () => initLevel();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [initLevel]);

  useEffect(() => {
    const ctxState = stateRef.current;
    let last = performance.now();

    const tick = (ts: number) => {
      const dt = Math.min(0.05, (ts - last) / 1000);
      last = ts;
      step(dt);
      draw();
      ctxState.rafId = requestAnimationFrame(tick);
    };
    ctxState.rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(ctxState.rafId);
  }, []);

  const step = (dt: number) => {
    const s = stateRef.current;
    const grid = s.grid;
    if (!grid) return;

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
      if (p.x < grid.radius) {
        p.x = grid.radius; p.vx = -p.vx;
        if (p.zigzag) p.zigzag.dir = (p.zigzag.dir === 1 ? -1 : 1);
      }
      if (p.x > s.canvasW - grid.radius) {
        p.x = s.canvasW - grid.radius; p.vx = -p.vx;
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
      const candidates: Array<[number, number]> = [
        [row, col + 1], [row, col - 1], [row + 1, col], [row - 1, col],
      ];
      for (const [r, c] of candidates) {
        if (!occupied.has(`${r},${c}`)) { row = r; col = c; break; }
      }
    }
    row = Math.max(0, row);
    col = Math.max(0, Math.min(grid.cols - 1, col));

    const newBubble: Bubble = {
      id: Math.floor(Math.random() * 1e9),
      row, col,
      x: grid.colX(row, col),
      y: grid.rowY(row),
      color: p.color,
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
    cluster.forEach((b, i) => {
      chainTotal += (i + 1) * 10;
      // Popping is purely visual; bake current scrollY into screen position
      const px = b.x, py = b.y + s.scrollY;
      s.popping.push({ ...b, y: py, popStart: performance.now() + i * 30 });
      // Spawn explosion particles
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
      }
    });
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

  const tickAfterShot = (popped: boolean) => {
    const s = stateRef.current;
    s.currentColor = s.nextColor;
    s.nextColor = pickShooterColor(s.grid!, level);
    setBallColor(s.currentColor);
    setNextBallColor(s.nextColor);

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
      + s.falling.filter(b => b.hasPossum).length;
    if (remainingPossums === 0) {
      Sfx.win();
      setOverlay("win");
      onWinRef.current(scoreRef.current);
      if (companion && companion.availability && level.id === companion.availability.levels.to) {
        onFarewellRef.current?.(companion);
      }
      return;
    }
    if (shots <= 0 && !s.projectile) {
      Sfx.lose();
      setOverlay("lose");
      onLoseRef.current();
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

    // Render grid bubbles with scroll offset
    ctx.save();
    ctx.translate(0, s.scrollY);
    for (const b of grid.bubbles) drawBubble(ctx, b.x, b.y, b.color, b.hasPossum);
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

    if (s.projectile) {
      drawBubble(ctx, s.projectile.x, s.projectile.y, s.projectile.color, false);
    }
  };

  const drawBubble = (
    ctx: CanvasRenderingContext2D,
    x: number, y: number, color: BubbleColor, possum: boolean, scale = 1,
  ) => {
    const r = (stateRef.current.grid?.radius ?? 15) * scale;
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

    if (possum) {
      ctx.save();
      ctx.translate(x, y + 2);
      ctx.scale(0.55 * scale, 0.55 * scale);
      ctx.fillStyle = "hsl(220 12% 55%)";
      ctx.beginPath(); ctx.arc(-13, -12, 5, 0, Math.PI * 2); ctx.arc(13, -12, 5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, 0, 18, 15, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "hsl(35 40% 88%)";
      ctx.beginPath(); ctx.ellipse(0, 6, 10, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#1a1a1a";
      ctx.beginPath(); ctx.arc(-6, -2, 2.2, 0, Math.PI * 2); ctx.arc(6, -2, 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, 3, 1.5, 1.2, 0, 0, Math.PI * 2); ctx.fill();
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
      if (vx < 0) tWall = (grid.radius - x) / vx;
      else if (vx > 0) tWall = (s.canvasW - grid.radius - x) / vx;
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
    } else {
      s.projectile = { x: s.shooterX, y: s.shooterY, vx, vy, color: s.currentColor };
    }
    Sfx.shoot();
  };

  const colorChip = useMemo(() => COLOR_HSL[stateRef.current.currentColor], []);
  void colorChip;

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
              if (companionAvailable) return `Swap to ${companion.name}`;
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
                ? `Tap ${companion.name}`
                : `${
                    companionCooldownBaseline === null
                      ? Math.max(0, companionUnlockThreshold - popOrDropCount)
                      : Math.max(0, companionReactivateThreshold - (popOrDropCount - companionCooldownBaseline))
                  } to go`}
            </span>
          </button>
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
          <div className="flex w-full items-center justify-center gap-1 rounded-xl bg-white/85 px-2 py-1 shadow-md backdrop-blur">
            <svg width="16" height="16" viewBox="-22 -22 44 44">
              <PossumFace />
            </svg>
            <span className="text-sm font-bold leading-none">{possumsLeft}</span>
          </div>
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
          <Overlay
            title="💖 Dusty found Matilda!"
            subtitle={`Reunited at last! Final score: ${score}`}
            ctaLabel="Back to Map"
            onCta={onExit}
          />
        ) : (
          <Overlay
            title="🎉 You saved them all!"
            subtitle={`Score: ${score}`}
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
