/**
 * @fileoverview Request-scoped context using AsyncLocalStorage.
 *
 * Provides a safe, mutation-resistant store for per-request data.
 * The store is initialized by the handler and is accessible from any
 * code running within the same async execution context (middleware, handlers,
 * service functions, etc.) without needing to thread parameters through.
 *
 * @example
 * // In a middleware or handler:
 * import { getRequestId, getRequestStore } from '../server/context/request-context.js';
 * const requestId = getRequestId(); // 'abc-123...' or 'no-context'
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

/** @type {AsyncLocalStorage<{ requestId: string, startTime: number }>} */
export const requestContext = new AsyncLocalStorage();

/**
 * Returns the current request ID from async context, or 'no-context' if called
 * outside of an active request (e.g., during startup).
 * @returns {string}
 */
export function getRequestId() {
  return requestContext.getStore()?.requestId ?? 'no-context';
}

/**
 * Returns the full request store, or null if not in a request context.
 * @returns {{ requestId: string, startTime: number } | undefined}
 */
export function getRequestStore() {
  return requestContext.getStore();
}

/**
 * Middleware that initializes the per-request AsyncLocalStorage store.
 * Must be the first global middleware registered via app.midair().
 *
 * @param {import('../ammo.js').default} ammo
 * @param {function(): Promise<void>} next
 */
export function contextMiddleware(ammo, next) {
  const store = {
    requestId: randomUUID(),
    startTime: Date.now(),
  };
  return requestContext.run(store, next);
}
