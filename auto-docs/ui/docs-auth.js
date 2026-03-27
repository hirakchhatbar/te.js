/**
 * Password protection for the docs UI. When a password is configured,
 * visitors must authenticate via a login form before viewing the docs.
 *
 * Uses an HMAC-based cookie so no server-side session state is needed.
 * All comparisons are timing-safe to prevent timing attacks.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = '_tejs_docs';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
const HMAC_KEY = 'tejs-docs-auth-v1';

function createToken(password) {
  return createHmac('sha256', password).update(HMAC_KEY).digest('hex');
}

/**
 * Timing-safe password comparison. Both values are HMAC'd first so
 * the comparison never leaks password length.
 */
function verifyPassword(submitted, expected) {
  const a = createHmac('sha256', HMAC_KEY)
    .update(String(submitted ?? ''))
    .digest();
  const b = createHmac('sha256', HMAC_KEY).update(String(expected)).digest();
  return timingSafeEqual(a, b);
}

function parseCookies(header) {
  if (!header) return {};
  return Object.fromEntries(
    header.split(';').map((c) => {
      const [k, ...v] = c.trim().split('=');
      return [k.trim(), v.join('=').trim()];
    }),
  );
}

function isAuthenticated(headers, password) {
  const token = parseCookies(headers?.cookie)[COOKIE_NAME];
  if (!token) return false;
  const expected = createToken(password);
  if (token.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}

function setAuthCookie(res, password) {
  const token = createToken(password);
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${COOKIE_MAX_AGE}`,
  );
}

function buildLoginPage(error = null) {
  const errorHtml = error ? `<div class="error">${error}</div>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>API Documentation</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #0f0f11;
      color: #e4e4e7;
    }
    .card {
      width: 100%;
      max-width: 380px;
      padding: 40px 32px;
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 16px;
    }
    .icon {
      width: 48px;
      height: 48px;
      margin: 0 auto 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #27272a;
      border-radius: 12px;
    }
    .icon svg { width: 24px; height: 24px; color: #a1a1aa; }
    h1 {
      font-size: 20px;
      font-weight: 600;
      text-align: center;
      margin-bottom: 6px;
      color: #fafafa;
    }
    .subtitle {
      font-size: 14px;
      text-align: center;
      color: #71717a;
      margin-bottom: 28px;
    }
    .error {
      background: #371520;
      border: 1px solid #5c1d33;
      color: #fca5a5;
      font-size: 13px;
      padding: 10px 14px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      color: #a1a1aa;
      margin-bottom: 6px;
    }
    input[type="password"] {
      width: 100%;
      padding: 10px 14px;
      font-size: 14px;
      background: #09090b;
      border: 1px solid #27272a;
      border-radius: 8px;
      color: #fafafa;
      outline: none;
      transition: border-color 0.15s;
    }
    input[type="password"]:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
    }
    input[type="password"]::placeholder { color: #52525b; }
    button {
      width: 100%;
      margin-top: 18px;
      padding: 10px 0;
      font-size: 14px;
      font-weight: 500;
      color: #fff;
      background: #2563eb;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.15s;
    }
    button:hover { background: #1d4ed8; }
    button:active { background: #1e40af; }
  </style>
</head>
<body>
  <form class="card" method="POST">
    <div class="icon">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
      </svg>
    </div>
    <h1>API Documentation</h1>
    <p class="subtitle">Enter the password to continue</p>
    ${errorHtml}
    <label for="password">Password</label>
    <input type="password" id="password" name="password" placeholder="Enter password" required autofocus />
    <button type="submit">Continue</button>
  </form>
</body>
</html>`;
}

const DOCS_URL = 'https://usetejas.com/docs/auto-docs';

function buildSetupPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>API Documentation</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #0f0f11;
      color: #e4e4e7;
    }
    .card {
      width: 100%;
      max-width: 460px;
      padding: 40px 32px;
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 16px;
    }
    .icon {
      width: 48px;
      height: 48px;
      margin: 0 auto 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #27272a;
      border-radius: 12px;
    }
    .icon svg { width: 24px; height: 24px; color: #eab308; }
    h1 {
      font-size: 20px;
      font-weight: 600;
      text-align: center;
      margin-bottom: 6px;
      color: #fafafa;
    }
    .subtitle {
      font-size: 14px;
      text-align: center;
      color: #71717a;
      margin-bottom: 28px;
      line-height: 1.5;
    }
    .code-block {
      background: #09090b;
      border: 1px solid #27272a;
      border-radius: 8px;
      padding: 14px 16px;
      font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace;
      font-size: 13px;
      color: #a1a1aa;
      margin-bottom: 20px;
      overflow-x: auto;
    }
    .code-block .env-key { color: #22d3ee; }
    .code-block .env-val { color: #a78bfa; }
    .hint {
      font-size: 13px;
      color: #71717a;
      text-align: center;
      line-height: 1.5;
    }
    .hint a {
      color: #3b82f6;
      text-decoration: none;
    }
    .hint a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
      </svg>
    </div>
    <h1>API Docs Disabled</h1>
    <p class="subtitle">A password is required to serve API documentation in production. Set the <strong>DOCS_PASSWORD</strong> environment variable to enable access.</p>
    <div class="code-block"><span class="env-key">DOCS_PASSWORD</span>=<span class="env-val">your-secret-here</span></div>
    <p class="hint">Learn more about <a href="${DOCS_URL}" target="_blank" rel="noopener">serving and protecting API docs</a></p>
  </div>
</body>
</html>`;
}

/**
 * Returns true when docs should be disabled without a password:
 * NODE_ENV is unset or set to 'production'.
 */
function requiresPasswordForEnv() {
  const env = process.env.NODE_ENV;
  return !env || env === 'production';
}

export {
  isAuthenticated,
  setAuthCookie,
  verifyPassword,
  buildLoginPage,
  buildSetupPage,
  requiresPasswordForEnv,
};
