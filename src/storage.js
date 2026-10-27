/**
 * Tiny JSON key/value helper over localStorage. Every access is wrapped in
 * try/catch, so private mode, blocked storage or corrupt data never crash the
 * game. Nothing touches localStorage at import time.
 */

const PREFIX = '2048:';

/**
 * @typedef {object} Store
 * @property {<T>(key: string, fallback: T) => T} get parsed value, or `fallback` when missing or unreadable
 * @property {(key: string, value: unknown) => boolean} set false when the value could not be saved
 */

/**
 * Creates a store over a Web Storage-like backend.
 * @param {() => (Pick<Storage, 'getItem' | 'setItem'> | undefined)} [getBackend]
 *   called on every access; defaults to the browser's localStorage
 * @returns {Store}
 */
export function createStorage(getBackend = () => globalThis.localStorage) {
  return {
    get(key, fallback) {
      try {
        const raw = getBackend()?.getItem(PREFIX + key);
        return raw === null || raw === undefined ? fallback : JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        const backend = getBackend();
        if (!backend) return false;
        backend.setItem(PREFIX + key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
  };
}

/** Shared store backed by localStorage. */
export const storage = createStorage();
