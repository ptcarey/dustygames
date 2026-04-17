import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildLevel, chainScore, findColorCluster, findFloaters,
  pickShooterColor, RADIUS, snapToGrid, ROW_HEIGHT, DIAMETER,
} from "@/game/engine";
import type { GridState } from "@/game/engine";
import { COLOR_HSL } from "@/game/types";
import type { Bubble, BubbleColor, LevelConfig } from "@/game/types";
import { Sfx, setSoundEnabled, unlockAudio } from "@/game/sound";
import { Dusty } from "./Dusty";
import { PossumFace, BubbleSvg } from "./BubbleSvg";
import { Button } from "./ui/button";

interface Props {
  level: LevelConfig;
  audioEnabled: boolean;
  onWin: (score: number) => void;
  onLose: () => void;
  onExit: () => void;
}

interface SavedPossum { id: number; x: number; y: number; born: number; }

const SHOOT_SPEED = 900; // px/sec

export function BubbleGame({ level, audioEnabled, onWin, onLose, onExit }: Props) {
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
    projectile: { x: number; y: number; vx: number; vy: number; color: BubbleColor } | null;
    aiming: boolean;
    aimAngle: number;
    popping: Array<Bubble & { popStart: number }>;
    falling: Array<Bubble & { vy: number }>;
    savedPossums: SavedPossum[];
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
    popping: [], falling: [], savedPossums: [],
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

  const onWinRef = useRef(onWin);
  const onLoseRef = useRef(onLose);
  useEffect(() => { onWinRef.current = onWin; onLoseRef.current = onLose; });

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
    s.shooterY = h - 80;
    s.currentColor = pickShooterColor(grid, level);
    s.nextColor = pickShooterColor(grid, level);
    setBallColor(s.currentColor);
    setNextBallColor(s.nextColor);
    s.projectile = null;
    s.popping = []; s.falling = []; s.savedPossums = [];
    s.scrollY = 0; s.targetScrollY = 0;

    setShotsLeft(level.shots);
    setScore(0);
    setPossumsLeft(grid.bubbles.filter(b => b.hasPossum).length);
    setOverlay(null);
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

    // Compute target scroll: anchor bottom of remaining stack to ~visible row 14
    const VISIBLE_ROWS = 15;
    let maxRow = 0;
    for (const b of grid.bubbles) if (b.row > maxRow) maxRow = b.row;
    s.targetScrollY = (VISIBLE_ROWS - 1 - maxRow) * ROW_HEIGHT;
    if (s.targetScrollY > 0) s.targetScrollY = 0; // never push above natural top
    // Smoothly approach target
    const diff = s.targetScrollY - s.scrollY;
    s.scrollY += diff * Math.min(1, dt * 3);

    if (s.projectile) {
      const p = s.projectile;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.x < RADIUS) { p.x = RADIUS; p.vx = -p.vx; }
      if (p.x > s.canvasW - RADIUS) { p.x = s.canvasW - RADIUS; p.vx = -p.vx; }

      let hit = false;
      if (p.y <= RADIUS + 8) hit = true;
      for (const b of grid.bubbles) {
        const dx = b.x - p.x, dy = (b.y + s.scrollY) - p.y;
        if (dx * dx + dy * dy < (DIAMETER * 0.92) ** 2) { hit = true; break; }
      }
      if (hit) {
        landProjectile(p);
        s.projectile = null;
      }
    }

    const now = performance.now();
    s.popping = s.popping.filter(b => now - b.popStart < 400);

    for (const f of s.falling) {
      f.vy += 1400 * dt;
      f.y += f.vy * dt;
    }
    s.falling = s.falling.filter(f => {
      if (f.y > s.canvasH + 40) {
        if (f.hasPossum) {
          s.savedPossums.push({ id: f.id, x: f.x, y: s.canvasH - 90, born: now });
          Sfx.squeak();
          flashHappy();
          setPossumsLeft(p => Math.max(0, p - 1));
        }
        return false;
      }
      return true;
    });
    s.savedPossums = s.savedPossums.filter(sp => now - sp.born < 1400);
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

  const processChain = (cluster: Bubble[]) => {
    const s = stateRef.current;
    const grid = s.grid!;
    const ids = new Set(cluster.map(b => b.id));
    grid.bubbles = grid.bubbles.filter(b => !ids.has(b.id));

    let chainTotal = 0;
    cluster.forEach((b, i) => {
      chainTotal += (i + 1) * 10;
      // Popping is purely visual; bake current scrollY into screen position
      s.popping.push({ ...b, y: b.y + s.scrollY, popStart: performance.now() + i * 30 });
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
    const remainingPossums = grid.bubbles.filter(b => b.hasPossum).length
      + s.falling.filter(b => b.hasPossum).length;
    if (remainingPossums === 0) {
      Sfx.win();
      setOverlay("win");
      onWinRef.current(scoreRef.current);
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
    for (const b of s.falling) drawBubble(ctx, b.x, b.y, b.color, b.hasPossum);

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
    const r = RADIUS * scale;
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
      if (vx < 0) tWall = (RADIUS - x) / vx;
      else if (vx > 0) tWall = (s.canvasW - RADIUS - x) / vx;
      let tHit = Infinity;
      for (const b of grid.bubbles) {
        const by = b.y + s.scrollY;
        const dx = b.x - x, dy = by - y;
        const dot = dx * vx + dy * vy;
        if (dot <= 0) continue;
        const closest = Math.sqrt(Math.max(0, dx * dx + dy * dy - dot * dot));
        if (closest < DIAMETER * 0.95) {
          const t = dot - Math.sqrt((DIAMETER * 0.95) ** 2 - closest * closest);
          if (t < tHit) tHit = t;
        }
      }
      const tCeil = (RADIUS + 8 - y) / vy;
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
    s.projectile = { x: s.shooterX, y: s.shooterY, vx, vy, color: s.currentColor };
    Sfx.shoot();
  };

  const colorChip = useMemo(() => COLOR_HSL[stateRef.current.currentColor], []);
  void colorChip;

  return (
    <div className="relative h-full w-full overflow-hidden flex">
      {/* Playfield */}
      <div ref={containerRef} className="relative flex-1 h-full">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 touch-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />

        {/* Current + next ball indicators next to Dusty */}
        <div className="pointer-events-none absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2" style={{ marginLeft: 90 }}>
          <BubbleSvg color={ballColor} size={42} />
          <BubbleSvg color={nextBallColor} size={30} className="opacity-80" />
        </div>

        <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2" style={{ marginBottom: -10 }}>
          <Dusty size={160} mood={dustyMood} ballColor={ballColor} />
        </div>
      </div>

      {/* Side panel — outside the playfield, stacked from bottom up */}
      <div className="flex w-24 flex-col-reverse items-stretch gap-2 p-2 sm:w-28">
        <Button variant="secondary" onClick={onExit} aria-label="Back to menu" className="w-full">
          Menu
        </Button>
        <div className="flex w-full items-center justify-center gap-1 rounded-2xl bg-white/85 px-3 py-2 shadow-md backdrop-blur">
          <svg width="22" height="22" viewBox="-22 -22 44 44">
            <PossumFace />
          </svg>
          <span className="text-lg font-bold">{possumsLeft}</span>
        </div>
        <div className="w-full rounded-2xl bg-white/85 px-3 py-2 text-center shadow-md backdrop-blur">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Shots</div>
          <div className="text-2xl font-bold text-primary">{shotsLeft}</div>
        </div>
        <div className="w-full rounded-2xl bg-white/85 px-3 py-2 text-center shadow-md backdrop-blur">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Score</div>
          <div className="text-2xl font-bold text-foreground">{score}</div>
        </div>
      </div>

      {overlay === "win" && (
        <Overlay
          title="🎉 You saved them all!"
          subtitle={`Score: ${score}`}
          ctaLabel="Next →"
          onCta={() => onWinRef.current(score)}
        />
      )}
      {overlay === "lose" && (
        <Overlay
          title="Aww, out of shots!"
          subtitle="Try again?"
          ctaLabel="Retry"
          onCta={() => initLevel()}
          onSecondary={onExit}
        />
      )}
    </div>
  );
}

function Overlay({
  title, subtitle, ctaLabel, onCta, onSecondary,
}: { title: string; subtitle: string; ctaLabel: string; onCta: () => void; onSecondary?: () => void }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-foreground/50 backdrop-blur-sm animate-bounce-soft">
      <div className="w-[80%] max-w-sm rounded-3xl bg-card p-6 text-center shadow-2xl">
        <h2 className="mb-2 text-3xl font-bold text-foreground">{title}</h2>
        <p className="mb-6 text-lg text-muted-foreground">{subtitle}</p>
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
