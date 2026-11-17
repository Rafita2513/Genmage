import test from 'node:test';
import assert from 'node:assert/strict';
import { fileNameFor, saveToPhotos } from '../../src/share.js';

test('fileNameFor: índice 1-based de 2 dígitos y tiempo en minutos y segundos', () => {
  assert.equal(fileNameFor(3, 102.4), 'genmage-03-01m42s.jpg');
  assert.equal(fileNameFor(12, 5), 'genmage-12-00m05s.jpg');
});

const files = [{ name: 'a.jpg' }];

test('saveToPhotos devuelve shared cuando la hoja se completa', async () => {
  const nav = { canShare: () => true, share: async () => {} };
  assert.equal(await saveToPhotos(files, nav), 'shared');
});

test('saveToPhotos devuelve cancelled si el usuario cierra la hoja', async () => {
  const nav = {
    canShare: () => true,
    share: async () => {
      throw new DOMException('x', 'AbortError');
    },
  };
  assert.equal(await saveToPhotos(files, nav), 'cancelled');
});

test('saveToPhotos devuelve unsupported si canShare dice que no', async () => {
  const nav = { canShare: () => false, share: async () => {} };
  assert.equal(await saveToPhotos(files, nav), 'unsupported');
});

test('saveToPhotos devuelve unsupported si no hay share', async () => {
  assert.equal(await saveToPhotos(files, {}), 'unsupported');
});

test('saveToPhotos devuelve unsupported si share falla por otra causa', async () => {
  const nav = {
    canShare: () => true,
    share: async () => {
      throw new Error('boom');
    },
  };
  assert.equal(await saveToPhotos(files, nav), 'unsupported');
});
