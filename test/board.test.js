import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DIRECTIONS,
  cellsFromGrid,
  emptyIndices,
  gridFromCells,
  hasMoves,
  isTileValue,
  lineIndices,
  moveCells,
  slideLine,
} from '../src/board.js';

// [input line from the movement side, expected line, points gained]
const MERGE_CASES = [
  [[2, 2, 2, 2], [4, 4, 0, 0], 8],
  [[2, 2, 4, 0], [4, 4, 0, 0], 4],
  [[4, 4, 4, 0], [8, 4, 0, 0], 8],
  [[2, 0, 2, 2], [4, 2, 0, 0], 4],
  [[8, 8, 16, 16], [16, 32, 0, 0], 48],
  [[4, 4, 8, 0], [8, 8, 0, 0], 8],
  [[0, 0, 0, 2], [2, 0, 0, 0], 0],
  [[2, 4, 8, 16], [2, 4, 8, 16], 0],
];

/** Places a line (ordered from the movement side) in row/column 1 of an empty 4x4 grid. */
function place(direction, line) {
  const grid = new Array(16).fill(0);
  const ordered = direction === 'right' || direction === 'down' ? [...line].reverse() : line;
  ordered.forEach((value, i) => {
    const horizontal = direction === 'left' || direction === 'right';
    grid[horizontal ? 4 + i : i * 4 + 1] = value;
  });
  return grid;
}

function slideGrid(grid, direction) {
  const { cells, nextId } = cellsFromGrid(grid);
  return moveCells(cells, 4, direction, nextId);
}

test('DONE: [2,2,2,2] slides to [4,4,0,0] (each tile merges at most once)', () => {
  assert.deepEqual(slideLine([2, 2, 2, 2]), { line: [4, 4, 0, 0], gained: 8 });
});

test('slideLine follows the classic merge rule', () => {
  for (const [input, line, gained] of MERGE_CASES) {
    assert.deepEqual(slideLine(input), { line, gained }, `slideLine(${JSON.stringify(input)})`);
  }
});

test('merge rules hold in all four directions on the board', () => {
  for (const direction of DIRECTIONS) {
    for (const [input, line, gained] of MERGE_CASES) {
      const result = slideGrid(place(direction, input), direction);
      const label = `${direction} ${JSON.stringify(input)}`;
      assert.deepEqual(gridFromCells(result.cells), place(direction, line), label);
      assert.equal(result.gained, gained, label);
    }
  }
});

test('[2,2,2,2] becomes [4,4] in every direction', () => {
  for (const direction of DIRECTIONS) {
    const result = slideGrid(place(direction, [2, 2, 2, 2]), direction);
    assert.deepEqual(gridFromCells(result.cells), place(direction, [4, 4, 0, 0]), direction);
    assert.equal(result.merges.length, 2, direction);
  }
});

test('every row moves independently in one move', () => {
  const grid = [
    2, 2, 2, 2,
    2, 2, 4, 0,
    4, 4, 4, 0,
    8, 8, 16, 16,
  ];
  const result = slideGrid(grid, 'left');
  assert.deepEqual(gridFromCells(result.cells), [
    4, 4, 0, 0,
    4, 4, 0, 0,
    8, 4, 0, 0,
    16, 32, 0, 0,
  ]);
  assert.equal(result.gained, 8 + 4 + 8 + 48);
});

test('a move that changes nothing reports moved = false', () => {
  const grid = [
    2, 4, 0, 0,
    8, 0, 0, 0,
    0, 0, 0, 0,
    0, 0, 0, 0,
  ];
  const result = slideGrid(grid, 'left');
  assert.equal(result.moved, false);
  assert.deepEqual(gridFromCells(result.cells), grid);
  assert.deepEqual(result.merges, []);
  assert.equal(slideGrid(grid, 'up').moved, false);
  assert.equal(slideGrid(grid, 'right').moved, true);
});

test('moves and merges carry tile ids for animation', () => {
  const { cells } = cellsFromGrid([0, 2, 0, 2, ...new Array(12).fill(0)]);
  const [idA, idB] = [cells[1].id, cells[3].id];
  const result = moveCells(cells, 4, 'left', 100);
  assert.deepEqual(result.moves, [
    { id: idA, from: 1, to: 0 },
    { id: idB, from: 3, to: 0 },
  ]);
  assert.deepEqual(result.merges, [{ id: 100, value: 4, index: 0, sources: [idA, idB] }]);
  assert.deepEqual(result.cells[0], { id: 100, value: 4 });
  assert.equal(result.nextId, 101);
});

test('lineIndices orders cells from the movement side', () => {
  assert.deepEqual(lineIndices(4, 'left', 1), [4, 5, 6, 7]);
  assert.deepEqual(lineIndices(4, 'right', 1), [7, 6, 5, 4]);
  assert.deepEqual(lineIndices(4, 'up', 2), [2, 6, 10, 14]);
  assert.deepEqual(lineIndices(4, 'down', 2), [14, 10, 6, 2]);
  assert.throws(() => lineIndices(4, 'diagonal', 0), RangeError);
});

test('hasMoves detects empty cells and equal neighbours', () => {
  const stuck = [
    2, 4, 2, 4,
    4, 2, 4, 2,
    2, 4, 2, 4,
    4, 2, 4, 2,
  ];
  assert.equal(hasMoves(cellsFromGrid(stuck).cells, 4), false);
  const verticalPair = [...stuck];
  verticalPair[15] = 4; // equal to the cell above it
  assert.equal(hasMoves(cellsFromGrid(verticalPair).cells, 4), true);
  const horizontalPair = [...stuck];
  horizontalPair[1] = 2; // equal to its left neighbour
  assert.equal(hasMoves(cellsFromGrid(horizontalPair).cells, 4), true);
  const withGap = [...stuck];
  withGap[5] = 0;
  assert.equal(hasMoves(cellsFromGrid(withGap).cells, 4), true);
});

test('hasMoves does not pair cells across row ends', () => {
  const grid = [
    2, 4, 2, 4,
    4, 2, 4, 8,
    8, 4, 2, 4,
    4, 2, 4, 2,
  ];
  // index 7 (8) and index 8 (8) are only adjacent in the flat array.
  assert.equal(hasMoves(cellsFromGrid(grid).cells, 4), false);
});

test('emptyIndices, cellsFromGrid and isTileValue', () => {
  const { cells, nextId } = cellsFromGrid([0, 2, 0, 4], 7);
  assert.deepEqual(cells, [null, { id: 7, value: 2 }, null, { id: 8, value: 4 }]);
  assert.equal(nextId, 9);
  assert.deepEqual(emptyIndices(cells), [0, 2]);
  assert.deepEqual([2, 4, 2048, 131072].map(isTileValue), [true, true, true, true]);
  assert.deepEqual([0, 1, 3, 6, -2, 2.5, '2'].map(isTileValue), [false, false, false, false, false, false, false]);
});
