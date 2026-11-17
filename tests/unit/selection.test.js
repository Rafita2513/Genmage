import test from 'node:test';
import assert from 'node:assert/strict';
import { planSegments, candidateTimes, pickBest } from '../../src/selection.js';

test('planSegments(60, 10) da 10 tramos de 6 s sin huecos', () => {
  const segs = planSegments(60, 10);
  assert.equal(segs.length, 10);
  segs.forEach((s, i) => {
    assert.equal(s.index, i);
    assert.ok(Math.abs(s.end - s.start - 6) < 1e-9);
    if (i > 0) assert.equal(s.start, segs[i - 1].end);
  });
  assert.equal(segs[0].start, 0);
  assert.equal(segs[9].end, 60);
});

test('planSegments(7, 3) cubre exactamente 7 s', () => {
  const segs = planSegments(7, 3);
  assert.equal(segs.length, 3);
  assert.equal(segs[0].start, 0);
  assert.ok(Math.abs(segs[2].end - 7) < 1e-9);
});

test('candidateTimes equiespaciados y estrictamente dentro del tramo', () => {
  assert.deepEqual(candidateTimes({ index: 0, start: 0, end: 6 }, 5), [1, 2, 3, 4, 5]);
  const times = candidateTimes({ index: 2, start: 10, end: 12 }, 6);
  assert.equal(times.length, 6);
  for (const t of times) assert.ok(t > 10 && t < 12);
});

test('pickBest elige la mayor puntuación', () => {
  const best = pickBest([
    { time: 1, score: 3 },
    { time: 2, score: 9 },
    { time: 3, score: 5 },
  ]);
  assert.deepEqual(best, { time: 2, score: 9 });
});

test('pickBest desempata por el tiempo más temprano', () => {
  const best = pickBest([
    { time: 2, score: 0 },
    { time: 1, score: 0 },
  ]);
  assert.equal(best.time, 1);
});

test('pickBest con lista vacía lanza RangeError', () => {
  assert.throws(() => pickBest([]), RangeError);
});
