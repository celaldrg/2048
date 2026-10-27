import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cellsFromGrid, gridFromCells, moveCells } from '../src/board.js';
import { UNDO_LIMIT, WIN_VALUE, createGame, restoreGame } from '../src/game.js';
import { createRng } from '../src/rng.js';

const ORDER = ['left', 'down', 'right', 'up'];

/** Grid with one row (from the left) and everything else empty. */
function rowGrid(row) {
  return [...row, ...new Array(12).fill(0)];
}

/** Makes one effective move, trying directions in a fixed order. */
function stepOnce(game) {
  for (const direction of ORDER) {
    const result = game.move(direction);
    if (result.moved) return { direction, result };
  }
  return null;
}

test('a new game starts with exactly two tiles of value 2 or 4', () => {
  for (let seed = 1; seed <= 50; seed += 1) {
    const { tiles, score, over, canUndo } = createGame({ seed }).getState();
    assert.equal(tiles.length, 2);
    assert.ok(tiles.every((tile) => tile.value === 2 || tile.value === 4));
    assert.notEqual(tiles[0].index, tiles[1].index);
    assert.deepEqual({ score, over, canUndo }, { score: 0, over: false, canUndo: false });
  }
});

test('the same seed gives the same game', () => {
  const a = createGame({ seed: 42 });
  const b = createGame({ seed: 42 });
  for (let i = 0; i < 30; i += 1) {
    assert.deepEqual(stepOnce(a), stepOnce(b));
  }
  assert.deepEqual(a.getState(), b.getState());
});

test('a no-op move does not spawn a tile and is not recorded', () => {
  const rng = createRng(5);
  const game = createGame({ rng, grid: rowGrid([2, 4, 0, 0]) });
  const before = game.getState();
  const rngBefore = rng.getState();
  const result = game.move('left');
  assert.equal(result.moved, false);
  assert.equal(result.spawned, null);
  assert.equal(result.gained, 0);
  assert.deepEqual(game.getState(), before);
  assert.equal(game.canUndo(), false);
  assert.equal(rng.getState(), rngBefore, 'no random number may be drawn');
});

test('an effective move adds score and spawns exactly one tile into an empty cell', () => {
  const game = createGame({ seed: 9, grid: rowGrid([2, 2, 4, 4]) });
  const result = game.move('left');
  assert.equal(result.moved, true);
  assert.equal(result.gained, 4 + 8);
  const { grid, score } = game.getState();
  assert.equal(score, 12);
  const slid = rowGrid([4, 8, 0, 0]);
  assert.equal(slid[result.spawned.index], 0, 'spawn cell was empty after the slide');
  assert.ok(result.spawned.value === 2 || result.spawned.value === 4);
  slid[result.spawned.index] = result.spawned.value;
  assert.deepEqual(grid, slid);
});

test('spawns only ever land in empty cells over long seeded games', () => {
  for (let seed = 1; seed <= 20; seed += 1) {
    const game = createGame({ seed });
    for (let i = 0; i < 200; i += 1) {
      const { cells, nextId } = cellsFromGrid(game.getState().grid);
      const step = stepOnce(game);
      if (!step) break;
      const slid = gridFromCells(moveCells(cells, 4, step.direction, nextId).cells);
      const { spawned } = step.result;
      assert.equal(slid[spawned.index], 0, `seed ${seed}, move ${i}`);
      slid[spawned.index] = spawned.value;
      assert.deepEqual(game.getState().grid, slid, `seed ${seed}, move ${i}`);
    }
  }
});

test('spawned tiles are 2 about 90% of the time and 4 otherwise', () => {
  let fours = 0;
  let total = 0;
  for (let seed = 1; seed <= 2000; seed += 1) {
    for (const tile of createGame({ seed }).getState().tiles) {
      total += 1;
      if (tile.value === 4) fours += 1;
    }
  }
  const ratio = fours / total;
  assert.ok(ratio > 0.07 && ratio < 0.13, `share of 4s was ${ratio}`);
});

test('game over is detected when the last move fills the board without merges', () => {
  const grid = [
    2, 4, 2, 4,
    4, 2, 4, 2,
    8, 16, 8, 16,
    32, 64, 32, 0,
  ];
  for (let seed = 1; seed <= 10; seed += 1) {
    const game = createGame({ seed, grid });
    assert.equal(game.getState().over, false);
    assert.equal(game.move('left').moved, false);
    const result = game.move('right');
    assert.equal(result.moved, true);
    assert.equal(result.over, true, `seed ${seed}`);
    assert.equal(game.getState().over, true);
    for (const direction of ORDER) assert.equal(game.move(direction).moved, false);
  }
});

test('a full board with a possible merge is not game over', () => {
  const grid = [
    2, 4, 2, 4,
    4, 2, 4, 2,
    2, 4, 2, 4,
    4, 2, 4, 4,
  ];
  assert.equal(createGame({ seed: 1, grid }).getState().over, false);
});

test(`creating ${WIN_VALUE} wins once, then play can continue`, () => {
  const game = createGame({ seed: 3, grid: [1024, 1024, 0, 0, 1024, 1024, 0, 0, ...new Array(8).fill(0)] });
  const first = game.move('left');
  assert.equal(first.justWon, true);
  assert.equal(first.merges.filter((m) => m.value === WIN_VALUE).length, 2);
  assert.deepEqual(
    [game.getState().won, game.getState().keepPlaying],
    [true, false],
  );
  game.keepPlaying();
  assert.equal(game.getState().keepPlaying, true);
  const second = game.move('up'); // 2048 + 2048 -> 4096
  assert.equal(second.moved, true);
  assert.ok(second.merges.some((m) => m.value === 4096));
  assert.equal(second.justWon, false);
  assert.equal(game.getState().won, true);
});

