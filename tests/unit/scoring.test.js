import test from 'node:test';
import assert from 'node:assert/strict';
import { sharpness, exposureFactor, frameScore } from '../../src/scoring.js';

const SIZE = 32;

function frame(fn) {
  const data = new Uint8ClampedArray(SIZE * SIZE);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) data[y * SIZE + x] = fn(x, y);
  }
  return { data, width: SIZE, height: SIZE };
}

const flat = (v) => frame(() => v);
const checker = (a, b) => frame((x, y) => ((x + y) % 2 === 0 ? a : b));
const gradient = () => frame((x) => Math.round((x / (SIZE - 1)) * 255));

test('un fotograma plano tiene nitidez 0', () => {
  assert.equal(sharpness(flat(128)), 0);
});

test('ajedrez > degradado > plano en nitidez', () => {
  const c = sharpness(checker(0, 255));
  const g = sharpness(gradient());
  const f = sharpness(flat(128));
  assert.ok(c > g, `ajedrez ${c} debería superar degradado ${g}`);
  assert.ok(g >= f, `degradado ${g} debería ser >= plano ${f}`);
});

test('exposureFactor: negro y blanco totales son 0, gris medio es 1', () => {
  assert.equal(exposureFactor(flat(0)), 0);
  assert.equal(exposureFactor(flat(255)), 0);
  assert.equal(exposureFactor(flat(128)), 1);
});

test('frameScore: ajedrez 0/255 (todo recortado) es 0 y ajedrez 100/150 es > 0', () => {
  assert.equal(frameScore(checker(0, 255)), 0);
  assert.ok(frameScore(checker(100, 150)) > 0);
});

test('frameScore de negro total es 0', () => {
  assert.equal(frameScore(flat(0)), 0);
});
