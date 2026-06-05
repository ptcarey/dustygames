/**
 * Colorblind accessibility patterns — each color gets a distinct shape
 * drawn inside the bubble so players can differentiate without relying on color alone.
 */
import type { BubbleColor } from "./types";

export const CB_PATTERNS: Record<BubbleColor, (ctx: CanvasRenderingContext2D, r: number) => void> = {
  red: (ctx, r) => {
    // Circle
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
    ctx.stroke();
  },
  blue: (ctx, r) => {
    // Diamond
    const s = r * 0.4;
    ctx.beginPath();
    ctx.moveTo(0, -s); ctx.lineTo(s, 0); ctx.lineTo(0, s); ctx.lineTo(-s, 0);
    ctx.closePath(); ctx.stroke();
  },
  green: (ctx, r) => {
    // Triangle
    const s = r * 0.4;
    ctx.beginPath();
    ctx.moveTo(0, -s); ctx.lineTo(s, s * 0.7); ctx.lineTo(-s, s * 0.7);
    ctx.closePath(); ctx.stroke();
  },
  yellow: (ctx, r) => {
    // Star (4-point)
    const outer = r * 0.4, inner = r * 0.18;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 * i) / 8 - Math.PI / 2;
      const rad = i % 2 === 0 ? outer : inner;
      if (i === 0) ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
      else ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
    }
    ctx.closePath(); ctx.stroke();
  },
  purple: (ctx, r) => {
    // Cross / plus
    const s = r * 0.35, w = r * 0.12;
    ctx.beginPath();
    ctx.moveTo(-w, -s); ctx.lineTo(w, -s); ctx.lineTo(w, -w); ctx.lineTo(s, -w);
    ctx.lineTo(s, w); ctx.lineTo(w, w); ctx.lineTo(w, s); ctx.lineTo(-w, s);
    ctx.lineTo(-w, w); ctx.lineTo(-s, w); ctx.lineTo(-s, -w); ctx.lineTo(-w, -w);
    ctx.closePath(); ctx.stroke();
  },
  pink: (ctx, r) => {
    // Horizontal lines
    const s = r * 0.3;
    ctx.beginPath();
    ctx.moveTo(-s, -s * 0.5); ctx.lineTo(s, -s * 0.5);
    ctx.moveTo(-s, 0); ctx.lineTo(s, 0);
    ctx.moveTo(-s, s * 0.5); ctx.lineTo(s, s * 0.5);
    ctx.stroke();
  },
};