test('keepPlaying has no effect before the game is won', () => {
  const game = createGame({ seed: 3 });
  game.keepPlaying();
  assert.equal(game.getState().keepPlaying, false);
});

test('undoing the winning move does not grant a second win', () => {
  const game = createGame({ seed: 4, grid: rowGrid([1024, 1024, 0, 0]) });
  assert.equal(game.move('left').justWon, true);
  assert.equal(game.undo(), true);
  assert.deepEqual(game.getState().grid, rowGrid([1024, 1024, 0, 0]));
  assert.equal(game.getState().won, true);
  assert.equal(game.move('left').justWon, false);
});

test('undo restores board, score and RNG exactly, at least 10 steps back', () => {
  const game = createGame({ seed: 77 });
  const states = [game.getState()];
  const saves = [game.serialize().current];
  const steps = [];
  for (let i = 0; i < 15; i += 1) {
    steps.push(stepOnce(game));
    states.push(game.getState());
    saves.push(game.serialize().current);
  }
  for (let i = 15; i > 0; i -= 1) {
    assert.equal(game.undo(), true, `undo #${16 - i}`);
    assert.deepEqual(game.getState(), states[i - 1]);
    assert.deepEqual(game.serialize().current, saves[i - 1], 'ids, score and RNG state restored');
  }
  assert.equal(game.undo(), false);
  assert.equal(game.canUndo(), false);
  // Replaying the same moves reproduces the same spawns because the RNG was rewound.
  for (let i = 0; i < 15; i += 1) {
    assert.deepEqual(game.move(steps[i].direction), steps[i].result);
    assert.deepEqual(game.getState(), states[i + 1]);
  }
});

test(`undo history keeps the last ${UNDO_LIMIT} moves by default`, () => {
  const game = createGame({ seed: 11 });
  for (let i = 0; i < UNDO_LIMIT + 5; i += 1) assert.ok(stepOnce(game));
  let undone = 0;
  while (game.undo()) undone += 1;
  assert.equal(undone, UNDO_LIMIT);
  assert.ok(UNDO_LIMIT >= 10);
});

test('undoLimit option caps the history', () => {
  const game = createGame({ seed: 11, undoLimit: 3 });
  for (let i = 0; i < 6; i += 1) stepOnce(game);
  let undone = 0;
  while (game.undo()) undone += 1;
  assert.equal(undone, 3);
});

test('undo after game over brings the game back', () => {
  const grid = [
    2, 4, 2, 4,
    4, 2, 4, 2,
    8, 16, 8, 16,
    32, 64, 32, 0,
  ];
  const game = createGame({ seed: 2, grid });
  assert.equal(game.move('right').over, true);
  assert.equal(game.undo(), true);
  assert.equal(game.getState().over, false);
  assert.deepEqual(game.getState().grid, grid);
});

test('serialize and restoreGame round-trip through JSON, including undo history', () => {
  const game = createGame({ seed: 123 });
  for (let i = 0; i < 12; i += 1) stepOnce(game);
  const restored = restoreGame(JSON.parse(JSON.stringify(game.serialize())));
  assert.ok(restored);
  assert.deepEqual(restored.getState(), game.getState());
  for (let i = 0; i < 10; i += 1) assert.deepEqual(stepOnce(restored), stepOnce(game));
  for (let i = 0; i < 12; i += 1) {
    assert.equal(restored.undo(), game.undo());
    assert.deepEqual(restored.getState(), game.getState());
  }
});

test('serialize returns a copy that callers cannot use to change the game', () => {
  const game = createGame({ seed: 8 });
  stepOnce(game);
  const before = game.getState();
  const save = game.serialize();
  save.current.cells.fill(null);
  save.history[0].cells.fill(null);
  assert.deepEqual(game.getState(), before);
  game.undo();
  assert.equal(game.getState().tiles.length, 2);
});

test('restoreGame rejects missing or corrupt data', () => {
  const good = createGame({ seed: 5 }).serialize();
  const corrupt = [
    null,
    undefined,
    'save',
    {},
    { ...good, version: 99 },
    { ...good, won: 'no' },
    { ...good, history: 'none' },
    { ...good, current: { ...good.current, cells: good.current.cells.slice(1) } },
    { ...good, current: { ...good.current, score: -1 } },
    { ...good, current: { ...good.current, rngState: 2 ** 32 } },
    { ...good, current: { ...good.current, cells: good.current.cells.map((c) => c && { ...c, value: 3 }) } },
    { ...good, current: { ...good.current, cells: good.current.cells.map((c) => c && { ...c, id: 1 }) } },
    { ...good, current: { ...good.current, nextId: 1 } },
    { ...good, history: [{ cells: [] }] },
  ];
  for (const data of corrupt) assert.equal(restoreGame(data), null, JSON.stringify(data)?.slice(0, 80));
  assert.ok(restoreGame(good));
});

test('createGame validates a preset grid and rejects unknown directions', () => {
  assert.throws(() => createGame({ seed: 1, grid: [2, 2] }), RangeError);
  assert.throws(() => createGame({ seed: 1, grid: rowGrid([3, 0, 0, 0]) }), RangeError);
  assert.throws(() => createGame({ seed: 1 }).move('sideways'), RangeError);
});

test('getState returns a fresh object each time', () => {
  const game = createGame({ seed: 6 });
  const view = game.getState();
  view.grid.fill(0);
  view.tiles.length = 0;
  assert.equal(game.getState().tiles.length, 2);
  assert.deepEqual(
    game.getState().tiles.map(({ index, row, col }) => index === row * 4 + col),
    [true, true],
  );
});
