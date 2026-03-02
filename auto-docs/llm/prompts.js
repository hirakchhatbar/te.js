/**
 * Prompt builders for auto-documentation LLM calls.
 * Each function returns the prompt string; provider calls analyze(prompt).
 */

import {
  PROMPT_HANDLER_SLICE,
  PROMPT_HANDLER_SLICE_WITH_DEPS,
  PROMPT_DEPENDENCY_SLICE,
  PROMPT_GROUP_CODE_LIMIT,
  PROMPT_GROUP_CODE_LIMIT_WITH_DEPS,
  PROMPT_GROUP_SNIPPET_CHARS,
} from '../constants.js';

/** Shared rule block for enhance prompts: required vs optional and format. */
const ENHANCE_RULES = `CRITICAL - Required vs optional: Infer from the code which parameters are required and which are optional. Look for: validation that throws or returns error when missing; checks like !payload.field or !ammo.payload.x; required in schema or JSDoc; or optional/undefined/default handling. For every body property and every query parameter you list, you MUST set "required": true or "required": false explicitly. Do not omit "required".

Respond with ONLY a single JSON object (no markdown, no explanation). Use this shape:`;

/** JSON shape example for single-endpoint enhance. */
const ENHANCE_RESPONSE_SHAPE = `{
  "summary": "Short one-line description",
  "description": "Optional longer description",
  "request": {
    "body": {
      "fieldName": { "type": "string", "description": "...", "required": true }
    },
    "query": {
      "paramName": { "type": "string", "description": "...", "required": false }
    }
  },
  "response": { "200": { "description": "Success" }, "201": { "description": "Created" } }
}
- For every field in request.body and request.query set "required": true or "required": false based on code context.
- Include "format" when relevant (e.g. "email", "date-time", "binary").
- Omit "request" or "response" if not applicable. Keep summary under 80 characters.`;

/** JSON shape example for per-method enhance. */
const PER_METHOD_RESPONSE_SHAPE = `{
  "get": { "summary": "...", "description": "...", "response": { "200": { "description": "..." } } },
  "put": { "summary": "...", "description": "...", "request": { "body": { "name": { "type": "string", "required": true }, "email": { "type": "string", "format": "email", "required": true } } }, "response": { "200": { "description": "..." } } },
  "delete": { "summary": "...", "description": "...", "response": { "204": { "description": "..." } } }
}`;

/**
 * Build handler snippet and related-files section for endpoint prompts. Single place for limits and formatting.
 * @param {object} endpointInfo - { handlerSource?, dependencySources? }
 * @returns {{ handlerSnippet: string, relatedSection: string }}
 */
export function buildEndpointPromptContext(endpointInfo) {
  const { handlerSource = '', dependencySources = '' } = endpointInfo;
  const handlerLimit = dependencySources ? PROMPT_HANDLER_SLICE_WITH_DEPS : PROMPT_HANDLER_SLICE;
  const handlerSnippet = (handlerSource || '').slice(0, handlerLimit);
  const relatedSection = dependencySources
    ? `

Related source files (target and dependencies):
\`\`\`javascript
${dependencySources.slice(0, PROMPT_DEPENDENCY_SLICE)}
\`\`\`
`
    : '';
  return { handlerSnippet, relatedSection };
}

/**
 * Build prompt for summarizing a target group (tag name + description).
 * @param {string} groupId
 * @param {Array<object>} endpointsInfo - { path, methods, summary?, description?, handlerSource?, dependencySources? }
 * @param {string} [dependencySources]
 * @returns {string}
 */
export function buildSummarizeGroupPrompt(groupId, endpointsInfo, dependencySources = '') {
  if (!endpointsInfo?.length) return '';
  const list = endpointsInfo
    .map((e) => `- ${e.path} [${(e.methods || []).join(', ')}]: ${e.summary || e.description || '—'}`)
    .join('\n');
  const codeSnippets = endpointsInfo
    .filter((e) => e.handlerSource)
    .map((e) => `Path ${e.path}:\n${(e.handlerSource || '').slice(0, PROMPT_GROUP_SNIPPET_CHARS)}`)
    .join('\n\n');
  const codeLimit = dependencySources ? PROMPT_GROUP_CODE_LIMIT_WITH_DEPS : PROMPT_GROUP_CODE_LIMIT;
  const { relatedSection } = buildEndpointPromptContext({ dependencySources });
  return `You are an API documentation assistant. A single source file (group) exposes these endpoints:

Group id: ${groupId}

Endpoints:
${list}

Handler code (excerpts):
\`\`\`javascript
${codeSnippets.slice(0, codeLimit)}
\`\`\`
${relatedSection}

Write a SHORT paragraph (2–4 sentences) describing what this group of endpoints does as a whole. Focus on the domain and purpose, not the HTTP details. Respond with ONLY a single JSON object:
{ "name": "Human-readable group name", "description": "Your paragraph here." }
Use "name" as a short label (e.g. "Users", "Health & routes"); keep description under 300 characters.`;
}

/**
 * Build prompt for enhancing a single endpoint (OpenAPI-style metadata).
 * @param {object} endpointInfo - { path, methods, metadata?, handlerSource?, dependencySources? }
 * @returns {string}
 */
