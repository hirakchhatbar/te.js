/**
 * @fileoverview ICacheStore interface definition.
 *
 * Any cache backend (Redis, in-memory, etc.) injected into the framework
 * MUST satisfy this contract. Validate at construction time with:
 *
 * ```js
 * if (typeof cache?.get !== 'function' || typeof cache?.set !== 'function') {
 *   throw new TejError(500, 'ERR_INVALID_DEPENDENCY');
 * }
 * ```
 */

/**
 * @typedef {Object} ICacheStore
 * @property {function(string): Promise<any>}                    get    - Retrieve a value by key; resolves to null if not found
 * @property {function(string, any, number=): Promise<void>}     set    - Store a value; optional TTL in seconds
 * @property {function(string): Promise<void>}                   delete - Remove a key
 * @property {function(): Promise<void>}                         clear  - Flush all keys
 */

export {};
