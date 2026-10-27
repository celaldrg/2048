import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MIN_SWIPE_PX, directionForKey, isUndoKey, swipeDirection } from '../src/controls.js';

test('arrow keys and WASD map to directions in any case', () => {
  const cases = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
    w: 'up',
    S: 'down',
    a: 'left',
    D: 'right',
  };
  for (const [key, direction] of Object.entries(cases)) assert.equal(directionForKey(key), direction, key);
});

test('other keys are not moves', () => {
  for (const key of ['Enter', ' ', 'q', 'constructor', 'toString', '']) assert.equal(directionForKey(key), null, key);
});

test('U and Z undo', () => {
  assert.ok(isUndoKey('u'));
  assert.ok(isUndoKey('Z'));
  assert.ok(!isUndoKey('ArrowUp'));
});

test('swipes follow their dominant axis', () => {
  assert.equal(swipeDirection(80, 10), 'right');
  assert.equal(swipeDirection(-80, 30), 'left');
  assert.equal(swipeDirection(5, 60), 'down');
  assert.equal(swipeDirection(-20, -60), 'up');
});

test('taps and exact diagonals are not swipes', () => {
  assert.equal(swipeDirection(MIN_SWIPE_PX - 1, 0), null);
  assert.equal(swipeDirection(3, -4), null);
  assert.equal(swipeDirection(50, 50), null);
  assert.equal(swipeDirection(MIN_SWIPE_PX, 0), 'right');
});
