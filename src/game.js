/**
 * 2048 game state: moves, spawning, score, win/game-over, undo and save data.
 * Pure logic with an injectable seeded RNG; no DOM and no storage access.
 */

import { createRng, randomSeed } from './rng.js';
import {
  cellsFromGrid,
  emptyIndices,
  gridFromCells,
  hasMoves,
  isTileValue,
  moveCells,
} from './board.js';

/** Board width and height. */
export const BOARD_SIZE = 4;
/** Creating a tile of this value wins the game. */
export const WIN_VALUE = 2048;
/** Default number of moves that can be undone. */
export const UNDO_LIMIT = 20;
/** Version of the object returned by serialize(). */
export const SAVE_VERSION = 1;

const CELL_COUNT = BOARD_SIZE * BOARD_SIZE;
const START_TILES = 2;
const FOUR_CHANCE = 0.1;

/** @typedef {import('./board.js').Cells} Cells */
/** @typedef {import('./board.js').Direction} Direction */
/** @typedef {import('./board.js').TileMove} TileMove */
/** @typedef {import('./board.js').TileMerge} TileMerge */
/** @typedef {import('./rng.js').Rng} Rng */

/**
 * @typedef {object} GameOptions
 * @property {number} [seed] seed for the built-in RNG (random when omitted)
 * @property {Rng} [rng] custom RNG; takes precedence over `seed`
 * @property {number[]} [grid] 16 row-major start values, 0 = empty; no start tiles are spawned
 * @property {number} [score] start score (default 0)
 * @property {number} [undoLimit] how many moves can be undone (default UNDO_LIMIT)
 */

/**
 * @typedef {object} MoveResult
 * @property {boolean} moved false when the move changed nothing (no spawn, no undo step)
 * @property {number} gained points earned by this move
 * @property {TileMove[]} moves where every previous tile slid to
 * @property {TileMerge[]} merges tiles created by merging
 * @property {{ id: number, value: number, index: number } | null} spawned the new random tile
 * @property {boolean} justWon true only on the move that first creates WIN_VALUE
 * @property {boolean} over true when no move is left
 */

/**
 * @typedef {object} GameView
 * @property {number} size
 * @property {number} score
 * @property {boolean} won
 * @property {boolean} keepPlaying true after the player chose to continue past the win
 * @property {boolean} over
 * @property {boolean} canUndo
 * @property {number[]} grid row-major values, 0 = empty
 * @property {Array<{ id: number, value: number, index: number, row: number, col: number }>} tiles
 */

/**
 * @typedef {object} Game
 * @property {(direction: Direction) => MoveResult} move slides all tiles; throws RangeError on an unknown direction
 * @property {() => boolean} undo steps back one move; false when there is nothing to undo
 * @property {() => boolean} canUndo
 * @property {() => void} keepPlaying dismisses the win state so play continues
 * @property {() => GameView} getState a fresh read-only description for rendering
 * @property {() => object} serialize JSON-safe save data for restoreGame()
 */

/**
 * Starts a new game: an empty board with two random tiles, or a given grid.
 * @param {GameOptions} [options]
 * @returns {Game}
 */
export function createGame(options = {}) {
  const rng = options.rng ?? createRng(options.seed ?? randomSeed());
  const state = {
    cells: new Array(CELL_COUNT).fill(null),
    score: options.score ?? 0,
    nextId: 1,
    won: false,
    keepPlaying: false,
    history: [],
  };
  if (options.grid) {
    assertGrid(options.grid);
    Object.assign(state, cellsFromGrid(options.grid));
  } else {
    for (let i = 0; i < START_TILES; i += 1) spawnTile(state, rng);
  }
  return bindGame(state, rng, options.undoLimit ?? UNDO_LIMIT);
}

/**
 * Rebuilds a game from serialize() output (for example after a reload).
 * @param {unknown} data parsed save data
 * @param {{ rng?: Rng, undoLimit?: number }} [options]
 * @returns {Game | null} null when the data is missing or invalid
 */
export function restoreGame(data, options = {}) {
  if (!isSaveData(data)) return null;
  const undoLimit = options.undoLimit ?? UNDO_LIMIT;
  const rng = options.rng ?? createRng(0);
  rng.setState(data.current.rngState);
  const state = {
    ...readSnapshot(data.current),
    won: data.won,
    keepPlaying: data.keepPlaying,
    history: undoLimit > 0 ? data.history.slice(-undoLimit).map(copySnapshot) : [],
  };
  return bindGame(state, rng, undoLimit);
}

/**
 * Wraps internal state in the public Game interface.
 * @returns {Game}
 */
