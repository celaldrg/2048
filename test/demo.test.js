import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDemoGame } from '../src/demo.js';

test('the demo board shows every tile from 2 up to 512 and a score', () => {
  const state = createDemoGame().getState();
  const values = new Set(state.grid);
  for (const value of [2, 4, 8, 16, 32, 64, 128, 256, 512]) assert.ok(values.has(value), `has ${value}`);
  assert.equal(state.score, 7176);
  assert.deepEqual(
    { over: state.over, won: state.won, canUndo: state.canUndo },
    { over: false, won: false, canUndo: false },
  );
});

test('the demo game is deterministic', () => {
  const a = createDemoGame();
  const b = createDemoGame();
  assert.deepEqual(a.getState(), b.getState());
  for (const direction of ['down', 'left', 'up', 'right']) {
    assert.deepEqual(a.move(direction), b.move(direction));
  }
  assert.deepEqual(a.getState(), b.getState());
});
