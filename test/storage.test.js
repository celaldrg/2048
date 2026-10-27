import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStorage } from '../src/storage.js';

function memoryBackend() {
  const data = new Map();
  return {
    data,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
  };
}

test('values round-trip as JSON under a prefixed key', () => {
  const backend = memoryBackend();
  const store = createStorage(() => backend);
  assert.equal(store.set('best', 4096), true);
  assert.equal(store.get('best', 0), 4096);
  assert.equal(backend.data.get('2048:best'), '4096');
  store.set('game', { score: 12, grid: [2, 0] });
  assert.deepEqual(store.get('game', null), { score: 12, grid: [2, 0] });
});

test('missing keys return the fallback', () => {
  const store = createStorage(() => memoryBackend());
  assert.equal(store.get('nothing', 'fallback'), 'fallback');
});

test('corrupt JSON returns the fallback', () => {
  const backend = memoryBackend();
  backend.data.set('2048:best', '{oops');
  assert.equal(createStorage(() => backend).get('best', 0), 0);
});

test('blocked or missing storage never throws', () => {
  const throwing = {
    getItem() {
      throw new Error('SecurityError');
    },
    setItem() {
      throw new Error('QuotaExceededError');
    },
  };
  const blocked = createStorage(() => throwing);
  assert.equal(blocked.get('best', 1), 1);
  assert.equal(blocked.set('best', 2), false);

  const denied = createStorage(() => {
    throw new Error('localStorage is not available');
  });
  assert.equal(denied.get('best', 3), 3);
  assert.equal(denied.set('best', 4), false);

  const absent = createStorage(() => undefined);
  assert.equal(absent.get('best', 5), 5);
  assert.equal(absent.set('best', 6), false);
});
