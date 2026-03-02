/**
 * Per-endpoint processing for OpenAPI spec: extract info, resolve deps, LLM enhance, build path ops and tag descriptions.
 */

import { analyzeHandler } from '../analysis/handler-analyzer.js';
import {
  resolveDependencySources,
  formatDependencyContext,
  resolveTargetFilePath,
} from '../analysis/source-resolver.js';
import {
  HANDLER_SOURCE_MAX_LENGTH_BY_LEVEL,
  DEPENDENCY_CONTEXT_MAX_CHARS,
  METHOD_AGNOSTIC_OPERATION_KEY,
} from '../constants.js';
import { stripLlmUsage } from '../utils/strip-usage.js';
import {
  isMethodKeyed,
  toOpenAPIPath,
  getPathParameters,
  isMethodAgnostic,
  mergeMetadata,
  mergeMethodAgnosticMeta,
  buildOperation,
} from './spec-builders.js';

/**
 * Extract path, handler, metadata, methods, groupId, tag from a registry target.
 * @param {object} target - Endpoint-like with getPath(), getHandler(), getMetadata(), getGroup?()
 * @returns {{ path: string, handler: function|null, explicitMeta: object, methods: string[], groupId: string|null, tag: string }}
 */
export function extractTargetInfo(target) {
  const path = target.getPath();
  const handler = target.getHandler();
  const explicitMeta = target.getMetadata() || {};
  const analyzed = analyzeHandler(handler);
  const methods = Array.isArray(explicitMeta.methods) && explicitMeta.methods.length > 0
    ? explicitMeta.methods
    : analyzed.methods;
  const groupId = target.getGroup?.() ?? null;
  const tag = groupId != null && groupId !== '' ? groupId : 'default';
  return { path, handler, explicitMeta, methods, groupId, tag };
}

/**
 * Slice handler source to max length for the given level.
 * @param {function|null} handler
 * @param {number} effectiveLevel
 * @returns {string}
 */
export function resolveHandlerSource(handler, effectiveLevel) {
  const raw = typeof handler === 'function' ? handler.toString() : '';
  const max = HANDLER_SOURCE_MAX_LENGTH_BY_LEVEL[effectiveLevel] ?? 2800;
  return raw.slice(0, max);
}

/**
 * Resolve and cache dependency context for a group. Mutates cache.
 * @param {string|null} groupId
 * @param {string} tag
 * @param {number} effectiveLevel
 * @param {string} dirTargets
 * @param {Map<string,string>} cache - dependencyContextByGroup
 * @returns {Promise<string>}
 */
export async function resolveDependencyContext(groupId, tag, effectiveLevel, dirTargets, cache) {
  if (effectiveLevel !== 2 || !groupId) return '';
  if (cache.has(tag)) return cache.get(tag) || '';
  try {
    const sources = await resolveDependencySources(groupId, dirTargets);
    const targetPath = resolveTargetFilePath(groupId, dirTargets);
    const context = formatDependencyContext(sources, targetPath, DEPENDENCY_CONTEXT_MAX_CHARS);
    cache.set(tag, context);
    return context;
  } catch {
    cache.set(tag, '');
    return '';
  }
}

/**
 * Call LLM to enhance endpoint metadata. Returns { meta, metaByMethod }.
 * @param {object} endpointInfo - { path, methods, metadata, handlerSource, dependencySources? }
 * @param {object} llm
 * @param {object} explicitMeta
 * @param {boolean} preferEnhanced
 * @param {string[]} methods
 * @param {string} path
 * @param {function} log
 * @returns {Promise<{ meta: object, metaByMethod: Map<string,object>|null }>}
 */
export async function enhanceWithLlm(endpointInfo, llm, explicitMeta, preferEnhanced, methods, path, log) {
  let meta = {
    summary: explicitMeta.summary || path || 'Endpoint',
    description: explicitMeta.description,
    request: explicitMeta.request,
    response: explicitMeta.response,
  };
  let metaByMethod = null;
  try {
    if (typeof llm.enhanceEndpointDocsPerMethod === 'function') {
      const rawPerMethod = await llm.enhanceEndpointDocsPerMethod(endpointInfo);
      const cleaned = stripLlmUsage(rawPerMethod);
      if (cleaned && isMethodKeyed(cleaned)) {
        metaByMethod = new Map();
        for (const m of methods) {
          const k = m.toLowerCase();
          metaByMethod.set(k, mergeMetadata(explicitMeta, cleaned[k] || {}, { preferEnhanced }));
        }
        meta = mergeMetadata(explicitMeta, {}, { preferEnhanced });
      } else {
        meta = mergeMetadata(explicitMeta, cleaned || {}, { preferEnhanced });
      }
      const tokenStr = rawPerMethod?._usage?.total_tokens != null ? ` — ${rawPerMethod._usage.total_tokens} tokens` : '';
      log(`  ${path} [${methods.join(', ').toUpperCase()}]${tokenStr}`);
    } else {
      const enhanced = await llm.enhanceEndpointDocs(endpointInfo);
      meta = mergeMetadata(explicitMeta, stripLlmUsage(enhanced) || enhanced, { preferEnhanced });
      const tokenStr = enhanced?._usage?.total_tokens != null ? ` — ${enhanced._usage.total_tokens} tokens` : '';
      log(`  ${path} [${methods.join(', ').toUpperCase()}]${tokenStr}`);
    }
  } catch (err) {
    log(`  ${path} [${(methods || []).join(', ').toUpperCase()}] — LLM failed`);
  }
  return { meta, metaByMethod };
}

