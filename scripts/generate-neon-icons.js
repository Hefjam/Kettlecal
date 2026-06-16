const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const ROOT = path.resolve(__dirname, '..');
const SIZE = 512;
const COLORS_SOURCE = fs.readFileSync(path.join(ROOT, 'src/theme/colors.ts'), 'utf8');
const COLORS_BODY = COLORS_SOURCE.match(/export const Colors = ([\s\S]*?) as const;/)?.[1];
if (!COLORS_BODY) throw new Error('Could not read Colors from src/theme/colors.ts');
const Colors = Function(`return (${COLORS_BODY})`)();

function hexToRgba(hex, alpha = 255) {
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
    alpha,
  ];
}

const palette = {
  bg: hexToRgba(Colors.bg.secondary, 235),
  black: hexToRgba(Colors.bg.primary, 255),
  card: hexToRgba(Colors.bg.card, 230),
  pink: hexToRgba(Colors.accent.primary, 255),
  cyan: hexToRgba(Colors.accent.teal, 255),
  yellow: hexToRgba(Colors.accent.acid, 255),
  purple: hexToRgba(Colors.text.muted, 255),
  lavender: hexToRgba(Colors.text.secondary, 255),
  offWhite: hexToRgba(Colors.text.primary, 255),
};

function rng(seed) {
  let t = seed >>> 0;
  return function next() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function create(seed = 1) {
  return { png: new PNG({ width: SIZE, height: SIZE }), rand: rng(seed) };
}

function blendPixel(img, x, y, color) {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
  const idx = (SIZE * y + x) << 2;
  const srcA = color[3] / 255;
  const dstA = img.data[idx + 3] / 255;
  const outA = srcA + dstA * (1 - srcA);
  if (outA <= 0) return;
  for (let i = 0; i < 3; i++) {
    img.data[idx + i] = Math.round(
      (color[i] * srcA + img.data[idx + i] * dstA * (1 - srcA)) / outA
    );
  }
  img.data[idx + 3] = Math.round(outA * 255);
}

function withAlpha(color, alpha) {
  return [color[0], color[1], color[2], alpha];
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len = dx * dx + dy * dy;
  const t = len === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len));
  const x = ax + t * dx;
  const y = ay + t * dy;
  return Math.hypot(px - x, py - y);
}

function line(ctx, ax, ay, bx, by, color, width) {
  const { png } = ctx;
  const pad = width + 2;
  const minX = Math.floor(Math.min(ax, bx) - pad);
  const maxX = Math.ceil(Math.max(ax, bx) + pad);
  const minY = Math.floor(Math.min(ay, by) - pad);
  const maxY = Math.ceil(Math.max(ay, by) + pad);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const d = distToSegment(x + 0.5, y + 0.5, ax, ay, bx, by);
      if (d <= width / 2) {
        const edge = Math.max(0, Math.min(1, width / 2 - d));
        blendPixel(png, x, y, withAlpha(color, Math.round(color[3] * Math.min(1, edge + 0.35))));
      }
    }
  }
}

function neonLine(ctx, ax, ay, bx, by, color, width = 24, accent = palette.pink) {
  line(ctx, ax - 5, ay + 5, bx - 5, by + 5, withAlpha(accent, 120), width + 20);
  line(ctx, ax + 6, ay - 5, bx + 6, by - 5, withAlpha(palette.cyan, 110), width + 14);
  line(ctx, ax, ay, bx, by, withAlpha(color, 80), width + 22);
  line(ctx, ax, ay, bx, by, palette.black, width + 9);
  line(ctx, ax, ay, bx, by, color, width);
  line(ctx, ax, ay, bx, by, withAlpha(palette.offWhite, 120), Math.max(2, width * 0.18));
}

function rect(ctx, x, y, w, h, color) {
  for (let py = y; py < y + h; py++) for (let px = x; px < x + w; px++) blendPixel(ctx.png, px, py, color);
}

