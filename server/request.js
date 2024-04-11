'use strict';

import accepts from 'accepts';
import http from 'http';
import {isIP} from 'net';
import bodyParser from './../utils/body-parser.js';
import fresh from './../utils/fresh.js';

/**
 * Request prototype.
 * @public
 */

const req = Object.create(http.IncomingMessage.prototype);
/**
 * Using method from Express.js for easy migration
 * Return request header.
 *
 * The `Referrer` header field is special-cased,
 * both `Referrer` and `Referer` are interchangeable.
 *
 * Examples:
 *
 *     req.get('Content-Type');
 *     // => "text/plain"
 *
 *     req.get('content-type');
 *     // => "text/plain"
 *
 *     req.get('Something');
 *     // => undefined
 *
 * Aliased as `req.header()`.
 *
 * @param {String} name
 * @return {String}
 * @public
 */
req.get = req.header = function header(name) {
  if (!name) {
    throw new Error('Name of the header is required');
  }

  if (typeof name !== 'string') {
    throw new TypeError('Name of the header must be a string');
  }

  switch (name.toLowerCase()) {
    case 'referer':
    case 'referrer':
      return this.headers.referrer || this.headers.referer;
    default:
      return this.headers[name.toLowerCase()];
  }
};

/**
 * To do: update docs.
 *
 * Check if the given `type(s)` is acceptable, returning
 * the best match when true, otherwise `undefined`, in which
 * case you should respond with 406 "Not Acceptable".
 *
 * The `type` value may be a single MIME type string
 * such as "application/json", an extension name
 * such as "json", a comma-delimited list such as "json, html, text/plain",
 * an argument list such as `"json", "html", "text/plain"`,
 * or an array `["json", "html", "text/plain"]`. When a list
 * or array is given, the _best_ match, if any is returned.
 *
 * Examples:
 *
 *     // Accept: text/html
 *     req.accepts('html');
 *     // => "html"
 *
 *     // Accept: text/*, application/json
 *     req.accepts('html');
 *     // => "html"
 *     req.accepts('text/html');
 *     // => "text/html"
 *     req.accepts('json, text');
 *     // => "json"
 *     req.accepts('application/json');
 *     // => "application/json"
 *
 *     // Accept: text/*, application/json
 *     req.accepts('image/png');
 *     req.accepts('png');
 *     // => undefined
 *
 *     // Accept: text/*;q=.5, application/json
 *     req.accepts(['html', 'json']);
 *     req.accepts('html', 'json');
 *     req.accepts('html, json');
 *     // => "json"
 *
 * @param {String|Array} type(s)
 * @return {String|Array|Boolean}
 * @public
 */

req.accepts = function() {
  const accept = accepts(this);
  return accept.types.apply(accept, arguments);
};

/**
 * Check if the given `encoding`s are accepted.
 *
 * @param {String} ...encoding
 * @return {String|Array}
 * @public
 */

req.acceptsEncodings = function() {
  const accept = accepts(this);
  return accept.encodings.apply(accept, arguments);
};

/**
 * Check if the given `charset`s are acceptable,
 * otherwise you should respond with 406 "Not Acceptable".
 *
 * @param {String} ...charset
 * @return {String|Array}
 * @public
 */

req.acceptsCharsets = function() {
  const accept = accepts(this);
  return accept.charsets.apply(accept, arguments);
};
/**
 * Check if the given `lang`s are acceptable,
 * otherwise you should respond with 406 "Not Acceptable".
 *
 * @param {String} ...lang
 * @return {String|Array}
 * @public
 */

req.acceptsLanguages = function() {
  const accept = accepts(this);
  return accept.languages.apply(accept, arguments);
};

/**
 * Return the value of param `name` when present or `defaultValue`.
 *
 *  - Checks route placeholders, ex: _/user/:id_
 *  - Checks body params, ex: id=12, {"id":12}
 *  - Checks query string params, ex: ?id=12
 *
 * To utilize request bodies, `req.body`
 * should be an object. This can be done by using
 * the `bodyParser()` middleware.
 *
 * @param {String} name
 * @param {Mixed} [defaultValue]
 * @return {String}
 * @public
 */

req.param = function param(name, defaultValue) {
  const params = this.params || {};
  const body = this.body || {};
  const query = this.query || {};

  if (null != params[name] && params.hasOwnProperty(name)) return params[name];
  if (null != body[name]) return body[name];
  if (null != query[name]) return query[name];

  return defaultValue;
};

/**
 * Return the protocol string "http" or "https"
 * when requested with TLS. When the "trust proxy"
 * setting trusts the socket address, the
 * "X-Forwarded-Proto" header field will be trusted
 * and used if present.
 *
 * If you're running behind a reverse proxy that
 * supplies https for you this may be enabled.
 *
 * @return {String}
 * @public
 */