function bindGame(state, rng, undoLimit) {
  return {
    move: (direction) => applyMove(state, rng, direction, undoLimit),
    undo: () => undoMove(state, rng),
    canUndo: () => state.history.length > 0,
    keepPlaying() {
      if (state.won) state.keepPlaying = true;
    },
    getState: () => describe(state),
    serialize: () => ({
      version: SAVE_VERSION,
      won: state.won,
      keepPlaying: state.keepPlaying,
      current: takeSnapshot(state, rng),
      history: state.history.map(copySnapshot),
    }),
  };
}

/** @returns {MoveResult} */
function applyMove(state, rng, direction, undoLimit) {
  const result = moveCells(state.cells, BOARD_SIZE, direction, state.nextId);
  if (!result.moved) {
    return { moved: false, gained: 0, moves: [], merges: [], spawned: null, justWon: false, over: isOver(state) };
  }
  remember(state, rng, undoLimit);
  state.cells = result.cells;
  state.nextId = result.nextId;
  state.score += result.gained;
  const spawned = spawnTile(state, rng);
  const justWon = !state.won && result.merges.some((merge) => merge.value >= WIN_VALUE);
  state.won ||= justWon;
  return {
    moved: true,
    gained: result.gained,
    moves: result.moves,
    merges: result.merges,
    spawned,
    justWon,
    over: isOver(state),
  };
}

/** Pushes the current position onto the undo stack, dropping the oldest beyond the limit. */
function remember(state, rng, undoLimit) {
  if (undoLimit <= 0) return;
  state.history.push(takeSnapshot(state, rng));
  if (state.history.length > undoLimit) state.history.shift();
}

/** Restores board, score, ids and RNG state of the previous move; won stays won. */
function undoMove(state, rng) {
  const previous = state.history.pop();
  if (!previous) return false;
  Object.assign(state, readSnapshot(previous));
  rng.setState(previous.rngState);
  return true;
}

/** Puts a 2 (90%) or 4 (10%) into a random empty cell. */
function spawnTile(state, rng) {
  const empty = emptyIndices(state.cells);
  if (empty.length === 0) return null;
  const index = empty[Math.floor(rng.next() * empty.length)];
  const value = rng.next() < FOUR_CHANCE ? 4 : 2;
  const tile = { id: state.nextId, value };
  state.nextId += 1;
  state.cells[index] = tile;
  return { id: tile.id, value, index };
}

function isOver(state) {
  return !hasMoves(state.cells, BOARD_SIZE);
}

/** @returns {GameView} */
function describe(state) {
  return {
    size: BOARD_SIZE,
    score: state.score,
    won: state.won,
    keepPlaying: state.keepPlaying,
    over: isOver(state),
    canUndo: state.history.length > 0,
    grid: gridFromCells(state.cells),
    tiles: state.cells.flatMap((cell, index) =>
      cell
        ? [{ id: cell.id, value: cell.value, index, row: Math.floor(index / BOARD_SIZE), col: index % BOARD_SIZE }]
        : [],
    ),
  };
}

function copyCells(cells) {
  return cells.map((cell) => (cell ? { id: cell.id, value: cell.value } : null));
}

function takeSnapshot(state, rng) {
  return { cells: copyCells(state.cells), score: state.score, nextId: state.nextId, rngState: rng.getState() };
}

function copySnapshot(snapshot) {
  return { ...snapshot, cells: copyCells(snapshot.cells) };
}

function readSnapshot(snapshot) {
  return { cells: copyCells(snapshot.cells), score: snapshot.score, nextId: snapshot.nextId };
}

function assertGrid(grid) {
  const valid = Array.isArray(grid) && grid.length === CELL_COUNT && grid.every((v) => v === 0 || isTileValue(v));
  if (!valid) throw new RangeError(`grid must hold ${CELL_COUNT} values that are 0 or powers of two`);
}

function isRecord(value) {
  return typeof value === 'object' && value !== null;
}

function isCount(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function isSaveData(data) {
  return (
    isRecord(data) &&
    data.version === SAVE_VERSION &&
    typeof data.won === 'boolean' &&
    typeof data.keepPlaying === 'boolean' &&
    isSnapshot(data.current) &&
    Array.isArray(data.history) &&
    data.history.every(isSnapshot)
  );
}

function isSnapshot(snapshot) {
  if (!isRecord(snapshot) || !Array.isArray(snapshot.cells) || snapshot.cells.length !== CELL_COUNT) return false;
  const { nextId, rngState } = snapshot;
  if (!isCount(snapshot.score) || !isCount(nextId) || !Number.isInteger(rngState)) return false;
  if (rngState < 0 || rngState > 0xffffffff) return false;
  const tiles = snapshot.cells.filter((cell) => cell !== null);
  const validTiles = tiles.every(
    (tile) => isRecord(tile) && isCount(tile.id) && tile.id >= 1 && tile.id < nextId && isTileValue(tile.value),
  );
  return validTiles && new Set(tiles.map((tile) => tile.id)).size === tiles.length;
}
