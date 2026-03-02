/**
 * OpenAPI 3.0 spec generator for te.js auto-documentation.
 * Orchestrates spec-builders and endpoint-processor; builds final spec object.
 */

import { OPENAPI_VERSION } from '../constants.js';
import { createVerboseLogger } from '../utils/logger.js';
import {
  processEndpoint,
  addEndpointToPaths,
  buildTagDescriptions,
  applyTagDisplayNames,
} from './endpoint-processor.js';
import {
  toOpenAPIPath,
  getPathParameters,
  getQueryParameters,
  buildSchemaFromMetadata,
  buildRequestBody,
  buildResponses,
  buildOperation,
  mergeMetadata,
} from './spec-builders.js';

/**
 * Build OpenAPI 3.0 spec from registry and options.
 * @param {object} registry - Target registry with .targets
 * @param {object} [options] - { llm?, info?, servers?, level?, dirTargets?, verbose?, logger? }
 * @returns {Promise<object>} OpenAPI 3.0 spec
 */
async function generateOpenAPISpec(registry, options = {}) {
  const {
    llm,
    info = {},
    servers,
    level = 1,
    dirTargets = process.env.DIR_TARGETS || 'targets',
    verbose = false,
    logger = null,
  } = options;
  const targets = registry?.targets ?? [];
  const paths = {};
  const groupEndpoints = new Map();
  const dependencyContextByGroup = new Map();

  const useLlm = !!llm && typeof llm.enhanceEndpointDocs === 'function';
  const effectiveLevel = level === 3 ? 2 : Math.max(1, Math.min(2, level));
  const log = createVerboseLogger(logger, verbose);
  const preferEnhanced = effectiveLevel === 2;

  for (const target of targets) {
    const result = await processEndpoint(target, {
      llm,
      effectiveLevel,
      dirTargets,
      dependencyContextByGroup,
      useLlm,
      preferEnhanced,
      log,
    });
    if (!groupEndpoints.has(result.tag)) groupEndpoints.set(result.tag, []);
    groupEndpoints.get(result.tag).push(result.groupEntry);
    addEndpointToPaths(paths, result);
  }

  const tagDescriptions = await buildTagDescriptions(
    groupEndpoints,
    dependencyContextByGroup,
    useLlm ? llm : null,
    { effectiveLevel, log },
  );
  applyTagDisplayNames(paths, tagDescriptions);

  const tags = Array.from(tagDescriptions.entries()).map(([, { name, description }]) => ({
    name,
    ...(description && { description }),
  }));

  const spec = {
    openapi: OPENAPI_VERSION,
    info: {
      title: info.title ?? 'API',
      version: info.version ?? '1.0.0',
      ...(info.description && { description: info.description }),
    },
    tags: tags.length > 0 ? tags : undefined,
    paths,
  };
  if (Array.isArray(servers) && servers.length > 0) {
    spec.servers = servers;
  }
  return spec;
}

export {
  OPENAPI_VERSION,
  toOpenAPIPath,
  getPathParameters,
  getQueryParameters,
  buildSchemaFromMetadata,
  buildRequestBody,
  buildResponses,
  buildOperation,
  mergeMetadata,
  generateOpenAPISpec,
};
export default generateOpenAPISpec;
