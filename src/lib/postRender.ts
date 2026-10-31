'use client';

/**
 * Renders posts on the guest's device with <canvas>. Nothing is uploaded and
 * nothing is posted on anyone's behalf — the output goes to the share sheet.
 *
 * Images are drawn from the 1600px viewer tier: sharp at 1080 wide, and a
 * fraction of the originals' weight on a phone connection. Drawing a cross-origin
 * image and then reading the canvas needs the same R2 CORS rule as Save to Photos;
 * without it toBlob throws a SecurityError, which the composer reports.
 */

export type Template = 'story' | 'carousel' | 'grid';

export const TEMPLATES: Record<Template, { label: string; hint: string; w: number; h: number; max: number }> = {
  story: { label: 'Story', hint: '9:16 collage', w: 1080, h: 1920, max: 4 },
  carousel: { label: 'Carousel', hint: '4:5, one per photo', w: 1080, h: 1350, max: 10 },
  grid: { label: 'Grid', hint: '1:1, 4 or 9', w: 1080, h: 1080, max: 9 },
};

export interface RenderOptions {
  coupleNames: string;
  dateLabel: string;
  displayFont: string;
  bodyFont: string;
  /** Names and date on the image. */
  caption: boolean;
}

const INK = '#0E0E10';
const PAPER = '#F5F2EC';
const ACCENT = '#F4B23E';

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${url}`));
    img.src = url;
  });
}

/** object-fit: cover into a box. */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / scale;
  const sh = h / scale;
  // Bias slightly upward: faces sit in the top half of most frames.
  const sx = (img.naturalWidth - sw) / 2;
  const sy = Math.max(0, (img.naturalHeight - sh) * 0.38);
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

/** A photo print: white border, soft shadow, slight tilt. */
function drawPrint(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cx: number,
  cy: number,
  w: number,
  h: number,
  degrees: number
) {
  const border = Math.round(w * 0.035);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((degrees * Math.PI) / 180);
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 18;
  ctx.fillStyle = PAPER;
  ctx.fillRect(-w / 2 - border, -h / 2 - border, w + border * 2, h + border * 2);
  ctx.shadowColor = 'transparent';
  drawCover(ctx, img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

function initials(names: string): string {
  const parts = names.split('&').map((p) => p.trim()).filter(Boolean);
  return parts.length === 2 ? `${parts[0][0]} & ${parts[1][0]}` : names;
}

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  return [c, ctx];
}

function renderStory(imgs: HTMLImageElement[], o: RenderOptions): HTMLCanvasElement {
  const { w, h } = TEMPLATES.story;
  const [c, ctx] = canvas(w, h);
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, w, h);
  const [hero, ...rest] = imgs;
  const heroH = rest.length ? Math.round(h * 0.6) : h;
  drawCover(ctx, hero, 0, 0, w, heroH);
  if (rest.length) {
    // Fade the hero into the page so the prints sit on it.
    const g = ctx.createLinearGradient(0, heroH * 0.55, 0, heroH);
    g.addColorStop(0, 'rgba(14,14,16,0)');
    g.addColorStop(1, INK);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, heroH);
  }
  const layouts: Record<number, [number, number, number, number, number][]> = {
    1: [[w * 0.5, h * 0.7, w * 0.62, w * 0.46, -2]],
    2: [
      [w * 0.3, h * 0.66, w * 0.44, w * 0.56, -5],
      [w * 0.7, h * 0.71, w * 0.42, w * 0.53, 4],
    ],
    3: [
      [w * 0.27, h * 0.64, w * 0.38, w * 0.48, -6],
      [w * 0.73, h * 0.66, w * 0.38, w * 0.48, 5],
      [w * 0.5, h * 0.76, w * 0.42, w * 0.32, -1.5],
    ],
  };
  for (const [i, [cx, cy, pw, ph, deg]] of (layouts[rest.length] ?? []).entries()) {
    drawPrint(ctx, rest[i], cx, cy, pw, ph, deg);
  }
  if (o.caption) {
    ctx.fillStyle = PAPER;
    ctx.font = `800 96px ${o.displayFont}`;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(initials(o.coupleNames), 72, h - 120);
    ctx.fillStyle = ACCENT;
    ctx.font = `600 34px ${o.bodyFont}`;
    ctx.textAlign = 'right';
    ctx.fillText(o.dateLabel, w - 72, h - 128);
    ctx.textAlign = 'left';
  }
  return c;
}

function renderCarousel(imgs: HTMLImageElement[], o: RenderOptions): HTMLCanvasElement[] {
  const { w, h } = TEMPLATES.carousel;
  return imgs.map((img, i) => {
    const [c, ctx] = canvas(w, h);
    drawCover(ctx, img, 0, 0, w, h);
    if (o.caption && i === 0) {
      const g = ctx.createLinearGradient(0, h * 0.7, 0, h);
      g.addColorStop(0, 'rgba(14,14,16,0)');
      g.addColorStop(1, 'rgba(14,14,16,0.75)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = PAPER;
      ctx.font = `800 72px ${o.displayFont}`;
      ctx.fillText(o.coupleNames, 60, h - 92);
      ctx.fillStyle = ACCENT;
      ctx.font = `600 30px ${o.bodyFont}`;
      ctx.fillText(o.dateLabel, 62, h - 44);
    }
    return c;
  });
}

function renderGrid(imgs: HTMLImageElement[], o: RenderOptions): HTMLCanvasElement {
  const { w, h } = TEMPLATES.grid;
  const [c, ctx] = canvas(w, h);
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, w, h);
  const n = imgs.length >= 9 ? 3 : imgs.length >= 4 ? 2 : 1;
  const gap = 12;
  const footer = o.caption ? 96 : 0;
  const cell = (w - gap * (n + 1)) / n;
  const cellH = (h - footer - gap * (n + 1)) / n;
  imgs.slice(0, n * n).forEach((img, i) => {
    const x = gap + (i % n) * (cell + gap);
    const y = gap + Math.floor(i / n) * (cellH + gap);
    drawCover(ctx, img, x, y, cell, cellH);
  });
  if (o.caption) {
    ctx.fillStyle = PAPER;
    ctx.font = `800 44px ${o.displayFont}`;
    ctx.fillText(o.coupleNames, gap + 8, h - 32);
    ctx.fillStyle = ACCENT;
    ctx.font = `600 26px ${o.bodyFont}`;
    ctx.textAlign = 'right';
    ctx.fillText(o.dateLabel, w - gap - 8, h - 36);
    ctx.textAlign = 'left';
  }
  return c;
}

export function render(template: Template, imgs: HTMLImageElement[], o: RenderOptions): HTMLCanvasElement[] {
  const max = TEMPLATES[template].max;
  const use = imgs.slice(0, max);
  if (use.length === 0) return [];
  if (template === 'story') return [renderStory(use, o)];
  if (template === 'grid') return [renderGrid(use, o)];
  return renderCarousel(use, o);
}

export function toFile(c: HTMLCanvasElement, name: string): Promise<File> {
  return new Promise((resolve, reject) => {
    try {
      c.toBlob(
        (blob) => (blob ? resolve(new File([blob], name, { type: 'image/jpeg' })) : reject(new Error('empty'))),
        'image/jpeg',
        0.92
      );
    } catch (err) {
      reject(err);
    }
  });
}