defineGetter(req, 'protocol', function protocol() {
  const proto = this.connection.encrypted ? 'https' : 'http';
  const trust = this.app.get('trust proxy fn');

  if (!trust(this.connection.remoteAddress, 0)) {
    return proto;
  }

  // Note: X-Forwarded-Proto is normally only ever a
  //       single value, but this is to be safe.
  const header = this.get('X-Forwarded-Proto') || proto;
  const index = header.indexOf(',');

  return index !== -1 ? header.substring(0, index).trim() : header.trim();
});

/**
 * Shorthand for:
 *
 *    req.protocol === 'https'
 *
 * @return {Boolean}
 * @public
 */

defineGetter(req, 'secure', function secure() {
  return this.protocol === 'https';
});

/**
 * Return subdomains as an array.
 *
 * Subdomains are the dot-separated parts of the host before the main domain of
 * the app. By default, the domain of the app is assumed to be the last two
 * parts of the host. This can be changed by setting "subdomain offset".
 *
 * For example, if the domain is "tobi.ferrets.example.com":
 * If "subdomain offset" is not set, req.subdomains is `["ferrets", "tobi"]`.
 * If "subdomain offset" is 3, req.subdomains is `["tobi"]`.
 *
 * @return {Array}
 * @public
 */

defineGetter(req, 'subdomains', function subdomains() {
  const hostname = this.hostname;

  if (!hostname) return [];

  const offset = this.app.get('subdomain offset');
  const subdomains = !isIP(hostname)
      ? hostname.split('.').reverse()
      : [hostname];

  return subdomains.slice(offset);
});

/**
 * Parse the "Host" header field to a hostname.
 *
 * When the "trust proxy" setting trusts the socket
 * address, the "X-Forwarded-Host" header field will
 * be trusted.
 *
 * @return {String}
 * @public
 */

defineGetter(req, 'hostname', function hostname() {
  const trust = this.app.get('trust proxy fn');
  let host = this.get('X-Forwarded-Host');

  if (!host || !trust(this.connection.remoteAddress, 0)) {
    host = this.get('Host');
  } else if (host.indexOf(',') !== -1) {
    // Note: X-Forwarded-Host is normally only ever a
    //       single value, but this is to be safe.
    host = host.substring(0, host.indexOf(',')).trimRight();
  }

  if (!host) return;

  // IPv6 literal support
  const offset = host[0] === '[' ? host.indexOf(']') + 1 : 0;
  const index = host.indexOf(':', offset);

  return index !== -1 ? host.substring(0, index) : host;
});

defineGetter(req, 'host', function host() {
  return this.host;
});

/**
 * Check if the request is fresh, aka
 * Last-Modified and/or the ETag
 * still match.
 *
 * @return {Boolean}
 * @public
 */

defineGetter(req, 'fresh', function() {
  const method = this.method;
  const res = this.res;
  const status = res.statusCode;

  // GET or HEAD for weak freshness validation only
  if ('GET' !== method && 'HEAD' !== method) return false;

  // 2xx or 304 as per rfc2616 14.26
  if ((status >= 200 && status < 300) || 304 === status) {
    return fresh(this.headers, {
      etag: res.get('ETag'),
      'last-modified': res.get('Last-Modified'),
    });
  }

  return false;
});

/**
 * Check if the request is stale, aka
 * "Last-Modified" and / or the "ETag" for the
 * resource has changed.
 *
 * @return {Boolean}
 * @public
 */

defineGetter(req, 'stale', function stale() {
  return !this.fresh;
});

/**
 * Check if the request was an _XMLHttpRequest_.
 *
 * @return {Boolean}
 * @public
 */

defineGetter(req, 'xhr', function xhr() {
  const val = this.get('X-Requested-With') || '';
  return val.toLowerCase() === 'xmlhttprequest';
});

/**
 * Helper function for creating a getter on an object.
 *
 * @param {Object} obj
 * @param {String} name
 * @param {Function} getter
 * @private
 */
function defineGetter(obj, name, getter) {
  Object.defineProperty(obj, name, {
    configurable: true,
    enumerable: true,
    get: getter,
  });
}

async function generatePayload(req) {
  const obj = {};

  const searchParams = new URLSearchParams(req.url.split('?')[1]);
  for (const [key, value] of searchParams) {
    obj[key] = value;
  }

  const body = await bodyParser(req);
  if (body)
    Object.assign(obj, body);
  req.payload = obj;
}

/**
 * Module exports.
 * @public
 */

const generateRequest = async (defaultReq) => {
  await generatePayload(defaultReq);
  return Object.assign(Object.create(req), defaultReq);
};

export default generateRequest;
