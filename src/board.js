/**
 * Pure board operations for a square sliding-tile grid.
 * No DOM, no storage: every function takes plain data and returns new data.
 *
 * Cells are stored row-major in a flat array of length size * size.
 * Each cell is either null or an immutable tile object { id, value }.
 */

/** @typedef {{ id: number, value: number }} Tile */
/** @typedef {Array<Tile | null>} Cells */
/** @typedef {'up' | 'down' | 'left' | 'right'} Direction */
/** @typedef {{ id: number, from: number, to: number }} TileMove */
/** @typedef {{ id: number, value: number, index: number, sources: number[] }} TileMerge */

/** All valid move directions. */
export const DIRECTIONS = Object.freeze(['up', 'down', 'left', 'right']);

/**
 * Tells whether a number can be a tile value (a power of two, at least 2).
 * @param {unknown} value
 * @returns {boolean}
 */
export function isTileValue(value) {
  return Number.isSafeInteger(value) && value >= 2 && Number.isInteger(Math.log2(value));
}

/**
 * Plans how one line collapses toward index 0 (the movement side).
 * Each tile merges at most once per move and merging starts at the movement
 * side, so [2, 2, 2, 2] becomes [4, 4] and [4, 4, 4] becomes [8, 4].
 * @param {number[]} values line values ordered from the movement side, 0 = empty
 * @returns {{ groups: Array<{ sources: number[], value: number }>, gained: number }}
 *   groups[k] lands at position k; its sources are the input positions it came from
 */
export function planLine(values) {
  const groups = [];
  let gained = 0;
  let open = null; // the last group that may still absorb one equal tile
  values.forEach((value, position) => {
    if (value === 0) return;
    if (open && open.value === value) {
      open.sources.push(position);
      open.value *= 2;
      gained += open.value;
      open = null;
      return;
    }
    open = { sources: [position], value };
    groups.push(open);
  });
  return { groups, gained };
}

/**
 * Slides and merges one line of values toward index 0.
 * @param {number[]} values line values ordered from the movement side, 0 = empty
 * @returns {{ line: number[], gained: number }}
 */
export function slideLine(values) {
  const { groups, gained } = planLine(values);
  return { line: values.map((_, k) => groups[k]?.value ?? 0), gained };
}

/**
 * Lists the cell indices of line k, ordered from the movement side.
 * For 'left' and 'right' line k is row k; for 'up' and 'down' it is column k.
 * @param {number} size board width and height
 * @param {Direction} direction
 * @param {number} k row or column number
 * @returns {number[]}
 */
export function lineIndices(size, direction, k) {
  const steps = Array.from({ length: size }, (_, i) => i);
  switch (direction) {
    case 'left':
      return steps.map((i) => k * size + i);
    case 'right':
      return steps.map((i) => k * size + (size - 1 - i));
    case 'up':
      return steps.map((i) => i * size + k);
    case 'down':
      return steps.map((i) => (size - 1 - i) * size + k);
    default:
      throw new RangeError(`Unknown direction: ${direction}`);
  }
}

/**
 * Slides every line of the board in one direction.
 * Every tile that existed before the move appears once in `moves` (merged
 * tiles slide to the cell of the tile they became); each merge creates a new
 * tile with a fresh id, listed in `merges`.
 * @param {Cells} cells
 * @param {number} size board width and height
 * @param {Direction} direction
 * @param {number} nextId id for the first tile created by a merge
 * @returns {{ cells: Cells, moved: boolean, gained: number, nextId: number,
 *   moves: TileMove[], merges: TileMerge[] }}
 */
export function moveCells(cells, size, direction, nextId) {
  const result = {
    cells: new Array(cells.length).fill(null),
    moved: false,
    gained: 0,
    nextId,
    moves: [],
    merges: [],
  };
  for (let k = 0; k < size; k += 1) {
    collapseLine(result, cells, lineIndices(size, direction, k));
  }
  return result;
}

/**
 * Collapses one line of `cells` into `result` (mutates the result being built).
 * @param {ReturnType<typeof moveCells>} result
 * @param {Cells} cells
 * @param {number[]} indices
 */
function collapseLine(result, cells, indices) {
  const plan = planLine(indices.map((index) => cells[index]?.value ?? 0));
  result.gained += plan.gained;
  plan.groups.forEach((group, k) => {
    const to = indices[k];
    const tiles = group.sources.map((position) => {
      const from = indices[position];
      result.moves.push({ id: cells[from].id, from, to });
      result.moved ||= from !== to;
      return cells[from];
    });
    result.cells[to] = tiles.length === 1 ? tiles[0] : mergeTiles(result, tiles, group.value, to);
  });
}

/**
 * Creates the tile produced by a merge and records the merge.
 * @param {ReturnType<typeof moveCells>} result
 * @param {Tile[]} tiles the two tiles being merged
 * @param {number} value
 * @param {number} index
 * @returns {Tile}
 */
function mergeTiles(result, tiles, value, index) {
  const tile = { id: result.nextId, value };
  result.nextId += 1;
  result.merges.push({ id: tile.id, value, index, sources: tiles.map((t) => t.id) });
  return tile;
}

/**
 * Lists the indices of empty cells.
 * @param {Cells} cells
 * @returns {number[]}
 */
export function emptyIndices(cells) {
  return cells.flatMap((cell, index) => (cell ? [] : [index]));
}

/**
 * Tells whether any move is possible: an empty cell or two equal neighbours.
 * @param {Cells} cells
 * @param {number} size board width and height
 * @returns {boolean}
 */
export function hasMoves(cells, size) {
  return cells.some((cell, index) => {
    if (!cell) return true;
    const right = index % size < size - 1 ? cells[index + 1] : null;
    const below = cells[index + size] ?? null;
    return right?.value === cell.value || below?.value === cell.value;
  });
}

/**
 * Builds cells from plain values, giving each tile a new id.
 * @param {number[]} grid row-major values, 0 = empty
 * @param {number} [firstId]
 * @returns {{ cells: Cells, nextId: number }}
 */
export function cellsFromGrid(grid, firstId = 1) {
  let nextId = firstId;
  const cells = grid.map((value) => {
    if (!value) return null;
    const tile = { id: nextId, value };
    nextId += 1;
    return tile;
  });
  return { cells, nextId };
}

/**
 * Reads plain values from cells.
 * @param {Cells} cells
 * @returns {number[]} row-major values, 0 = empty
 */
export function gridFromCells(cells) {
  return cells.map((cell) => cell?.value ?? 0);
}
