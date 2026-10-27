import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BOARD_SIZE } from '../src/game.js';

const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');

/** Largest tile the board can ever hold: a chain through every cell that ends in a spawned 4. */
const LARGEST_TILE = 2 ** (BOARD_SIZE * BOARD_SIZE + 1);

/** Maps each `.tile[data-value="N"]` rule in style.css to its --tile-bg value. */
function tileBackgrounds() {
  const backgrounds = new Map();
  for (const [, value, body] of css.matchAll(/\.tile\[data-value="(\d+)"\]\s*\{([^}]*)\}/g)) {
    backgrounds.set(Number(value), body.match(/--tile-bg:\s*([^;]+);/)?.[1].trim());
  }
  return backgrounds;
}

test(`every tile value from 2 to ${LARGEST_TILE} has its own colour`, () => {
  const backgrounds = tileBackgrounds();
  const owners = new Map();
  for (let value = 2; value <= LARGEST_TILE; value *= 2) {
    const background = backgrounds.get(value);
    assert.ok(background, `${value} has a --tile-bg rule`);
    assert.equal(owners.get(background), undefined, `${value} reuses the colour of ${owners.get(background)}`);
    owners.set(background, value);
  }
});
