import test from 'node:test';
import assert from 'node:assert/strict';
import { detectBlackBorders, toPixelRect } from '../../src/crop.js';

const W = 40;
const H = 60;

/** Fotograma gris 128 con franjas negras (filas/columnas a 0). */
function frame({ top = 0, bottom = 0, left = 0, right = 0 } = {}, tweak) {
  const data = new Uint8ClampedArray(W * H).fill(128);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (y < top || y >= H - bottom || x < left || x >= W - right) data[y * W + x] = 0;
    }
  }
  tweak?.(data);
  return { data, width: W, height: H };
}

const two = (opts) => [frame(opts), frame(opts)];
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≠ ${expected}`);

test('barras arriba y abajo', () => {
  const r = detectBlackBorders(two({ top: 10, bottom: 10 }));
  near(r.x, 0);
  near(r.width, 1);
  near(r.y, 11 / 60);
  near(r.height, 38 / 60);
});

test('barras a izquierda y derecha', () => {
  const r = detectBlackBorders(two({ left: 6, right: 6 }));
  near(r.x, 7 / 40);
  near(r.width, 26 / 40);
  near(r.y, 0);
  near(r.height, 1);
});

test('franja solo arriba: se recorta solo ese lado', () => {
  const r = detectBlackBorders(two({ top: 10 }));
  near(r.y, 11 / 60);
  near(r.height, 49 / 60);
  near(r.x, 0);
  near(r.width, 1);
});

test('sin franjas → null', () => {
  assert.equal(detectBlackBorders(two({})), null);
});

test('todo negro → null', () => {
  assert.equal(detectBlackBorders(two({ top: 60 })), null);
});

test('lista vacía → null', () => {
  assert.equal(detectBlackBorders([]), null);
});

test('una sola fila negra (menos del 2 %) se ignora', () => {
  assert.equal(detectBlackBorders(two({ top: 1 })), null);
});

test('si la zona útil queda por debajo del 50 % no se recorta', () => {
  assert.equal(detectBlackBorders(two({ top: 20, bottom: 20 })), null);
});

test('una fila con 97,5 % oscuro no cuenta como borde', () => {
  const withSpeck = () =>
    frame({ top: 10 }, (data) => {
      data[0] = 255; // 1 píxel brillante en la fila 0
    });
  // La fila 0 deja de ser borde, así que el borde superior es 0 → nada que recortar.
  assert.equal(detectBlackBorders([withSpeck(), withSpeck()]), null);
});

test('solo cuenta como borde lo que es oscuro en todos los fotogramas', () => {
  const a = frame({ top: 10 });
  const b = frame({ top: 10 }, (data) => {
    for (let x = 0; x < W; x++) data[5 * W + x] = 255; // fila 5 brillante
  });
  const r = detectBlackBorders([a, b]);
  near(r.y, 6 / 60);
});

test('toPixelRect(null) devuelve el fotograma completo', () => {
  assert.deepEqual(toPixelRect(null, 1080, 1920), { sx: 0, sy: 0, sw: 1080, sh: 1920 });
});

test('toPixelRect convierte fracciones a píxeles enteros', () => {
  assert.deepEqual(
    toPixelRect({ x: 0.25, y: 0, width: 0.5, height: 1 }, 1080, 1920),
    { sx: 270, sy: 0, sw: 540, sh: 1920 },
  );
});
