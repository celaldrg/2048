import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULT_LANGUAGE, LANGUAGES, STRINGS, normalizeLanguage, otherLanguage, translate } from '../src/i18n.js';
import { UNDO_LIMIT } from '../src/game.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('English and Turkish define the same non-empty keys', () => {
  const english = Object.keys(STRINGS.en).sort();
  for (const language of LANGUAGES) {
    assert.deepEqual(Object.keys(STRINGS[language]).sort(), english, language);
    for (const key of english) assert.ok(STRINGS[language][key].trim(), `${language}.${key} is empty`);
  }
});

test('English is the default and unknown languages fall back to it', () => {
  assert.equal(DEFAULT_LANGUAGE, 'en');
  assert.equal(normalizeLanguage(null), 'en');
  assert.equal(normalizeLanguage('de'), 'en');
  assert.equal(normalizeLanguage('tr'), 'tr');
  assert.equal(translate('xx', 'undo'), 'Undo');
  assert.equal(translate('tr', 'undo'), 'Geri al');
  assert.equal(translate('en', 'constructor'), 'constructor');
});

test('the language toggle shows the other language', () => {
  assert.equal(otherLanguage('en'), 'tr');
  assert.equal(otherLanguage('tr'), 'en');
  assert.equal(translate('en', 'langToggle'), 'TR');
  assert.equal(translate('tr', 'langToggle'), 'EN');
});

test('every translatable element in index.html has a key and English default text', () => {
  const texts = [...html.matchAll(/data-i18n="([^"]+)"[^>]*>([^<]*)</g)];
  assert.ok(texts.length >= 15, 'index.html marks its strings with data-i18n');
  for (const [, key, text] of texts) assert.equal(text.trim(), STRINGS.en[key], key);

  const labels = html.match(/<[^>]*data-i18n-aria="[^"]+"[^>]*>/g) ?? [];
  assert.ok(labels.length >= 2);
  for (const tag of labels) {
    const key = tag.match(/data-i18n-aria="([^"]+)"/)[1];
    assert.equal(tag.match(/aria-label="([^"]*)"/)?.[1], STRINGS.en[key], key);
  }

  assert.equal(html.match(/<title>([^<]*)<\/title>/)[1], STRINGS.en.docTitle);
});

test('the help text states the real undo limit', () => {
  for (const language of LANGUAGES) assert.match(STRINGS[language].howUndo, new RegExp(`\\b${UNDO_LIMIT}\\b`));
});
