import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { overlayFor, undoAllowed } from '../src/overlay.js';

// Moving left merges 1024 + 1024 into 2048, and the spawn fills the only empty
// cell (top right) with a 2 or a 4: after that no move is left.
const WIN_AND_STUCK = [
  1024, 1024, 8, 16,
  4, 16, 32, 64,
  8, 4, 64, 32,
  4, 8, 16, 8,
];

/** Plays the winning move that also ends the game. */
function winAndGetStuck(seed) {
  const game = createGame({ seed, grid: WIN_AND_STUCK });
  const result = game.move('left');
  assert.deepEqual({ justWon: result.justWon, over: result.over }, { justWon: true, over: true }, `seed ${seed}`);
  return game;
}

test('the overlay follows win, keep playing and game over', () => {
  const playing = { won: false, keepPlaying: false, over: false };
  assert.equal(overlayFor(playing), null);
  assert.equal(overlayFor({ ...playing, over: true }), 'over');
  assert.equal(overlayFor({ ...playing, won: true }), 'win');
  assert.equal(overlayFor({ ...playing, won: true, over: true }), 'win');
  assert.equal(overlayFor({ ...playing, won: true, keepPlaying: true }), null);
  assert.equal(overlayFor({ ...playing, won: true, keepPlaying: true, over: true }), 'over');
});

test('a winning move that also ends the game shows the win first, then game over', () => {
  for (let seed = 1; seed <= 10; seed += 1) {
    const game = winAndGetStuck(seed);
    assert.equal(overlayFor(game.getState()), 'win');
    game.keepPlaying();
    assert.equal(overlayFor(game.getState()), 'over');
  }
});

test('undo waits while the win overlay asks for a choice', () => {
  const game = winAndGetStuck(1);
  const state = game.getState();
  assert.equal(state.canUndo, true);
  assert.equal(undoAllowed(state), false);
  game.keepPlaying();
  assert.equal(undoAllowed(game.getState()), true);
});

test('undo from the game-over overlay returns to the board before the win without an overlay', () => {
  const game = winAndGetStuck(2);
  game.keepPlaying();
  assert.equal(game.undo(), true);
  const state = game.getState();
  assert.deepEqual(state.grid, WIN_AND_STUCK);
  assert.equal(overlayFor(state), null);
});

test('undo is allowed once there is a move to undo', () => {
  const game = createGame({ seed: 3, grid: [2, ...new Array(15).fill(0)] });
  assert.equal(undoAllowed(game.getState()), false);
  assert.equal(game.move('right').moved, true);
  assert.equal(undoAllowed(game.getState()), true);
});
