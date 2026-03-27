/**
 * Serves interactive API docs at /docs with try-out functionality.
 * Uses Scalar API Reference (modern UI, try-it-out, themes). MIT.
 * Registers internal routes: GET /docs (HTML page) and GET /docs/openapi.json (spec).
 *
 * @see https://scalar.com/products/api-references/integrations/html-js
 * @see https://scalar.com/products/api-references/configuration
 */

import Endpoint from '../../server/endpoint.js';
import targetRegistry from '../../server/targets/registry.js';
import {
  isAuthenticated,
  setAuthCookie,
  verifyPassword,
  buildLoginPage,
  buildSetupPage,
  requiresPasswordForEnv,
} from './docs-auth.js';

/**
 * Write an HTML response directly, bypassing ammo.fire so the response
 * envelope (when enabled) does not wrap the HTML in JSON.
 */
function sendHtml(res, statusCode, html) {
  res.writeHead(statusCode, { 'Content-Type': 'text/html' });
  res.end(html);
}

/**
 * Write a JSON response directly, bypassing ammo.fire so the response
 * envelope does not wrap internal docs responses.
 */
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

/** Scalar API Reference browser standalone (IIFE, sets window.Scalar). Pinned for stability. */
const SCALAR_VERSION = '1.46.0';
const SCALAR_STANDALONE = `https://cdn.jsdelivr.net/npm/@scalar/api-reference@${SCALAR_VERSION}/dist/browser/standalone.js`;

/**
 * Default Scalar API Reference config. Use layout: 'classic' to show the test request
 * inline on the same page instead of opening a dialog (modern layout).
 *
 * @see https://scalar.com/products/api-references/configuration
 */
const DEFAULT_SCALAR_CONFIG = {
  layout: 'modern',
  theme: 'default',
  showSidebar: true,
  hideDownloadButton: false,
  hideModels: false,
  hideSearch: false,
  hideDarkModeToggle: false,
  hideTestRequestButton: false,
  showDeveloperTools: 'localhost',
  documentDownloadType: 'both',
  defaultOpenAllTags: false,
  defaultOpenFirstTag: true,
  expandAllModelSections: false,
  expandAllResponses: false,
  withDefaultFonts: true,
};

/**
 * Build HTML shell for Scalar docs: script tag + inline config and mount logic.
 * @param {string} scriptUrl - URL to Scalar standalone JS
 * @param {string} configJson - JSON string (already escaped for embedding in JS)
 * @returns {string} Full HTML document
 */
function buildDocsHtmlShell(scriptUrl, configJson) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>API Reference</title>
  <style>
    body { margin: 0; min-height: 100vh; font-family: system-ui, sans-serif; }
    #scalar-app { min-height: 100vh; width: 100%; }
  </style>
</head>
<body>
  <div id="scalar-app"></div>
  <script src="${scriptUrl}" id="scalar-script"><\/script>
  <script>
    (function() {
      var config = JSON.parse('${configJson}');
      function mount() {
        if (typeof Scalar !== 'undefined' && typeof Scalar.createApiReference === 'function') {
          Scalar.createApiReference('#scalar-app', config);
          return true;
        }
        return false;
      }
      var el = document.getElementById('scalar-script');
      if (el) {
        el.addEventListener('load', function() { mount(); });
        if (el.readyState === 'complete') setTimeout(function() { mount(); }, 0);
      }
      if (!mount()) setTimeout(function() { mount(); }, 100);
    })();
  </script>
