import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng, randomSeed } from '../src/rng.js';

function draw(rng, count) {
  return Array.from({ length: count }, () => rng.next());
}

test('the same seed produces the same sequence', () => {
  assert.deepEqual(draw(createRng(2048), 50), draw(createRng(2048), 50));
  assert.notDeepEqual(draw(createRng(1), 10), draw(createRng(2), 10));
});

test('values are floats in [0, 1)', () => {
  for (const value of draw(createRng(7), 5000)) {
    assert.ok(value >= 0 && value < 1, String(value));
  }
});

test('setState rewinds the sequence exactly', () => {
  const rng = createRng(99);
  draw(rng, 5);
  const saved = rng.getState();
  const expected = draw(rng, 20);
  rng.setState(saved);
  assert.deepEqual(draw(rng, 20), expected);
});

test('state is always an unsigned 32-bit integer', () => {
  const rng = createRng(-1);
  for (let i = 0; i < 100; i += 1) {
    rng.next();
    const state = rng.getState();
    assert.ok(Number.isInteger(state) && state >= 0 && state <= 0xffffffff);
  }
  const seed = randomSeed();
  assert.ok(Number.isInteger(seed) && seed >= 0 && seed <= 0xffffffff);
});