/**
 * Process one registry target: analyze, optionally enhance with LLM, build meta and path params.
 * @param {object} target - Endpoint-like with getPath(), getHandler(), getMetadata(), getGroup?()
 * @param {object} options - { llm?, effectiveLevel, dirTargets, dependencyContextByGroup, useLlm, preferEnhanced, log }
 * @returns {Promise<{ openAPIPath: string, tag: string, methodAgnostic: boolean, meta: object, metaByMethod: Map|null, methods: string[], pathParams: array, groupEntry: object }>}
 */
export async function processEndpoint(target, options) {
  const { llm, effectiveLevel, dirTargets, dependencyContextByGroup, useLlm, preferEnhanced, log } = options;

  const { path, handler, explicitMeta, methods, groupId, tag } = extractTargetInfo(target);
  let meta = {
    summary: explicitMeta.summary || path || 'Endpoint',
    description: explicitMeta.description,
    request: explicitMeta.request,
    response: explicitMeta.response,
  };
  const handlerSource = resolveHandlerSource(handler, effectiveLevel);
  let metaByMethod = null;

  if (useLlm) {
    const dependencySources = await resolveDependencyContext(groupId, tag, effectiveLevel, dirTargets, dependencyContextByGroup);
    const endpointInfo = {
      path,
      methods,
      metadata: explicitMeta,
      handlerSource,
      ...(dependencySources && { dependencySources }),
    };
    const enhanced = await enhanceWithLlm(endpointInfo, llm, explicitMeta, preferEnhanced, methods, path, log);
    meta = enhanced.meta;
    metaByMethod = enhanced.metaByMethod;
  }

  const openAPIPath = toOpenAPIPath(path);
  const pathParams = getPathParameters(path);
  const handlerIsMethodAgnostic = isMethodAgnostic(methods);
  if (handlerIsMethodAgnostic && metaByMethod != null) {
    meta = mergeMethodAgnosticMeta(metaByMethod, methods, meta);
    metaByMethod = null;
  }
  const methodAgnostic = metaByMethod == null && handlerIsMethodAgnostic;

  const groupEntry = {
    path,
    methods,
    summary: meta.summary,
    description: meta.description,
    handlerSource,
    ...(dependencyContextByGroup.has(tag) && { dependencySources: dependencyContextByGroup.get(tag) }),
  };

  return {
    openAPIPath,
    tag,
    methodAgnostic,
    meta,
    metaByMethod,
    methods,
    pathParams,
    groupEntry,
  };
}

/**
 * Add one endpoint's operations to the paths object (mutates paths).
 * @param {object} paths - OpenAPI paths object
 * @param {object} result - From processEndpoint
 */
export function addEndpointToPaths(paths, result) {
  const { openAPIPath, tag, methodAgnostic, meta, metaByMethod, methods, pathParams } = result;
  if (!paths[openAPIPath]) paths[openAPIPath] = {};
  if (methodAgnostic) {
    const op = buildOperation(METHOD_AGNOSTIC_OPERATION_KEY, meta, pathParams, { methodAgnostic: true });
    op.tags = [tag];
    paths[openAPIPath][METHOD_AGNOSTIC_OPERATION_KEY] = op;
  } else {
    for (const method of methods) {
      const key = method.toLowerCase();
      const methodMeta = metaByMethod?.get(key) ?? meta;
      const op = buildOperation(method, methodMeta, pathParams);
      op.tags = [tag];
      paths[openAPIPath][key] = op;
    }
  }
}

/**
 * Build tag name and description for each group (LLM or fallback).
 * @param {Map<string,object[]>} groupEndpoints
 * @param {Map<string,string>} dependencyContextByGroup
 * @param {object|null} llm
 * @param {{ effectiveLevel: number, log: function }} options
 * @returns {Promise<Map<string,{ name: string, description: string }>>}
 */
export async function buildTagDescriptions(groupEndpoints, dependencyContextByGroup, llm, options) {
  const { effectiveLevel, log } = options;
  const tagDescriptions = new Map();
  if (llm && typeof llm.summarizeTargetGroup === 'function') {
    for (const [groupId, endpoints] of groupEndpoints) {
      try {
        const dependencySources = effectiveLevel === 2 ? dependencyContextByGroup.get(groupId) || '' : '';
        const infos = endpoints.map((e) => ({
          path: e.path,
          methods: e.methods,
          summary: e.summary,
          description: e.description,
          handlerSource: e.handlerSource,
          ...(e.dependencySources && { dependencySources: e.dependencySources }),
        }));
        const result = await llm.summarizeTargetGroup(groupId, infos, dependencySources);
        const { name, description, _usage: summaryUsage } = result;
        tagDescriptions.set(groupId, { name: name || groupId, description });
        const tokenStr = summaryUsage?.total_tokens != null && summaryUsage.total_tokens > 0
          ? ` — ${summaryUsage.total_tokens} tokens`
          : '';
        log(`  [group ${groupId}] summary${tokenStr}`);
      } catch (err) {
        tagDescriptions.set(groupId, {
          name: groupId.split('/').pop() || groupId,
          description: '',
        });
        log(`  [group ${groupId}] summary — failed`);
      }
    }
  } else {
    for (const groupId of groupEndpoints.keys()) {
      tagDescriptions.set(groupId, {
        name: groupId.split('/').pop() || groupId,
        description: '',
      });
    }
  }
  return tagDescriptions;
}

/**
 * Replace operation tags (groupId) with display names from tagDescriptions. Mutates paths.
 * @param {object} paths - OpenAPI paths object
 * @param {Map<string,{ name: string, description?: string }>} tagDescriptions
 */
export function applyTagDisplayNames(paths, tagDescriptions) {
  for (const pathItem of Object.values(paths)) {
    for (const op of Object.values(pathItem)) {
      if (op?.tags?.[0]) {
        const groupId = op.tags[0];
        op.tags[0] = tagDescriptions.get(groupId)?.name ?? groupId;
      }
    }
  }
}