function circle(ctx, cx, cy, radius, color, fill = true, width = 16) {
  const minX = Math.floor(cx - radius - width);
  const maxX = Math.ceil(cx + radius + width);
  const minY = Math.floor(cy - radius - width);
  const maxY = Math.ceil(cy + radius + width);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if ((fill && d <= radius) || (!fill && Math.abs(d - radius) <= width / 2)) {
        blendPixel(ctx.png, x, y, color);
      }
    }
  }
}

function ellipse(ctx, cx, cy, rx, ry, color, fill = true, width = 16) {
  const minX = Math.floor(cx - rx - width);
  const maxX = Math.ceil(cx + rx + width);
  const minY = Math.floor(cy - ry - width);
  const maxY = Math.ceil(cy + ry + width);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const nx = (x + 0.5 - cx) / rx;
      const ny = (y + 0.5 - cy) / ry;
      const d = Math.sqrt(nx * nx + ny * ny);
      if ((fill && d <= 1) || (!fill && Math.abs(d - 1) <= width / Math.max(rx, ry))) {
        blendPixel(ctx.png, x, y, color);
      }
    }
  }
}

function neonCircle(ctx, cx, cy, radius, color, fill = true, width = 18) {
  circle(ctx, cx - 4, cy + 4, radius, withAlpha(palette.pink, 90), fill, width + 18);
  circle(ctx, cx + 5, cy - 4, radius, withAlpha(palette.cyan, 90), fill, width + 14);
  circle(ctx, cx, cy, radius, palette.black, fill, fill ? 0 : width + 10);
  circle(ctx, cx, cy, radius, color, fill, width);
}

function neonEllipse(ctx, cx, cy, rx, ry, color, fill = false, width = 22) {
  ellipse(ctx, cx - 4, cy + 4, rx, ry, withAlpha(palette.pink, 95), fill, width + 18);
  ellipse(ctx, cx + 5, cy - 5, rx, ry, withAlpha(palette.cyan, 95), fill, width + 14);
  ellipse(ctx, cx, cy, rx, ry, palette.black, fill, width + 10);
  ellipse(ctx, cx, cy, rx, ry, color, fill, width);
}

function polygon(ctx, points, color) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const minX = Math.floor(Math.min(...xs));
  const maxX = Math.ceil(Math.max(...xs));
  const minY = Math.floor(Math.min(...ys));
  const maxY = Math.ceil(Math.max(...ys));
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      let inside = false;
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const xi = points[i][0], yi = points[i][1];
        const xj = points[j][0], yj = points[j][1];
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      }
      if (inside) blendPixel(ctx.png, x, y, color);
    }
  }
}

function neonPolygon(ctx, points, color, width = 16) {
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    line(ctx, a[0] - 4, a[1] + 4, b[0] - 4, b[1] + 4, withAlpha(palette.pink, 80), width + 18);
    line(ctx, a[0] + 5, a[1] - 5, b[0] + 5, b[1] - 5, withAlpha(palette.cyan, 80), width + 14);
    line(ctx, a[0], a[1], b[0], b[1], palette.black, width + 10);
  }
  polygon(ctx, points, color);
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    line(ctx, a[0], a[1], b[0], b[1], palette.black, width + 5);
    line(ctx, a[0], a[1], b[0], b[1], color, width);
  }
}

const segments = {
  0: ['a', 'b', 'c', 'd', 'e', 'f'],
  1: ['b', 'c'],
  2: ['a', 'b', 'g', 'e', 'd'],
  3: ['a', 'b', 'g', 'c', 'd'],
  4: ['f', 'g', 'b', 'c'],
  5: ['a', 'f', 'g', 'c', 'd'],
  6: ['a', 'f', 'g', 'e', 'c', 'd'],
  7: ['a', 'b', 'c'],
  8: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
  9: ['a', 'b', 'c', 'd', 'f', 'g'],
};

