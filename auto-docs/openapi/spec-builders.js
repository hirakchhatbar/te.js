/**
 * Pure OpenAPI 3.0 schema and operation builders for auto-documentation.
 * No LLM, file I/O, or registry dependencies.
 */

import { ALL_METHODS } from '../analysis/handler-analyzer.js';
import { METHOD_KEYS } from '../constants.js';

/**
 * Returns true if the object is method-keyed metadata (keys are HTTP methods, values are { summary?, description?, request?, response? }).
 * @param {object} obj - Parsed LLM response
 * @returns {boolean}
 */
export function isMethodKeyed(obj) {
  if (!obj || typeof obj !== 'object') return false;
  for (const key of Object.keys(obj)) {
    if (METHOD_KEYS.has(key.toLowerCase())) {
      const val = obj[key];
      if (
        val &&
        typeof val === 'object' &&
        (val.summary != null || val.response != null)
      )
        return true;
    }
  }
  return false;
}

/**
 * Convert te.js path pattern to OpenAPI path (e.g. /users/:id -> /users/{id}).
 * @param {string} path - Route path possibly containing :param segments
 * @returns {string}
 */
export function toOpenAPIPath(path) {
  if (!path || typeof path !== 'string') return '/';
  return path.replace(/:([^/]+)/g, '{$1}');
}

/**
 * Extract path parameter definitions from a te.js path for OpenAPI.
 * @param {string} path - Route path (e.g. /users/:id)
 * @returns {Array<{ name: string, in: string, required: boolean, schema: object }>}
 */
export function getPathParameters(path) {
  if (!path || typeof path !== 'string') return [];
  const params = [];
  const segmentRegex = /:([^/]+)/g;
  let match;
  while ((match = segmentRegex.exec(path)) !== null) {
    params.push({
      name: match[1],
      in: 'path',
      required: true,
      description: `Path parameter: ${match[1]}`,
      schema: { type: 'string' },
    });
  }
  return params;
}

/**
 * Build OpenAPI query parameter list from request.query metadata.
 * @param {object} queryMeta - e.g. { limit: { type: 'integer', required: false }, q: { type: 'string', required: true } }
 * @returns {Array<{ name: string, in: string, required: boolean, description?: string, schema: object }>}
 */
export function getQueryParameters(queryMeta) {
  if (!queryMeta || typeof queryMeta !== 'object') return [];
  const params = [];
  for (const [name, spec] of Object.entries(queryMeta)) {
    if (!spec || typeof spec !== 'object' || !spec.type) continue;
    params.push({
      name,
      in: 'query',
      required: spec.required === true || spec.required === 'true',
      ...(spec.description && { description: spec.description }),
      schema: { type: spec.type, ...(spec.format && { format: spec.format }) },
    });
  }
  return params;
}

/**
 * Convert simple metadata schema (field -> { type, description? }) to OpenAPI schema.
 * @param {object} meta - e.g. { name: { type: 'string' }, email: { type: 'string' } }
 * @returns {object} OpenAPI schema with properties
 */
export function buildSchemaFromMetadata(meta) {
  if (!meta || typeof meta !== 'object') return {};
  const properties = Object.create(null);
  const required = [];
  for (const [key, value] of Object.entries(meta)) {
    if (value && typeof value === 'object' && value.type) {
      properties[key] = {
        type: value.type,
        ...(value.description && { description: value.description }),
        ...(value.format && { format: value.format }),
      };
      if (value.required === true || value.required === 'true')
        required.push(key);
    }
  }
  if (Object.keys(properties).length === 0) return {};
  return {
    type: 'object',
    properties,
    ...(required.length > 0 && { required }),
  };
}

/**
 * Build request body schema for an operation from metadata or empty.
 * @param {object} requestMeta - metadata.request (body schema)
 * @returns {object|undefined} OpenAPI requestBody or undefined
 */
export function buildRequestBody(requestMeta) {
  if (!requestMeta?.body || typeof requestMeta.body !== 'object')
    return undefined;
  const schema = buildSchemaFromMetadata(requestMeta.body);
  if (!schema || Object.keys(schema).length === 0) return undefined;
  return {
    required: true,
    content: {
      'application/json': {
        schema,
      },
    },
  };
}

/**
 * Build response object for an operation from metadata.
 * @param {object} responseMeta - metadata.response (e.g. { 200: { description, schema? }, 201: { ... } })
 * @returns {object} OpenAPI responses
 */
