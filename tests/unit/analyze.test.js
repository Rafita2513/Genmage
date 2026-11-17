import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeVideo, CANDIDATES_PER_SEGMENT, CROP_SAMPLES } from '../../src/analyze.js';
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

// --- Recorte de bordes negros ---

function barsFrame(withBars) {
  const w = 16;
  const h = 24;
  const data = new Uint8ClampedArray(w * h).fill(128);
  if (withBars) {
    for (let y = 0; y < h; y++) {
      if (y < 4 || y >= h - 4) data.fill(0, y * w, (y + 1) * w);
    }
  }
  return { data, width: w, height: h };
}

function barsSource({ withBars = true, hasSetCrop = true } = {}) {
  const log = [];
  const source = {
    duration: 12,
    log,
    async grayAt() {
      log.push('gray');
      return barsFrame(withBars);
    },
    async jpegAt() {
      log.push('jpeg');
      return new Blob(['x']);
    },
  };
  if (hasSetCrop) source.setCrop = (rect) => log.push({ crop: rect });
  return source;
}

test('cropBorders: detecta franjas y llama a setCrop una vez, antes de extraer fotos', async () => {
  const src = barsSource();
  await analyzeVideo(src, { cropBorders: true });
  const crops = src.log.filter((e) => typeof e === 'object');
  assert.equal(crops.length, 1);
  assert.ok(crops[0].crop && crops[0].crop.height < 1);
  assert.ok(src.log.indexOf(crops[0]) < src.log.indexOf('jpeg'));
  assert.equal(src.log.slice(0, CROP_SAMPLES).every((e) => e === 'gray'), true);
});

test('cropBorders sin franjas: setCrop(null)', async () => {
  const src = barsSource({ withBars: false });
  await analyzeVideo(src, { cropBorders: true });
  const crops = src.log.filter((e) => typeof e === 'object');
  assert.equal(crops.length, 1);
  assert.equal(crops[0].crop, null);
});

test('sin cropBorders no se llama a setCrop', async () => {
  const src = barsSource();
  await analyzeVideo(src);
  assert.equal(src.log.some((e) => typeof e === 'object'), false);
});

test('cropBorders con la señal abortada rechaza sin recortar ni extraer', async () => {
  const src = barsSource();
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(analyzeVideo(src, { cropBorders: true, signal: controller.signal }), {
    name: 'AbortError',
  });
  assert.equal(src.log.some((e) => typeof e === 'object' || e === 'jpeg'), false);
});

test('cropBorders con una fuente sin setCrop no falla', async () => {
  const src = barsSource({ hasSetCrop: false });
  const snaps = await analyzeVideo(src, { cropBorders: true });
  assert.equal(snaps.length, 10);
});
