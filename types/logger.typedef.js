/**
 * @fileoverview ILogger interface definition.
 *
 * Any logging implementation injected into the framework MUST satisfy
 * this contract. The default implementation is `tej-logger`.
 */

/**
 * @typedef {Object} ILogger
 * @property {function(string, ...unknown): void} info  - Log an informational message
 * @property {function(string, ...unknown): void} warn  - Log a warning
 * @property {function(string, ...unknown): void} error - Log an error
 * @property {function(string, ...unknown): void} debug - Log a debug message
 * @property {function(string, ...unknown): void} fatal - Log a fatal message (before process exit)
 */

export {};
