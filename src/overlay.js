/**
 * Pure rules for the board overlays: which one a game state shows and when
 * undo is allowed. No DOM access, so tests can import it.
 */

/** @typedef {import('./game.js').GameView} GameView */
/** @typedef {'win' | 'over' | null} Overlay */

/**
 * Picks the overlay for a game state. A fresh win comes first, even when the
 * winning move also left no moves; game over follows once the player chooses
 * to keep playing.
 * @param {Pick<GameView, 'won' | 'keepPlaying' | 'over'>} state
 * @returns {Overlay}
 */
export function overlayFor(state) {
  if (state.won && !state.keepPlaying) return 'win';
  if (state.over) return 'over';
  return null;
}

/**
 * Tells whether undo is available: there is a move to undo and no win overlay
 * is waiting for the player's choice. A win stays won after undo, so undoing
 * under that overlay would leave it over a board without the winning tile.
 * @param {Pick<GameView, 'won' | 'keepPlaying' | 'over' | 'canUndo'>} state
 * @returns {boolean}
 */
export function undoAllowed(state) {
  return state.canUndo && overlayFor(state) !== 'win';
}
