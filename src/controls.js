/**
 * Pure input mapping: keyboard keys and swipe gestures to game commands.
 * No DOM access, so tests can import it.
 */

/** Shortest swipe, in CSS pixels, that counts as a move. */
export const MIN_SWIPE_PX = 24;

const KEY_DIRECTIONS = new Map([
  ['arrowup', 'up'],
  ['w', 'up'],
  ['arrowdown', 'down'],
  ['s', 'down'],
  ['arrowleft', 'left'],
  ['a', 'left'],
  ['arrowright', 'right'],
  ['d', 'right'],
]);

const UNDO_KEYS = new Set(['u', 'z']);

/**
 * Maps a KeyboardEvent.key value to a move direction.
 * @param {string} key
 * @returns {import('./board.js').Direction | null}
 */
export function directionForKey(key) {
  return KEY_DIRECTIONS.get(String(key).toLowerCase()) ?? null;
}

/**
 * Tells whether a KeyboardEvent.key value means "undo".
 * @param {string} key
 * @returns {boolean}
 */
export function isUndoKey(key) {
  return UNDO_KEYS.has(String(key).toLowerCase());
}

/**
 * Turns a pointer drag into a move direction along its dominant axis.
 * @param {number} dx horizontal distance, positive to the right
 * @param {number} dy vertical distance, positive downwards
 * @param {number} [minDistance] shorter drags are ignored (taps)
 * @returns {import('./board.js').Direction | null} null for taps and exact diagonals
 */
export function swipeDirection(dx, dy, minDistance = MIN_SWIPE_PX) {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (Math.max(ax, ay) < minDistance || ax === ay) return null;
  if (ax > ay) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}
