import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCropSetting, saveCropSetting } from '../../src/settings.js';

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
  };
}

test('sin valor guardado, el recorte está activado', () => {
  assert.equal(loadCropSetting(memoryStorage()), true);
});

test('guardar false y leer devuelve false', () => {
  const s = memoryStorage();
  saveCropSetting(false, s);
  assert.equal(loadCropSetting(s), false);
});

test('guardar true y leer devuelve true', () => {
  const s = memoryStorage();
  saveCropSetting(false, s);
  saveCropSetting(true, s);
  assert.equal(loadCropSetting(s), true);
});

test('si getItem lanza, vale true', () => {
  const s = {
    getItem() {
      throw new Error('bloqueado');
    },
  };
  assert.equal(loadCropSetting(s), true);
});

test('si setItem lanza, no falla', () => {
  const s = {
    setItem() {
      throw new Error('lleno');
    },
  };
  assert.doesNotThrow(() => saveCropSetting(false, s));
});

test('sin almacenamiento, vale true y guardar no falla', () => {
  assert.equal(loadCropSetting(null), true);
  assert.doesNotThrow(() => saveCropSetting(false, null));
});