function segmentDigit(ctx, digit, x, y, scale, color) {
  const t = 12 * scale;
  const w = 58 * scale;
  const h = 106 * scale;
  const map = {
    a: [x + t, y, w - 2 * t, t],
    b: [x + w - t, y + t, t, h / 2 - t],
    c: [x + w - t, y + h / 2, t, h / 2 - t],
    d: [x + t, y + h - t, w - 2 * t, t],
    e: [x, y + h / 2, t, h / 2 - t],
    f: [x, y + t, t, h / 2 - t],
    g: [x + t, y + h / 2 - t / 2, w - 2 * t, t],
  };
  for (const s of segments[digit]) {
    const [rx, ry, rw, rh] = map[s];
    rect(ctx, Math.round(rx), Math.round(ry), Math.round(rw), Math.round(rh), color);
  }
}

function glyph(ctx, char, x, y, scale, color) {
  const w = 42 * scale;
  const h = 58 * scale;
  const t = 10 * scale;
  if (/\d/.test(char)) return segmentDigit(ctx, Number(char), x, y - 18 * scale, 0.62 * scale, color);
  if (char === 'K') {
    line(ctx, x, y, x, y + h, color, t);
    line(ctx, x + w, y, x + 8 * scale, y + h / 2, color, t);
    line(ctx, x + 8 * scale, y + h / 2, x + w, y + h, color, t);
  } else if (char === 'G') {
    line(ctx, x + w, y + 8 * scale, x + 10 * scale, y + 8 * scale, color, t);
    line(ctx, x + 8 * scale, y + 8 * scale, x + 8 * scale, y + h - 8 * scale, color, t);
    line(ctx, x + 8 * scale, y + h - 8 * scale, x + w, y + h - 8 * scale, color, t);
    line(ctx, x + w, y + h - 8 * scale, x + w, y + h / 2, color, t);
    line(ctx, x + w, y + h / 2, x + w - 18 * scale, y + h / 2, color, t);
  } else if (char === 'X') {
    line(ctx, x, y, x + w, y + h, color, t);
    line(ctx, x + w, y, x, y + h, color, t);
  }
}

function label(ctx, text, x, y, scale, color) {
  let cursor = x;
  for (const ch of text) {
    glyph(ctx, ch, cursor, y, scale, color);
    cursor += (/\d/.test(ch) ? 40 : 48) * scale;
  }
}

function grunge(ctx, amount = 480) {
  const { png, rand } = ctx;
  for (let i = 0; i < amount; i++) {
    const x = Math.floor(rand() * SIZE);
    const y = Math.floor(rand() * SIZE);
    const idx = (SIZE * y + x) << 2;
    if (png.data[idx + 3] > 0) {
      const cut = 45 + rand() * 135;
      png.data[idx + 3] = Math.max(0, png.data[idx + 3] - cut);
      if (rand() > 0.75) {
        blendPixel(png, x + 1, y, withAlpha(palette.black, 80));
        blendPixel(png, x, y + 1, withAlpha(palette.black, 80));
      }
    } else if (rand() > 0.82) {
      const color = rand() > 0.5 ? palette.pink : palette.cyan;
      blendPixel(png, x, y, withAlpha(color, 70));
    }
  }
}

function save(name, draw, seed) {
  const ctx = create(seed);
  draw(ctx);
  grunge(ctx);
  const out = path.join(ROOT, 'assets/icons', name);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, PNG.sync.write(ctx.png));
}

function kettlebell(ctx, weight, color) {
  neonEllipse(ctx, 256, 155, 108, 86, color, false, 34);
  neonCircle(ctx, 256, 300, 118, color, true);
  ellipse(ctx, 256, 148, 68, 42, palette.bg, true);
  if (weight) {
    const text = String(weight);
    const start = text.length === 1 ? 218 : 190;
    for (let i = 0; i < text.length; i++) segmentDigit(ctx, Number(text[i]), start + i * 64, 245, 0.95, palette.black);
    label(ctx, 'KG', 214, 345, 0.7, palette.black);
  }
}

