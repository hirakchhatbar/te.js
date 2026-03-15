/**
 * @fileoverview IPlugin interface definition.
 *
 * Any plugin registered with the Tejas framework MUST satisfy this contract.
 */

/**
 * @typedef {Object} IPlugin
 * @property {string}                         name       - Unique plugin identifier
 * @property {function(): Promise<void>}      initialize - Called once when the plugin is loaded
 * @property {function(): Promise<void>}      [destroy]  - Optional cleanup when the framework shuts down
 */

export {};
