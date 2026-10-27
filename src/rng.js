/**
 * Seeded pseudo-random number generator (mulberry32).
 * Its whole state is one unsigned 32-bit integer, so it can be saved,
 * restored and rewound by undo.
 */

const UINT32_RANGE = 4294967296;

/**
 * @typedef {object} Rng
 * @property {() => number} next returns a float in [0, 1)
 * @property {() => number} getState returns the current 32-bit state
 * @property {(state: number) => void} setState rewinds or jumps to a state
 */

/**
 * Creates a deterministic random number generator.
 * @param {number} seed any number; it is reduced to an unsigned 32-bit integer
 * @returns {Rng}
 */
export function createRng(seed) {
  let state = Number(seed) >>> 0;
  return {
    next() {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / UINT32_RANGE;
    },
    getState: () => state,
    setState(next) {
      state = Number(next) >>> 0;
    },
  };
}

/**
 * Picks a fresh, non-reproducible seed for a normal game.
 * @returns {number} an unsigned 32-bit integer
 */
export function randomSeed() {
  return Math.floor(Math.random() * UINT32_RANGE) >>> 0;
}
