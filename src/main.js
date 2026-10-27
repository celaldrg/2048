/**
 * Entry point: connects the pure game logic to the page — board view, score
 * HUD, overlays, buttons, keyboard/touch input, language and saved state.
 */

import { BOARD_SIZE, createGame, restoreGame } from './game.js';
import { createDemoGame } from './demo.js';
import { createStorage, storage } from './storage.js';
import { normalizeLanguage, otherLanguage, translate } from './i18n.js';
import { createBoardView } from './view.js';
import { bindInput } from './input.js';

const SAVE_KEY = 'game';
const BEST_KEY = 'best';
const LANGUAGE_KEY = 'lang';
/** How long the "+N" score float stays; matches its animation in style.css. */
const FLOAT_MS = 800;

/** Button actions, looked up from each button's data-action attribute. */
const ACTIONS = new Map([
  ['new-game', newGame],
  ['undo', undo],
  ['keep-playing', keepPlaying],
  ['toggle-language', toggleLanguage],
]);

/** Starts the app once; module scripts run after the document is parsed. */
function start() {
  const demo = new URLSearchParams(window.location.search).has('demo');
  // The demo position must never overwrite a real saved game or best score.
  const store = demo ? createStorage(() => undefined) : storage;
  const game = demo ? createDemoGame() : (restoreGame(store.get(SAVE_KEY, null)) ?? createGame());
  const ui = findElements();
  const app = {
    store,
    ui,
    game,
    view: createBoardView(ui.board, BOARD_SIZE),
    best: Math.max(readBest(store), game.getState().score),
    language: normalizeLanguage(store.get(LANGUAGE_KEY, null)),
    overlay: null,
  };
  applyLanguage(app);
  app.view.reset(game.getState());
  render(app);
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (button && !button.disabled) ACTIONS.get(button.dataset.action)?.(app);
  });
  bindInput({ board: ui.board, onMove: (direction) => move(app, direction), onUndo: () => undo(app) });
}

function findElements() {
  const byId = (id) => document.getElementById(id);
  return {
    board: byId('board'),
    score: byId('score'),
    scoreBox: byId('score-box'),
    best: byId('best'),
    bestBox: byId('best-box'),
    winOverlay: byId('win-overlay'),
    overOverlay: byId('over-overlay'),
    status: byId('status'),
    undoButtons: document.querySelectorAll('[data-action="undo"]'),
  };
}

function readBest(store) {
  const best = store.get(BEST_KEY, 0);
  return Number.isSafeInteger(best) && best > 0 ? best : 0;
}

function move(app, direction) {
  if (app.overlay === 'win') return;
  const result = app.game.move(direction);
  if (!result.moved) return;
  app.view.animate(result);
  if (result.gained > 0) showGain(app.ui.scoreBox, result.gained);
  const previousBest = app.best;
  app.best = Math.max(app.best, app.game.getState().score);
  if (app.best > previousBest) showGain(app.ui.bestBox, app.best - previousBest);
  save(app);
  render(app);
}

function undo(app) {
  if (!app.game.undo()) return;
  app.view.sync(app.game.getState());
  save(app);
  render(app);
}

function newGame(app) {
  app.game = createGame();
  app.view.reset(app.game.getState());
  save(app);
  render(app);
}

function keepPlaying(app) {
  app.game.keepPlaying();
  save(app);
  render(app);
}

function toggleLanguage(app) {
  app.language = otherLanguage(app.language);
  app.store.set(LANGUAGE_KEY, app.language);
  applyLanguage(app);
}

function save(app) {
  app.store.set(SAVE_KEY, app.game.serialize());
  app.store.set(BEST_KEY, app.best);
}

/** Updates the score HUD, the undo buttons and the overlays from the game state. */
function render(app) {
  const state = app.game.getState();
  app.ui.score.textContent = String(state.score);
  app.ui.best.textContent = String(app.best);
  app.ui.undoButtons.forEach((button) => {
    button.disabled = !state.canUndo;
  });
  showOverlay(app, overlayFor(state));
}

/** @returns {'win' | 'over' | null} */
function overlayFor(state) {
  if (state.over) return 'over';
  if (state.won && !state.keepPlaying) return 'win';
  return null;
}

function showOverlay(app, kind) {
  if (kind === app.overlay) return;
  app.overlay = kind;
  app.ui.winOverlay.hidden = kind !== 'win';
  app.ui.overOverlay.hidden = kind !== 'over';
  announce(app);
  const shown = kind === 'win' ? app.ui.winOverlay : kind === 'over' ? app.ui.overOverlay : null;
  shown?.querySelector('.btn-primary').focus({ preventScroll: true });
}

/** Tells screen readers about a win or a game over. */
function announce(app) {
  const key = { win: 'winTitle', over: 'overTitle' }[app.overlay];
  app.ui.status.textContent = key ? translate(app.language, key) : '';
}

/** Translates every [data-i18n] text and [data-i18n-aria] label, the title and <html lang>. */
function applyLanguage(app) {
  const { language } = app;
  document.documentElement.lang = language;
  document.title = translate(language, 'docTitle');
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    element.textContent = translate(language, element.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-aria]').forEach((element) => {
    element.setAttribute('aria-label', translate(language, element.dataset.i18nAria));
  });
  announce(app);
}

/** Floats a "+N" above a score box. */
function showGain(box, gained) {
  const float = document.createElement('span');
  float.className = 'score-float';
  float.setAttribute('aria-hidden', 'true');
  float.textContent = `+${gained}`;
  box.append(float);
  window.setTimeout(() => float.remove(), FLOAT_MS);
}

start();
