import test from 'node:test';
import assert from 'node:assert/strict';
import { fitWithin, MAX_CANVAS_PIXELS } from '../../src/frames.js';

test('1920×1080 cabe y no cambia', () => {
  assert.deepEqual(fitWithin(1920, 1080, MAX_CANVAS_PIXELS), { width: 1920, height: 1080 });
});

test('4K cabe y no cambia', () => {
  assert.deepEqual(fitWithin(3840, 2160, MAX_CANVAS_PIXELS), { width: 3840, height: 2160 });
});

test('8K se reduce al tope manteniendo la proporción 16:9', () => {
  const { width, height } = fitWithin(7680, 4320, MAX_CANVAS_PIXELS);
  assert.ok(width * height <= MAX_CANVAS_PIXELS);
  assert.ok(Math.abs(width / height - 16 / 9) < 0.01);
});

test('un vídeo vertical sigue siendo vertical', () => {
  const { width, height } = fitWithin(4320, 7680, MAX_CANVAS_PIXELS);
  assert.ok(height > width);
  assert.ok(width * height <= MAX_CANVAS_PIXELS);
});
