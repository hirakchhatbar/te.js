/**
 * Test routes for LLM-enabled error handling (errors.llm.enabled).
 * Requires LLM_* or ERRORS_LLM_* env vars (baseURL, apiKey, model).
 */
import { Target } from 'te.js';

const errors = new Target('/errors');

// 1. Explicit ammo.throw() with no args — LLM infers status/message from code context
errors.register('/throw', (ammo) => {
  if (!ammo.GET) return ammo.notAllowed();

  const user = getUser();
  if (!user) {
    ammo.throw();
  }
  ammo.throw();
});

// 2. Framework-caught error — same ammo.throw(err) path, LLM infers from error stack
errors.register('/crash', async (ammo) => {
  if (!ammo.GET) return ammo.notAllowed();
  throw new Error('Simulated failure: user lookup failed');
});

// 3. Optional: explicit code/message (LLM not used)
errors.register('/explicit', (ammo) => {
  if (!ammo.GET) return ammo.notAllowed();
  ammo.throw(400, 'Bad request');
});

export default errors;
