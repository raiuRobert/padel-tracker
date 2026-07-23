/**
 * Draws the app icons and writes them as PNGs.
 *
 * Done procedurally with a tiny encoder rather than by adding an image library: the artwork is a
 * circle and two arcs, and this keeps the icons reproducible from source with no dependency and no
 * binary blob that nobody can regenerate.
 *
 *   node scripts/generate-icons.mjs
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public");

const CANVAS = [11, 15, 20]; // #0b0f14, the app background
const BALL = [154, 230, 0]; // #9ae600, the accent

// -- PNG encoding ------------------------------------------------------------

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

function encodePng(size, pixels) {
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // no per-scanline filter
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // truecolour with alpha

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// -- Drawing -----------------------------------------------------------------

/** Signed distance to a rounded square, negative inside. */
function roundedSquare(x, y, size, radius) {
  const dx = Math.abs(x - size / 2) - (size / 2 - radius);
  const dy = Math.abs(y - size / 2) - (size / 2 - radius);
  const outside = Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
  return outside + Math.min(Math.max(dx, dy), 0) - radius;
}

/**
 * A padel ball: a filled circle with the two seams that make it read as a ball rather than a dot.
 *
 * The seam is an arc of a circle centred slightly to the *opposite* side, so it bulges outward
 * towards the near rim — which is what a real seam does when you look a ball in the face. The two
 * constants are solved so the arc meets the ball's top and bottom exactly while crossing the
 * equator at 0.72R, keeping it hugging the edge instead of pinching the middle.
 *
 * One seam rather than two: at 192px a second arc closes a lens shape in the centre and the whole
 * thing starts reading as a rugby ball.
 */
const SEAM_OFFSET = 0.334; // × R, centre of the arc's circle
const SEAM_RADIUS = 1.054; // × R, radius of that circle

function shade(x, y, size, ballScale) {
  const cx = size / 2;
  const cy = size / 2;
  const R = size * ballScale;

  if (Math.hypot(x - cx, y - cy) > R) return null;

  const distance = Math.abs(Math.hypot(x - (cx + SEAM_OFFSET * R), y - cy) - SEAM_RADIUS * R);
  return distance < R * 0.075 ? CANVAS : BALL;
}

/** 3x supersampling — cheap, and the alternative is visibly jagged at 192px. */
function draw(size, { maskable = false } = {}) {
  const pixels = Buffer.alloc(size * size * 4);
  const radius = maskable ? 0 : size * 0.22;
  const ballScale = maskable ? 0.26 : 0.31; // maskable icons lose their corners, so sit further in
  const samples = 3;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const px = x + (sx + 0.5) / samples;
          const py = y + (sy + 0.5) / samples;

          if (!maskable && roundedSquare(px, py, size, radius) > 0) continue;
          const colour = shade(px, py, size, ballScale) ?? CANVAS;
          r += colour[0];
          g += colour[1];
          b += colour[2];
          a += 255;
        }
      }

      const total = samples * samples;
      const i = (y * size + x) * 4;
      // Un-premultiply so partly covered edge pixels keep their colour.
      pixels[i] = a === 0 ? 0 : Math.round((r / total) * (total / (a / 255)));
      pixels[i + 1] = a === 0 ? 0 : Math.round((g / total) * (total / (a / 255)));
      pixels[i + 2] = a === 0 ? 0 : Math.round((b / total) * (total / (a / 255)));
      pixels[i + 3] = Math.round(a / total);
    }
  }
  return encodePng(size, pixels);
}

mkdirSync(OUT, { recursive: true });

const icons = [
  ["icon-192.png", 192, {}],
  ["icon-512.png", 512, {}],
  ["icon-maskable-512.png", 512, { maskable: true }],
  ["apple-touch-icon.png", 180, { maskable: true }],
];

for (const [name, size, options] of icons) {
  writeFileSync(join(OUT, name), draw(size, options));
  console.log(`wrote public/${name} (${size}x${size})`);
}
