import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeVideo, CANDIDATES_PER_SEGMENT } from '../../src/analyze.js';
import { photoCountFor } from '../../src/photoCount.js';
import { planSegments, candidateTimes } from '../../src/selection.js';

const SIZE = 16;

function makeFrame(kind) {
  const data = new Uint8ClampedArray(SIZE * SIZE);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (kind === 'sharp') data[y * SIZE + x] = (x + y) % 2 === 0 ? 100 : 150;
      else if (kind === 'black') data[y * SIZE + x] = 0;
      else data[y * SIZE + x] = 128;
    }
  }
  return { data, width: SIZE, height: SIZE };
}

/** El candidato central de cada tramo es el único nítido. */
function goodTimeOf(segment) {
  const times = candidateTimes(segment, CANDIDATES_PER_SEGMENT);
  return times[Math.floor(times.length / 2)];
}

function fakeSource(duration, { blackSegments = [] } = {}) {
  const count = photoCountFor(duration);
  const segments = planSegments(duration, count);
  const calls = { jpeg: [] };
  return {
    duration,
    calls,
    segments,
    async grayAt(t) {
      const seg = segments.find((s) => t > s.start && t < s.end);
      if (blackSegments.includes(seg.index)) return makeFrame('black');
      return Math.abs(t - goodTimeOf(seg)) < 1e-9 ? makeFrame('sharp') : makeFrame('flat');
    },
    async jpegAt(t) {
      calls.jpeg.push(t);
      return new Blob([String(t)]);
    },
  };
}

test('60 s → 10 snapshots', async () => {
  const snaps = await analyzeVideo(fakeSource(60));
  assert.equal(snaps.length, 10);
});

test('3 s → 3 snapshots', async () => {
  const snaps = await analyzeVideo(fakeSource(3));
  assert.equal(snaps.length, 3);
});

test('cada snapshot es el fotograma bueno de su tramo, en orden temporal', async () => {
  const src = fakeSource(60);
  const snaps = await analyzeVideo(src);
  snaps.forEach((s, i) => {
    assert.ok(Math.abs(s.time - goodTimeOf(src.segments[i])) < 1e-9);
    if (i > 0) assert.ok(s.time > snaps[i - 1].time);
  });
  assert.equal(new Set(snaps.map((s) => s.id)).size, snaps.length);
});

test('onProgress se llama una vez por tramo hasta el total', async () => {
  const seen = [];
  await analyzeVideo(fakeSource(60), { onProgress: (done, total) => seen.push([done, total]) });
  assert.equal(seen.length, 10);
  seen.forEach(([done, total], i) => {
    assert.equal(done, i + 1);
    assert.equal(total, 10);
  });
});

test('un tramo entero negro no rompe y devuelve el candidato más temprano', async () => {
  const src = fakeSource(60, { blackSegments: [4] });
  const snaps = await analyzeVideo(src);
  assert.equal(snaps.length, 10);
  const earliest = candidateTimes(src.segments[4], CANDIDATES_PER_SEGMENT)[0];
  assert.ok(Math.abs(snaps[4].time - earliest) < 1e-9);
});

test('con la señal ya abortada rechaza con AbortError sin extraer nada', async () => {
  const src = fakeSource(60);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(analyzeVideo(src, { signal: controller.signal }), { name: 'AbortError' });
  assert.equal(src.calls.jpeg.length, 0);
});
