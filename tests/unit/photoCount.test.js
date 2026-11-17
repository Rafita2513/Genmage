import test from 'node:test';
import assert from 'node:assert/strict';
import { photoCountFor } from '../../src/photoCount.js';

test('un vídeo muy corto da una sola foto', () => {
  assert.equal(photoCountFor(0.4), 1);
});

test('máximo una foto por segundo en vídeos cortos', () => {
  assert.equal(photoCountFor(3), 3);
  assert.equal(photoCountFor(5), 5);
  assert.equal(photoCountFor(10), 10);
});

test('hasta 1:00 incluido son 10 fotos', () => {
  assert.equal(photoCountFor(45), 10);
  assert.equal(photoCountFor(60), 10);
});

test('60,03 s (se muestra como 1:00) sigue siendo 10 fotos', () => {
  assert.equal(photoCountFor(60.03), 10);
});

test('más de 1:00 y hasta 2:00 son 20 fotos', () => {
  assert.equal(photoCountFor(60.5), 20);
  assert.equal(photoCountFor(61), 20);
  assert.equal(photoCountFor(120), 20);
});

test('sigue de 10 en 10 por minuto', () => {
  assert.equal(photoCountFor(121), 30);
});

test('tope de 100 fotos', () => {
  assert.equal(photoCountFor(600), 100);
  assert.equal(photoCountFor(3600), 100);
});

test('duración inválida lanza RangeError', () => {
  for (const bad of [NaN, 0, -1, Infinity]) {
    assert.throws(() => photoCountFor(bad), RangeError);
  }
});
