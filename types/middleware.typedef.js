/**
 * @fileoverview IMiddleware interface definition.
 *
 * All middleware functions registered via `app.midair()` or `target.midair()`
 * MUST satisfy one of these two signatures.
 */

/**
 * te.js-native middleware signature: receives the Ammo context object and a next function.
 * @callback IAmmoMiddleware
 * @param {import('../server/ammo.js').default} ammo - The request/response context
 * @param {function(): Promise<void>} next            - Call to proceed to the next middleware
 * @returns {Promise<void>|void}
 */

/**
 * Express-compatible middleware signature: receives raw req, res, and next.
 * @callback IExpressMiddleware
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse}  res
 * @param {function(): Promise<void>}            next
 * @returns {Promise<void>|void}
 */

/**
 * @typedef {IAmmoMiddleware|IExpressMiddleware} IMiddleware
 */

export {};