const iconDrawers = {
  'equipment/pull-up-bar.png': (ctx) => {
    neonLine(ctx, 110, 380, 126, 190, palette.yellow, 28);
    neonLine(ctx, 386, 380, 370, 190, palette.yellow, 28);
    neonLine(ctx, 120, 194, 218, 124, palette.yellow, 25);
    neonLine(ctx, 218, 124, 350, 126, palette.yellow, 25);
    neonLine(ctx, 126, 190, 372, 190, palette.cyan, 14);
    neonLine(ctx, 84, 394, 158, 394, palette.yellow, 22);
    neonLine(ctx, 342, 394, 416, 394, palette.yellow, 22);
  },
  'equipment/dip-bars.png': (ctx) => {
    neonLine(ctx, 130, 356, 130, 176, palette.cyan, 28);
    neonLine(ctx, 130, 176, 252, 176, palette.cyan, 28);
    neonLine(ctx, 252, 176, 252, 356, palette.cyan, 28);
    neonLine(ctx, 262, 360, 262, 216, palette.cyan, 28);
    neonLine(ctx, 262, 216, 390, 216, palette.cyan, 28);
    neonLine(ctx, 390, 216, 390, 360, palette.cyan, 28);
    neonLine(ctx, 86, 386, 294, 386, palette.pink, 19);
    neonLine(ctx, 230, 418, 430, 418, palette.pink, 19);
  },
  'equipment/rings.png': (ctx) => {
    neonLine(ctx, 184, 80, 184, 235, palette.yellow, 24);
    neonLine(ctx, 328, 80, 328, 235, palette.yellow, 24);
    neonEllipse(ctx, 184, 305, 58, 78, palette.pink, false, 22);
    neonEllipse(ctx, 328, 305, 58, 78, palette.pink, false, 22);
    neonLine(ctx, 162, 88, 205, 150, palette.cyan, 9);
    neonLine(ctx, 306, 88, 350, 150, palette.cyan, 9);
  },
  'equipment/resistance-bands.png': (ctx) => {
    neonEllipse(ctx, 256, 280, 150, 88, palette.pink, false, 42);
    neonLine(ctx, 154, 232, 342, 135, palette.pink, 34);
    neonLine(ctx, 170, 352, 370, 250, palette.cyan, 20);
  },
  'equipment/bodyweight.png': (ctx) => {
    neonCircle(ctx, 256, 95, 46, palette.cyan, true);
    neonLine(ctx, 256, 150, 256, 300, palette.cyan, 34);
    neonLine(ctx, 158, 188, 354, 188, palette.yellow, 25);
    neonLine(ctx, 230, 300, 184, 430, palette.yellow, 28);
    neonLine(ctx, 282, 300, 330, 430, palette.cyan, 28);
  },
  'kettlebells/kb-generic.png': (ctx) => kettlebell(ctx, null, palette.pink),
  'kettlebells/kb-12.png': (ctx) => kettlebell(ctx, 12, palette.cyan),
  'kettlebells/kb-16.png': (ctx) => kettlebell(ctx, 16, palette.pink),
  'kettlebells/kb-20.png': (ctx) => kettlebell(ctx, 20, palette.yellow),
  'kettlebells/kb-24.png': (ctx) => kettlebell(ctx, 24, palette.cyan),
  'kettlebells/qty-1x.png': (ctx) => {
    circle(ctx, 256, 256, 160, palette.bg, true);
    neonCircle(ctx, 256, 256, 160, palette.pink, false, 20);
    label(ctx, '1X', 172, 206, 1.7, palette.yellow);
  },
  'kettlebells/qty-2x.png': (ctx) => {
    circle(ctx, 256, 256, 160, palette.bg, true);
    neonCircle(ctx, 256, 256, 160, palette.pink, false, 20);
    label(ctx, '2X', 154, 206, 1.7, palette.cyan);
  },
  'action/start-workout.png': (ctx) => neonPolygon(ctx, [[164, 118], [164, 394], [388, 256]], palette.pink, 18),
  'action/swap-exercise.png': (ctx) => {
    neonLine(ctx, 144, 190, 360, 190, palette.cyan, 34);
    neonPolygon(ctx, [[128, 190], [214, 126], [214, 254]], palette.cyan, 14);
    neonLine(ctx, 368, 320, 152, 320, palette.pink, 34);
    neonPolygon(ctx, [[384, 320], [298, 256], [298, 384]], palette.pink, 14);
  },
  'action/add.png': (ctx) => {
    neonLine(ctx, 256, 116, 256, 396, palette.cyan, 58);
    neonLine(ctx, 116, 256, 396, 256, palette.cyan, 58);
  },
  'action/remove.png': (ctx) => {
    neonLine(ctx, 152, 152, 360, 360, palette.pink, 52);
    neonLine(ctx, 360, 152, 152, 360, palette.pink, 52);
  },
  'action/complete.png': (ctx) => {
    neonLine(ctx, 130, 268, 220, 356, palette.yellow, 48);
    neonLine(ctx, 220, 356, 386, 152, palette.yellow, 48);
  },
  'action/skill-focus.png': (ctx) => {
    neonPolygon(ctx, [[256, 70], [306, 192], [438, 202], [336, 288], [370, 420], [256, 348], [142, 420], [176, 288], [74, 202], [206, 192]], palette.yellow, 14);
  },
  'nav/today.png': (ctx) => {
    neonLine(ctx, 120, 152, 392, 152, palette.pink, 26);
    neonLine(ctx, 140, 118, 140, 396, palette.pink, 24);
    neonLine(ctx, 372, 118, 372, 396, palette.pink, 24);
    neonLine(ctx, 120, 396, 392, 396, palette.pink, 26);
    neonLine(ctx, 190, 92, 190, 158, palette.cyan, 24);
    neonLine(ctx, 322, 92, 322, 158, palette.cyan, 24);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) rect(ctx, 170 + c * 70, 214 + r * 52, 40, 32, r + c === 2 ? palette.cyan : palette.pink);
  },
  'nav/history.png': (ctx) => {
    neonCircle(ctx, 256, 256, 150, palette.cyan, false, 24);
    neonLine(ctx, 256, 256, 256, 160, palette.pink, 24);
    neonLine(ctx, 256, 256, 330, 300, palette.pink, 24);
  },
  'nav/progress.png': (ctx) => {
    neonLine(ctx, 104, 386, 408, 386, palette.pink, 18);
    neonLine(ctx, 154, 386, 154, 288, palette.cyan, 48);
    neonLine(ctx, 230, 386, 230, 220, palette.pink, 48);
    neonLine(ctx, 306, 386, 306, 158, palette.cyan, 48);
    neonLine(ctx, 382, 386, 382, 98, palette.yellow, 48);
  },
  'nav/coach.png': (ctx) => {
    neonCircle(ctx, 256, 256, 140, palette.cyan, false, 24);
    neonCircle(ctx, 256, 256, 46, palette.pink, true);
    neonLine(ctx, 256, 68, 256, 152, palette.cyan, 22);
    neonLine(ctx, 256, 360, 256, 444, palette.cyan, 22);
    neonLine(ctx, 68, 256, 152, 256, palette.cyan, 22);
    neonLine(ctx, 360, 256, 444, 256, palette.cyan, 22);
  },
  'nav/kit.png': (ctx) => kettlebell(ctx, null, palette.yellow),
};

let seed = 100;
for (const [name, draw] of Object.entries(iconDrawers)) save(name, draw, seed++);