export function buildResponses(responseMeta) {
  const responses = Object.create(null);
  if (!responseMeta || typeof responseMeta !== 'object') {
    responses['200'] = { description: 'Success' };
    return responses;
  }
  for (const [code, spec] of Object.entries(responseMeta)) {
    if (!spec || typeof spec !== 'object') continue;
    responses[String(code)] = {
      description: spec.description || `Response ${code}`,
      ...(spec.schema && {
        content: {
          'application/json': {
            schema:
              typeof spec.schema === 'object' && spec.schema.type
                ? spec.schema
                : { type: 'object' },
          },
        },
      }),
    };
  }
  if (Object.keys(responses).length === 0) {
    responses['200'] = { description: 'Success' };
  }
  return responses;
}

/**
 * Returns true when the endpoint accepts all standard HTTP methods (method-agnostic).
 * @param {string[]} methods
 * @returns {boolean}
 */
export function isMethodAgnostic(methods) {
  if (!Array.isArray(methods) || methods.length !== ALL_METHODS.length)
    return false;
  const set = new Set(methods.map((m) => m.toUpperCase()));
  return ALL_METHODS.every((m) => set.has(m));
}

/**
 * Build a single OpenAPI operation for one HTTP method.
 * @param {string} method - HTTP method (GET, POST, etc.)
 * @param {object} meta - Merged metadata (explicit + LLM-enhanced): summary, description?, request?, response?
 * @param {Array} pathParams - Path parameters for this path
 * @param {object} [options] - { methodAgnostic?: boolean } - when true, description notes all accepted methods
 * @returns {object} OpenAPI operation object
 */
export function buildOperation(method, meta, pathParams, options = {}) {
  const { methodAgnostic = false } = options;
  let description = meta.description || '';
  if (methodAgnostic) {
    const methodList = ALL_METHODS.join(', ');
    description = description
      ? `${description}\n\nAccepts any HTTP method: ${methodList}.`
      : `Accepts any HTTP method: ${methodList}.`;
  }
  const queryParams = getQueryParameters(meta.request?.query);
  const allParams = [...pathParams, ...queryParams];
  const op = {
    summary: meta.summary || '',
    ...(description && { description }),
    parameters: allParams.length > 0 ? allParams : undefined,
  };
  const methodUpper = method.toUpperCase();
  const body = buildRequestBody(meta.request);
  if (
    body &&
    (methodAgnostic || (methodUpper !== 'GET' && methodUpper !== 'HEAD'))
  ) {
    op.requestBody = body;
  }
  op.responses = buildResponses(meta.response);
  return op;
}

/**
 * Merge explicit endpoint metadata with LLM-enhanced result.
 * @param {object} explicit - From endpoint.getMetadata()
 * @param {object} enhanced - From llm.enhanceEndpointDocs() or per-method enhancer
 * @param {object} [options] - { preferEnhanced?: boolean } - when true (level 2), LLM response wins over explicit
 * @returns {object}
 */
export function mergeMetadata(explicit, enhanced, options = {}) {
  const preferEnhanced = options.preferEnhanced === true;
  const summary = preferEnhanced
    ? enhanced?.summary ?? explicit?.summary ?? ''
    : explicit?.summary ?? enhanced?.summary ?? '';
  const description = preferEnhanced
    ? enhanced?.description ?? explicit?.description ?? ''
    : explicit?.description ?? enhanced?.description ?? '';
  const request = preferEnhanced
    ? enhanced?.request ?? explicit?.request
    : explicit?.request ?? enhanced?.request;
  const response = preferEnhanced
    ? enhanced?.response ?? explicit?.response
    : explicit?.response ?? enhanced?.response;
  return {
    summary: summary || 'Endpoint',
    description: description || undefined,
    ...(request && { request }),
    ...(response && { response }),
  };
}

/**
 * Merge method-keyed metadata for a method-agnostic endpoint into a single meta (preferred order).
 * @param {Map<string,object>} metaByMethod
 * @param {string[]} methods
 * @param {object} fallbackMeta
 * @returns {object}
 */
export function mergeMethodAgnosticMeta(metaByMethod, methods, fallbackMeta) {
  const preferredOrder = [
    'post',
    'put',
    'patch',
    'get',
    'delete',
    'head',
    'options',
  ];
  for (const k of preferredOrder) {
    const m = metaByMethod.get(k);
    if (m && (m.summary || m.description)) return m;
  }
  const first = metaByMethod.values().next().value;
  return first || fallbackMeta;
}
