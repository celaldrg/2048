/**
 * DOM view of the board. Tiles are absolutely positioned elements keyed by
 * tile id; a move only changes their --row/--col variables and CSS animates
 * the slide (transform), the merge pop and the new-tile appear.
 */

import { WIN_VALUE } from './game.js';

/** Slide duration in ms; keep in sync with the .tile transition in style.css. */
const SLIDE_MS = 120;

/** @typedef {import('./game.js').GameView} GameView */
/** @typedef {import('./game.js').MoveResult} MoveResult */

/**
 * @typedef {object} BoardView
 * @property {(state: GameView) => void} reset drops every tile and draws the state fresh
 * @property {(state: GameView) => void} sync moves kept tiles into place, adds and drops the rest (undo)
 * @property {(result: MoveResult) => void} animate plays one effective move
 */

/**
 * Builds the board view inside an element that contains `.board-grid` and `.board-tiles`.
 * @param {HTMLElement} board
 * @param {number} size board width and height in cells
 * @returns {BoardView}
 */
export function createBoardView(board, size) {
  const layer = board.querySelector('.board-tiles');
  const tiles = new Map();
  let leaving = [];
  let timer = 0;

  board.style.setProperty('--size', String(size));
  const cells = Array.from({ length: size * size }, () => makeElement('div', 'cell'));
  board.querySelector('.board-grid').replaceChildren(...cells);

  /** Finishes the previous move at once: removes tiles that merged away. */
  function settle() {
    window.clearTimeout(timer);
    leaving.forEach((element) => element.remove());
    leaving = [];
  }

  function add(id, value, index, kind) {
    const element = makeElement('div', `tile tile-${kind}`);
    element.append(makeElement('div', 'tile-inner'));
    update(element, value, index, size);
    tiles.set(id, element);
    layer.append(element);
  }

  function removeAll() {
    tiles.forEach((element) => element.remove());
    tiles.clear();
  }

  return {
    reset(state) {
      settle();
      removeAll();
      state.tiles.forEach((tile) => add(tile.id, tile.value, tile.index, 'new'));
    },
    sync(state) {
      settle();
      const kept = new Set(state.tiles.map((tile) => tile.id));
      tiles.forEach((element, id) => {
        if (kept.has(id)) return;
        element.remove();
        tiles.delete(id);
      });
      state.tiles.forEach((tile) => {
        const element = tiles.get(tile.id);
        if (element) update(element, tile.value, tile.index, size);
        else add(tile.id, tile.value, tile.index, 'new');
      });
    },
    animate(result) {
      settle();
      result.moves.forEach(({ id, to }) => {
        const element = tiles.get(id);
        if (element) place(element, to, size);
      });
      result.merges.forEach((merge) => {
        merge.sources.forEach((id) => {
          const element = tiles.get(id);
          if (!element) return;
          element.classList.add('tile-leaving');
          leaving.push(element);
          tiles.delete(id);
        });
        add(merge.id, merge.value, merge.index, 'merged');
      });
      if (result.spawned) add(result.spawned.id, result.spawned.value, result.spawned.index, 'new');
      timer = window.setTimeout(settle, SLIDE_MS);
    },
  };
}

/** Sets a tile's value (text, colour hooks) and position. */
function update(element, value, index, size) {
  element.dataset.value = String(value);
  element.dataset.digits = String(Math.min(String(value).length, 5));
  element.toggleAttribute('data-super', value > WIN_VALUE);
  element.firstElementChild.textContent = String(value);
  place(element, index, size);
}

/** Positions a tile on its cell through CSS variables (animated by a transform transition). */
function place(element, index, size) {
  element.style.setProperty('--row', String(Math.floor(index / size)));
  element.style.setProperty('--col', String(index % size));
}

function makeElement(tag, className) {
  const element = document.createElement(tag);
  element.className = className;
  return element;
}