</body>
</html>`;
}

/**
 * Builds the HTML page that embeds Scalar and points to the spec URL.
 * @param {string} specUrl - URL to the OpenAPI spec (e.g. '/docs/openapi.json' or full URL).
 * @param {object} [scalarConfig] - Optional Scalar API Reference config (merged with defaults).
 * @returns {string} Full HTML document.
 */
function buildDocsPage(specUrl, scalarConfig = {}) {
  const url = specUrl || '/docs/openapi.json';
  const config = { ...DEFAULT_SCALAR_CONFIG, ...scalarConfig, url };
  const configJson = JSON.stringify(config)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e');
  return buildDocsHtmlShell(SCALAR_STANDALONE, configJson);
}

/**
 * Create endpoint that serves the docs HTML page at GET docsPath.
 *
 * Three modes:
 * - **password set** → login form for unauthenticated visitors, POST to verify
 * - **no password, production/missing NODE_ENV** → setup page urging developer to set DOCS_PASSWORD
 * - **no password, development** → open access
 *
 * @param {string} docsPath - e.g. '/docs'
 * @param {string} htmlContent - Full HTML document
 * @param {string|null} [password] - Optional password to protect docs
 * @returns {Endpoint}
 */
function createDocsHtmlEndpoint(docsPath, htmlContent, password) {
  const endpoint = new Endpoint();
  endpoint.setPath('', docsPath);
  endpoint.setMiddlewares([]);

  if (password) {
    const loginPage = buildLoginPage();
    const loginError = buildLoginPage('Incorrect password');

    endpoint.setHandler((ammo) => {
      if (!ammo.GET && !ammo.POST) return ammo.notAllowed('GET', 'POST');

      if (ammo.POST) {
        if (verifyPassword(ammo.payload?.password, password)) {
          setAuthCookie(ammo.res, password);
          return ammo.redirect(docsPath);
        }
        sendHtml(ammo.res, 401, loginError);
        return;
      }

      if (isAuthenticated(ammo.headers, password)) {
        sendHtml(ammo.res, 200, htmlContent);
      } else {
        sendHtml(ammo.res, 200, loginPage);
      }
    });
    return endpoint;
  }

  if (requiresPasswordForEnv()) {
    const setupPage = buildSetupPage();
    endpoint.setHandler((ammo) => {
      if (!ammo.GET) return ammo.notAllowed();
      sendHtml(ammo.res, 403, setupPage);
    });
    return endpoint;
  }

  endpoint.setHandler((ammo) => {
    if (!ammo.GET) return ammo.notAllowed();
    sendHtml(ammo.res, 200, htmlContent);
  });
  return endpoint;
}

/**
 * Create endpoint that serves the OpenAPI spec JSON at GET specPath.
 * Returns 401 for unauthenticated requests when a password is set,
 * or 403 when docs are disabled (production without DOCS_PASSWORD).
 * @param {string} specPath - e.g. '/docs/openapi.json'
 * @param {() => object | Promise<object>} getSpec - Function that returns the current spec
 * @param {string|null} [password] - Optional password to protect docs
 * @returns {Endpoint}
 */
function createSpecJsonEndpoint(specPath, getSpec, password) {
  const endpoint = new Endpoint();
  endpoint.setPath('', specPath);
  endpoint.setMiddlewares([]);

  if (!password && requiresPasswordForEnv()) {
    endpoint.setHandler((ammo) => {
      if (!ammo.GET) return ammo.notAllowed();
      sendJson(ammo.res, 403, {
        error: 'Docs disabled. Set the DOCS_PASSWORD environment variable.',
      });
    });
    return endpoint;
  }

  endpoint.setHandler(async (ammo) => {
    if (!ammo.GET) return ammo.notAllowed();
    if (password && !isAuthenticated(ammo.headers, password)) {
      sendJson(ammo.res, 401, { error: 'Unauthorized' });
      return;
    }
    try {
      const spec = await Promise.resolve(getSpec());
      sendJson(ammo.res, 200, spec);
    } catch (err) {
      sendJson(ammo.res, 500, {
        error: 'Failed to generate OpenAPI spec',
        message: err?.message,
      });
    }
  });
  return endpoint;
}

/**
 * Registers the docs and openapi.json routes (or returns endpoints when mutateRegistry is false).
 * Call this after the OpenAPI spec is available (e.g. after generateOpenAPISpec).
 *
 * @param {object} [options]
 * @param {() => object | Promise<object>} options.getSpec - Function that returns the current OpenAPI spec (sync or async). Used for GET {docsPath}/openapi.json.
 * @param {string} [options.docsPath='/docs'] - Base path for docs (HTML page and spec URL). Routes: GET {docsPath}, GET {docsPath}/openapi.json.
 * @param {string} [options.specUrl] - Override for the spec URL shown in the docs page (default: '{docsPath}/openapi.json'). Use when serving behind a proxy with a different base path.
 * @param {object} [options.scalarConfig] - Optional Scalar API Reference config (e.g. { layout: 'classic' } for try-it on the same page).
 * @param {string|null} [options.password] - Optional password to protect docs behind a login form. When set, unauthenticated visitors see a password prompt.
 * @param {boolean} [options.mutateRegistry=true] - If true, push endpoints to registry. If false, return [docsEndpoint, specEndpoint] without mutating.
 * @param {object} [registry] - Target registry to register routes on when mutateRegistry is true. Defaults to the module's targetRegistry.
 * @returns {undefined | [Endpoint, Endpoint]} When mutateRegistry is false, returns the two endpoints for the caller to register.
 */
export function registerDocRoutes(options = {}, registry = targetRegistry) {
  const {
    getSpec,
    docsPath = '/docs',
    specUrl: specUrlOption,
    scalarConfig,
    password = null,
    mutateRegistry = true,
  } = options;

  if (typeof getSpec !== 'function') {
    throw new Error(
      'registerDocRoutes requires options.getSpec (function returning the OpenAPI spec)',
    );
  }

  const basePath = docsPath.replace(/\/$/, '');
  const specUrl = specUrlOption ?? `${basePath}/openapi.json`;
  const specPath = `${basePath}/openapi.json`;
  const htmlContent = buildDocsPage(specUrl, scalarConfig);

  const docsEndpoint = createDocsHtmlEndpoint(docsPath, htmlContent, password);
  const specEndpoint = createSpecJsonEndpoint(specPath, getSpec, password);

  if (mutateRegistry) {
    registry.targets.push(docsEndpoint);
    registry.targets.push(specEndpoint);
    return;
  }
  return [docsEndpoint, specEndpoint];
}

export { buildDocsPage };
export default registerDocRoutes;
