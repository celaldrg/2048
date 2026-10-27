/**
 * Deterministic mid-game position for the "?demo" query parameter
 * (used only for the README screenshot).
 */

import { createGame } from './game.js';

/** Seed used by the demo game so the next spawns are always the same. */
export const DEMO_SEED = 20480;

// A tidy "snake" of tiles from 512 down to 2, plus one fresh 2.
const DEMO_GRID = Object.freeze([
  512, 256, 128, 64,
  4, 8, 16, 32,
  2, 4, 0, 0,
  0, 0, 0, 2,
]);

/**
 * Score a player would have if every tile had been built from 2s:
 * a tile of value 2^n is worth (n - 1) * 2^n points.
 * @param {readonly number[]} grid
 * @returns {number}
 */
function scoreFor(grid) {
  return grid.reduce((sum, value) => (value ? sum + (Math.log2(value) - 1) * value : sum), 0);
}

/**
 * Builds the demo game: tiles from 2 up to 512, a matching score and a fixed seed.
 * @returns {import('./game.js').Game}
 */
export function createDemoGame() {
  return createGame({ grid: [...DEMO_GRID], score: scoreFor(DEMO_GRID), seed: DEMO_SEED });
}
