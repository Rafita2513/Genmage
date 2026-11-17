// Genera los iconos PNG de la app sin dependencias (solo node:zlib).
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const BG = [24, 24, 27];
const FG = [250, 250, 250];
const ACCENT = [250, 204, 21];

function crc32(buf) {
  let c;
  let crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  const frame = size * 0.22; // margen del marco
  const stroke = Math.max(2, size * 0.06);
  const dot = size * 0.09;
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0; // filtro: ninguno
    for (let x = 0; x < size; x++) {
      const inOuter = x >= frame && x < size - frame && y >= frame && y < size - frame;
      const inInner =
        x >= frame + stroke && x < size - frame - stroke &&
        y >= frame + stroke && y < size - frame - stroke;
      const inDot = Math.hypot(x - size * 0.5, y - size * 0.5) < dot;
      const color = inDot ? ACCENT : inOuter && !inInner ? FG : BG;
      raw.set(color, y * (size * 3 + 1) + 1 + x * 3);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // profundidad
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(new URL('../icons/', import.meta.url), { recursive: true });
for (const [name, size] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
]) {
  writeFileSync(new URL(`../icons/${name}`, import.meta.url), png(size));
}
console.log('Iconos generados en icons/');
