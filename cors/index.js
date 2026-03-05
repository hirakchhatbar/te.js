/**
 * CORS middleware factory. Handles OPTIONS preflight with 204 and sets CORS response headers.
 *
 * @param {Object} config - CORS configuration
 * @param {string|string[]|((origin: string) => boolean)} [config.origin='*'] - Allowed origin(s): '*' or array of origins or function
 * @param {string[]} [config.methods=['GET','POST','PUT','DELETE','PATCH','HEAD','OPTIONS']] - Allowed methods for Access-Control-Allow-Methods
 * @param {string[]} [config.allowedHeaders=['Content-Type','Authorization']] - Allowed request headers for Access-Control-Allow-Headers
 * @param {boolean} [config.credentials=false] - Access-Control-Allow-Credentials (use with specific origin, not '*')
 * @param {number} [config.maxAge] - Access-Control-Max-Age in seconds for preflight cache
 * @returns {Function} Middleware (ammo, next)
 */
function corsMiddleware(config = {}) {
  const {
    origin = '*',
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
    allowedHeaders = ['Content-Type', 'Authorization'],
    credentials = false,
    maxAge,
  } = config;

  const methodsList = Array.isArray(methods)
    ? methods.map((m) => String(m).toUpperCase()).join(', ')
    : String(methods);
  const headersList = Array.isArray(allowedHeaders)
    ? allowedHeaders.join(', ')
    : String(allowedHeaders);

  const resolveOrigin = (requestOrigin) => {
    if (typeof origin === 'function') {
      return origin(requestOrigin) ? requestOrigin || '*' : null;
    }
    if (origin === '*') {
      return credentials ? (requestOrigin || '*') : '*';
    }
    if (Array.isArray(origin)) {
      const normalized = (requestOrigin || '').toLowerCase();
      const allowed = origin.some(
        (o) => String(o).toLowerCase() === normalized,
      );
      return allowed ? requestOrigin : null;
    }
    return String(origin) === (requestOrigin || '') ? requestOrigin : null;
  };

  return async (ammo, next) => {
    const requestOrigin = ammo.req.headers.origin;

    const allowOrigin = resolveOrigin(requestOrigin);
    if (allowOrigin != null) {
      ammo.res.setHeader('Access-Control-Allow-Origin', allowOrigin);
    }
    ammo.res.setHeader('Access-Control-Allow-Methods', methodsList);
    ammo.res.setHeader('Access-Control-Allow-Headers', headersList);
    if (credentials) {
      ammo.res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    if (maxAge != null && Number.isFinite(maxAge)) {
      ammo.res.setHeader('Access-Control-Max-Age', String(maxAge));
    }

    if (ammo.req.method === 'OPTIONS') {
      ammo.res.writeHead(204);
      ammo.res.end();
      return;
    }

    await next();
  };
}

export default corsMiddleware;