export function buildEnhanceEndpointPrompt(endpointInfo) {
  const { path, methods = [], metadata = {} } = endpointInfo;
  const { handlerSnippet, relatedSection } = buildEndpointPromptContext(endpointInfo);
  const existing = Object.keys(metadata).length ? `Existing metadata: ${JSON.stringify(metadata)}\n` : '';
  return `You are an API documentation assistant. Given an HTTP endpoint and its source code, suggest OpenAPI-style metadata.

Endpoint path: ${path}
HTTP methods: ${methods.join(', ')}
${existing}Handler source (for context):
\`\`\`javascript
${handlerSnippet}
\`\`\`
${relatedSection}

${ENHANCE_RULES}
${ENHANCE_RESPONSE_SHAPE}`;
}

/**
 * Build prompt for method-specific endpoint metadata (per-method summary, request, response).
 * @param {object} endpointInfo - { path, methods, metadata?, handlerSource?, dependencySources? }
 * @returns {string}
 */
export function buildEnhanceEndpointPerMethodPrompt(endpointInfo) {
  const { path, methods = [], metadata = {} } = endpointInfo;
  const { handlerSnippet, relatedSection } = buildEndpointPromptContext(endpointInfo);
  const methodsLower = methods.map((m) => m.toLowerCase());
  const existing = Object.keys(metadata).length ? `Existing metadata: ${JSON.stringify(metadata)}\n` : '';
  return `You are an API documentation assistant. This endpoint supports multiple HTTP methods. Provide METHOD-SPECIFIC metadata so each method is documented accurately.

Endpoint path: ${path}
HTTP methods: ${methods.join(', ')}

${existing}Handler source (for context):
\`\`\`javascript
${handlerSnippet}
\`\`\`
${relatedSection}

RULES:
- Return ONE JSON object keyed by lowercase method name: "get", "put", "post", "delete", "patch", "head", "options".
- Include a key for EACH of: ${methodsLower.map((m) => `"${m}"`).join(', ')}.
- For each method provide: "summary" (one line, method-specific, e.g. "Get user by id" for GET, "Update user" for PUT), optional "description", optional "request" (only for methods that accept a body: put, post, patch; omit for get, delete, head, options), and "response" (ONLY the status codes that THIS method returns — e.g. GET returns 200, DELETE returns 204; do not list 204 under PUT or 200 under DELETE unless the handler returns it for that branch).
- For request.body, set "required": true or "required": false on each field based on code. Include "format" when relevant (e.g. "email").
- Each method's response object must only list the HTTP status codes that that specific method returns.

Respond with ONLY a single JSON object (no markdown, no explanation). Shape:
${PER_METHOD_RESPONSE_SHAPE}`;
}

/**
 * Build prompt for reordering tag groups by importance.
 * @param {object} spec - OpenAPI 3 spec with spec.tags
 * @returns {string}
 */
export function buildReorderTagsPrompt(spec) {
  const tags = spec?.tags ?? [];
  if (!tags.length) return '';
  const list = tags
    .map((t) => `- "${t.name}"${t.description ? `: ${t.description.slice(0, 200)}` : ''}`)
    .join('\n');
  return `You are an API documentation assistant. This API has the following tag groups (categories):

${list}

Reorder these groups by importance for a reader exploring the API. Put the most important or central groups first (e.g. main resources, auth), and utility or secondary groups last (e.g. health, admin).

Respond with ONLY a JSON array of the tag names in the desired order. Example: ["Users", "Auth", "Health & routes"]
Do not include any other text or markdown.`;
}

/**
 * Build prompt for generating the API overview Markdown page.
 * @param {object} spec - OpenAPI 3 spec with info, tags, paths
 * @param {object} [options] - { title?, version?, description? }
 * @returns {string}
 */
export function buildOverviewPrompt(spec, options = {}) {
  const info = spec?.info ?? {};
  const title = options.title ?? info.title ?? 'API';
  const version = options.version ?? info.version ?? '1.0.0';
  const description = options.description ?? info.description ?? '';
  const tags = spec?.tags ?? [];
  const paths = spec?.paths ?? {};
  const tagList = tags.map((t) => `- **${t.name}**: ${t.description || '—'}`).join('\n');
  const pathList = Object.entries(paths)
    .slice(0, 50)
    .map(([p, ops]) => {
      const methods = Object.keys(ops)
        .filter((k) => ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'].includes(k))
        .join(', ')
        .toUpperCase();
      return `- ${p} [${methods}]`;
    })
    .join('\n');

  return `You are an API documentation assistant. Generate a single comprehensive Markdown document for this API.

API title: ${title}
Version: ${version}
${description ? `Description: ${description.slice(0, 500)}\n` : ''}

Tag groups (API areas):
${tagList}

Sample of endpoints (path and methods):
${pathList}

Write a Markdown document that includes:
1. A short **project summary** (what this API does).
2. **APIs available**: a high-level list of the tag groups and what they cover.
3. **Key endpoints** or "Getting started": suggest a few important paths (e.g. health check, main resources).
4. Any other brief sections that fit (e.g. Authentication, Rate limits) only if clearly inferable from the spec; otherwise omit.

Use clear headings (##, ###). Keep the document concise (under 2 pages). Output ONLY the Markdown, no surrounding explanation or code fence.`;
}
