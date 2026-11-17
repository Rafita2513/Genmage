import test from 'node:test';
import assert from 'node:assert/strict';
import { createSelection } from '../../src/selectionState.js';

test('empieza sin nada marcado', () => {
  const sel = createSelection();
  assert.equal(sel.count(), 0);
  assert.equal(sel.isSelected('s0'), false);
});

test('toggle marca y desmarca', () => {
  const sel = createSelection();
  sel.toggle('s0');
  sel.toggle('s3');
  assert.equal(sel.isSelected('s0'), true);
  assert.equal(sel.count(), 2);
  sel.toggle('s0');
  assert.equal(sel.isSelected('s0'), false);
  assert.equal(sel.count(), 1);
});

test('clear deja la selección vacía', () => {
  const sel = createSelection();
  sel.toggle('s1');
  sel.clear();
  assert.equal(sel.count(), 0);
});
