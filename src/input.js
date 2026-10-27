/**
 * Binds keyboard and pointer (touch, pen, mouse drag) input to game commands.
 */

import { directionForKey, isUndoKey, swipeDirection } from './controls.js';

/**
 * Listens for arrow keys / WASD / U / Z on the window and swipes on the board.
 * @param {object} handlers
 * @param {HTMLElement} handlers.board element that receives swipes
 * @param {(direction: import('./board.js').Direction) => void} handlers.onMove
 * @param {() => void} handlers.onUndo
 */
export function bindInput({ board, onMove, onUndo }) {
  window.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const direction = directionForKey(event.key);
    if (direction) {
      event.preventDefault();
      onMove(direction);
    } else if (isUndoKey(event.key)) {
      event.preventDefault();
      onUndo();
    }
  });
  bindSwipe(board, onMove);
}

/** Reports one direction per drag that starts on the board. */
function bindSwipe(board, onMove) {
  let start = null;
  board.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || event.button !== 0) return;
    start = { id: event.pointerId, x: event.clientX, y: event.clientY };
    board.setPointerCapture(event.pointerId);
  });
  board.addEventListener('pointerup', (event) => {
    if (!start || event.pointerId !== start.id) return;
    const direction = swipeDirection(event.clientX - start.x, event.clientY - start.y);
    start = null;
    if (direction) onMove(direction);
  });
  board.addEventListener('pointercancel', () => {
    start = null;
  });
}
