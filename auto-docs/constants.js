/**
 * Shared constants for auto-documentation.
 * Centralizes OpenAPI version, method keys, and token/character limits.
 */

/** OpenAPI 3.0 version string */
export const OPENAPI_VERSION = '3.0.3';

/** Lowercase HTTP method names (for method-keyed LLM response detection and OpenAPI operation keys). */
export const METHOD_KEYS = new Set(['get', 'put', 'post', 'delete', 'patch', 'head', 'options']);

/** When an endpoint accepts all HTTP methods, document it once under this key. */
export const METHOD_AGNOSTIC_OPERATION_KEY = 'get';

/** Max handler source length by level (chars; tokens roughly scale). Level 1 = moderate, 2 = high. */
export const HANDLER_SOURCE_MAX_LENGTH_BY_LEVEL = { 1: 2800, 2: 6000 };

/** Default max chars for dependency context in formatDependencyContext and level-2 prompts. */
export const DEPENDENCY_CONTEXT_MAX_CHARS = 6000;

/** Max handler source chars in single-endpoint enhance prompts (no deps). */
export const PROMPT_HANDLER_SLICE = 3000;

/** Max handler source chars in single-endpoint enhance prompts (with deps). */
export const PROMPT_HANDLER_SLICE_WITH_DEPS = 4000;

/** Max dependency source chars included in enhance/summarize prompts. */
export const PROMPT_DEPENDENCY_SLICE = 5000;

/** Max total code chars in group-summary prompt when no dependency context. */
export const PROMPT_GROUP_CODE_LIMIT = 4000;

/** Max total code chars in group-summary prompt when dependency context is present. */
export const PROMPT_GROUP_CODE_LIMIT_WITH_DEPS = 6000;

/** Max handler source chars per endpoint in group-summary code snippets. */
export const PROMPT_GROUP_SNIPPET_CHARS = 800;
