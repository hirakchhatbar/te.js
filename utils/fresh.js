/*!
 * range-parser
 * Copyright(c) 2012-2014 TJ Holowaychuk
 * Copyright(c) 2015-2016 Douglas Christopher Wilson
 * MIT Licensed
 */


'use strict'

/**
 * RegExp to check for no-cache token in Cache-Control.
 * @private
 */

const CACHE_CONTROL_NO_CACHE_REGEXP = /(?:^|,)\s*?no-cache\s*?(?:,|$)/

/**
 * Module exports.
 * @public
 */

export default fresh;

/**
 * Check freshness of the response using request and response headers.
 *
 * @param {Object} reqHeaders
 * @param {Object} resHeaders
 * @return {Boolean}
 * @public
 */

function fresh (reqHeaders, resHeaders) {
    // fields
    const modifiedSince = reqHeaders['if-modified-since']
    const noneMatch = reqHeaders['if-none-match']

    // unconditional request
    if (!modifiedSince && !noneMatch) {
        return false
    }


    const cacheControl = reqHeaders['cache-control']
    if (cacheControl && CACHE_CONTROL_NO_CACHE_REGEXP.test(cacheControl)) {
        return false
    }

    if (noneMatch && noneMatch !== '*') {
        const etag = resHeaders.etag

        if (!etag) {
            return false
        }

        let etagStale = true
        const matches = parseTokenList(noneMatch)
        for (let i = 0; i < matches.length; i++) {
            const match = matches[i]
            if (match === etag || match === 'W/' + etag || 'W/' + match === etag) {
                etagStale = false
                break
            }
        }

        if (etagStale) {
            return false
        }
    }

    // if-modified-since
    if (modifiedSince) {
        const lastModified = resHeaders['last-modified']
        const modifiedStale =
          !lastModified ||
          !(parseHttpDate(lastModified) <= parseHttpDate(modifiedSince));

        if (modifiedStale) {
          return false;
        }
    }

    return true
}

/**
 * Parse an HTTP Date into a number.
 *
 * @param {string} date
 * @private
 */

function parseHttpDate (date) {
    const timestamp = date && Date.parse(date);

    // istanbul ignore next: guard against date.js Date.parse patching
    return typeof timestamp === 'number'
        ? timestamp
        : NaN
}

/**
 * Parse HTTP token list.
 *
 * @param {string} str
 * @private
 */

function parseTokenList(str) {
    let end = 0;
    const list = [];
    let start = 0;

    // gather tokens
  let i = 0;
  const len = str.length;
  for (; i < len; i++) {
    switch (str.charCodeAt(i)) {
      case 0x20 /*   */:
        if (start === end) {
          start = end = i + 1;
        }
        break;
      case 0x2c /* , */:
        list.push(str.substring(start, end));
        start = end = i + 1;
        break;
      default:
        end = i + 1;
        break;
    }
  }

  // final token
  list.push(str.substring(start, end));

  return list;
}