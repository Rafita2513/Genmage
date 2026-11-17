import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

for (const [file, size] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
]) {
  test(`${file} es un PNG de ${size}×${size}`, () => {
    const buf = readFileSync(new URL(`../../icons/${file}`, import.meta.url));
    assert.ok(buf.subarray(0, 8).equals(SIGNATURE));
    assert.equal(buf.readUInt32BE(16), size);
    assert.equal(buf.readUInt32BE(20), size);
  });
}
