/**
 * User-facing strings in English and Turkish.
 * Pure data and lookups: no DOM access, so tests can import it.
 */

/** Supported language codes; the first one is the default. */
export const LANGUAGES = Object.freeze(['en', 'tr']);

/** Language used on a first visit. */
export const DEFAULT_LANGUAGE = 'en';

/** Every visible string, keyed by language and then by string key. */
export const STRINGS = Object.freeze({
  en: Object.freeze({
    docTitle: '2048 - slide and merge puzzle',
    tagline: 'Slide the tiles, merge equal numbers and build the 2048 tile.',
    newGame: 'New game',
    undo: 'Undo',
    score: 'Score',
    best: 'Best',
    langToggle: 'TR',
    langToggleLabel: 'TR – switch to Turkish',
    boardLabel: 'Game board',
    howTitle: 'How to play',
    howMove: 'Arrow keys or WASD slide every tile at once.',
    howSwipe: 'On a touch screen, swipe across the board.',
    howMerge: 'Two equal tiles merge into one: 8 + 8 = 16.',
    howUndo: 'Undo (U or Z) steps back up to 20 moves.',
    winTitle: 'You made 2048!',
    winText: 'Keep going for a bigger tile or start a fresh game.',
    keepPlaying: 'Keep playing',
    overTitle: 'Game over',
    overText: 'No moves left. Undo a few steps or try again.',
    tryAgain: 'Try again',
    license: 'MIT',
    source: 'Source on GitHub',
  }),
  tr: Object.freeze({
    docTitle: '2048 - kaydır ve birleştir bulmacası',
    tagline: 'Taşları kaydır, eşit sayıları birleştir ve 2048 taşını yap.',
    newGame: 'Yeni oyun',
    undo: 'Geri al',
    score: 'Skor',
    best: 'En iyi',
    langToggle: 'EN',
    langToggleLabel: 'EN – İngilizceye geç',
    boardLabel: 'Oyun tahtası',
    howTitle: 'Nasıl oynanır',
    howMove: 'Ok tuşları veya WASD tüm taşları aynı anda kaydırır.',
    howSwipe: 'Dokunmatik ekranda parmağını tahtanın üzerinde kaydır.',
    howMerge: 'Eşit iki taş birleşip tek taş olur: 8 + 8 = 16.',
    howUndo: 'Geri al (U veya Z) en fazla 20 hamle geri gider.',
    winTitle: '2048 yaptın!',
    winText: 'Daha büyük bir taş için devam et ya da yeni bir oyuna başla.',
    keepPlaying: 'Devam et',
    overTitle: 'Oyun bitti',
    overText: 'Hamle kalmadı. Birkaç adım geri al ya da yeniden dene.',
    tryAgain: 'Yeniden dene',
    license: 'MIT',
    source: "GitHub'da kaynak kodu",
  }),
});

/**
 * Turns any stored or requested value into a supported language code.
 * @param {unknown} value
 * @returns {'en' | 'tr'}
 */
export function normalizeLanguage(value) {
  return LANGUAGES.includes(value) ? value : DEFAULT_LANGUAGE;
}

/**
 * Returns the language the toggle button switches to.
 * @param {string} language
 * @returns {'en' | 'tr'}
 */
export function otherLanguage(language) {
  return normalizeLanguage(language) === 'en' ? 'tr' : 'en';
}

/**
 * Looks up a string; falls back to English, then to the key itself.
 * @param {string} language
 * @param {string} key
 * @returns {string}
 */
export function translate(language, key) {
  const table = STRINGS[normalizeLanguage(language)];
  if (Object.hasOwn(table, key)) return table[key];
  return Object.hasOwn(STRINGS.en, key) ? STRINGS.en[key] : key;
}
