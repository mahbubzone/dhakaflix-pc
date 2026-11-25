/**
 * Generate build/icon.ico for the NSIS installer.
 *
 * The mark is a dark rounded square with a red gradient "D" and a white play
 * cutout: branded, legible down to 16 px, and drawn with 4x supersampling so
 * the edges stay smooth. No external dependencies, no binary assets in the
 * repo.
 *
 * Usage: node scripts/make-icon.js
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZES = [16, 24, 32, 48, 64, 128, 256];
const SS = 4; // supersampling factor

/** Signed distance from a point to a rounded rectangle, in pixels. */
function roundedRectDistance(x, y, w, h, radius) {
  const halfW = w / 2;
  const halfH = h / 2;
  const dx = Math.abs(x - halfW) - (halfW - radius);
  const dy = Math.abs(y - halfH) - (halfH - radius);
  const outside = Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
  return outside + Math.min(Math.max(dx, dy), 0) - radius;
}

/** Barycentric test for the play triangle. */
function inTriangle(px, py, ax, ay, bx, by, cx, cy) {
  const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by);
  const d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy);
  const d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

function mix(a, b, t) {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

/** Render one size to an RGBA buffer. */
function render(size) {
  const big = size * SS;
  const out = Buffer.alloc(size * size * 4);

  // Geometry in supersampled pixels.
  const radius = big * 0.22;
  const stemX0 = big * 0.245;
  const stemY0 = big * 0.225;
  const stemX1 = big * 0.365;
  const stemY1 = big * 0.775;
  const stemRadius = big * 0.05;
  const bowlX = big * 0.425;
  const bowlY = big * 0.5;
  const bowlOuter = big * 0.285;
  const bowlInner = big * 0.165;
  const showPlay = size >= 32;

  const bgTop = [17, 21, 31];
  const bgBottom = [5, 6, 9];
  const dTop = [255, 94, 119];
  const dBottom = [214, 20, 55];

  const acc = new Float64Array(size * size * 4);

  for (let sy = 0; sy < big; sy++) {
    for (let sx = 0; sx < big; sx++) {
      const px = sx + 0.5;
      const py = sy + 0.5;
      const inBox = roundedRectDistance(px, py, big, big, radius) <= 0;
      if (!inBox) continue;

      const nx = px / big;
      const ny = py / big;

      // Background: dark gradient with a red glow behind the mark.
      let colour = mix(bgTop, bgBottom, ny);
      const glow = Math.max(0, 1 - Math.hypot(nx - 0.42, ny - 0.5) / 0.72);
      colour = mix(colour, [120, 12, 30], glow * 0.5);

      const inStem = roundedRectDistance(
        px - stemX0, py - stemY0,
        stemX1 - stemX0, stemY1 - stemY0,
        stemRadius
      ) <= 0;

      const bowlDist = Math.hypot(px - bowlX, py - bowlY);
      const inBowl = px >= bowlX && bowlDist <= bowlOuter && bowlDist >= bowlInner;

      if (inStem || inBowl) {
        colour = mix(dTop, dBottom, ny);
      }

      if (showPlay && inTriangle(
        px, py,
        big * 0.455, big * 0.405,
        big * 0.455, big * 0.595,
        big * 0.59, big * 0.5
      )) {
        colour = [255, 255, 255];
      }

      const i = (Math.floor(sy / SS) * size + Math.floor(sx / SS)) * 4;
      acc[i] += colour[0];
      acc[i + 1] += colour[1];
      acc[i + 2] += colour[2];
      acc[i + 3] += 255;
    }
  }

  // Average the supersampled samples. Samples outside the rounded box leave
  // the alpha at 0, which is what produces the antialiased corner.
  const perPixel = SS * SS;
  for (let p = 0; p < size * size; p++) {
    const i = p * 4;
    const alpha = acc[i + 3] / perPixel;
    if (alpha === 0) continue;

    // Un-premultiply so the colour stays correct on partially covered pixels.
    const coverage = acc[i + 3] / 255;
    out[i] = Math.round(acc[i] / coverage);
    out[i + 1] = Math.round(acc[i + 1] / coverage);
    out[i + 2] = Math.round(acc[i + 2] / coverage);
    out[i + 3] = Math.round(alpha);
  }

  return out;
}

// ---------------------------------------------------------------------------
// PNG encoding
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filtering
  ihdr[12] = 0; // no interlace

  // Each scanline is prefixed with filter type 0 (None).
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0;
    rgba.copy(raw, rowStart + 1, y * size * 4, (y + 1) * size * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// ICO container
// ---------------------------------------------------------------------------

function buildIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);            // reserved
  header.writeUInt16LE(1, 2);            // type: icon
  header.writeUInt16LE(images.length, 4);

  const entries = [];
  let offset = 6 + images.length * 16;

  for (const { size, png } of images) {
    const entry = Buffer.alloc(16);
    entry[0] = size >= 256 ? 0 : size;   // width, 0 means 256
    entry[1] = size >= 256 ? 0 : size;   // height
    entry[2] = 0;                        // palette size
    entry[3] = 0;                        // reserved
    entry.writeUInt16LE(1, 4);           // colour planes
    entry.writeUInt16LE(32, 6);          // bits per pixel
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += png.length;
  }

  return Buffer.concat([header, ...entries, ...images.map((i) => i.png)]);
}

// ---------------------------------------------------------------------------

const images = SIZES.map((size) => ({ size, png: encodePng(size, render(size)) }));

const outDir = path.join(__dirname, '..', 'build');
fs.mkdirSync(outDir, { recursive: true });

const icoPath = path.join(outDir, 'icon.ico');
fs.writeFileSync(icoPath, buildIco(images));

// A 256 px PNG is handy for the README and for the updater metadata.
fs.writeFileSync(path.join(outDir, 'icon.png'), images[images.length - 1].png);

console.log(`wrote ${icoPath} (${SIZES.join(', ')} px)`);
console.log(`wrote ${path.join(outDir, 'icon.png')}`);
