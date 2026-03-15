/**
 * @fileoverview Tests for TargetRegistry routing logic.
 */
import { describe, it, expect, beforeEach } from 'vitest';

// Use a fresh instance per test by clearing the singleton
let TargetRegistry;
let registry;

beforeEach(async () => {
  // Reset module cache to get fresh singleton
  TargetRegistry = (await import('./registry.js')).default.constructor;
  // Re-import to use existing singleton, but clear its state
  const mod = await import('./registry.js');
  registry = mod.default;
  registry.targets = [];
  registry.globalMiddlewares = [];
});

describe('TargetRegistry.aim', () => {
  it('should return null for unmatched routes', () => {
    expect(registry.aim('/api/users')).toBeNull();
  });

  it('should match exact path', () => {
    const mockTarget = {
      getPath: () => '/api/users',
      getMethods: () => null,
    };
    registry.targets.push(mockTarget);
    const result = registry.aim('/api/users');
    expect(result).not.toBeNull();
    expect(result.target).toBe(mockTarget);
    expect(result.params).toBeDefined();
  });

  it('should match parameterized route and extract params', () => {
    const mockTarget = {
      getPath: () => '/api/users/:id',
      getMethods: () => null,
    };
    registry.targets.push(mockTarget);
    const result = registry.aim('/api/users/42');
    expect(result).not.toBeNull();
    expect(result.params.id).toBe('42');
  });

  it('should use Object.create(null) for params (no prototype pollution)', () => {
    const mockTarget = {
      getPath: () => '/api/:resource',
      getMethods: () => null,
    };
    registry.targets.push(mockTarget);
    const result = registry.aim('/api/users');
    // Param key is the route parameter name ('resource'), not the URL value
    expect(result.params['resource']).toBe('users');
    // The params object must use null prototype (safe from prototype pollution)
    expect(Object.getPrototypeOf(result.params)).toBeNull();
  });

  it('should not match routes with different segment counts', () => {
    const mockTarget = {
      getPath: () => '/api/users/:id',
      getMethods: () => null,
    };
    registry.targets.push(mockTarget);
    expect(registry.aim('/api/users')).toBeNull();
    expect(registry.aim('/api/users/42/profile')).toBeNull();
  });
});

describe('TargetRegistry.getAllEndpoints', () => {
  it('should return flat path list by default', () => {
    registry.targets = [
      {
        getPath: () => '/api/users',
        getMetadata: () => null,
        getHandler: () => null,
      },
      {
        getPath: () => '/api/posts',
        getMetadata: () => null,
        getHandler: () => null,
      },
    ];
    expect(registry.getAllEndpoints()).toEqual(['/api/users', '/api/posts']);
  });

  it('should return grouped object when grouped=true', () => {
    registry.targets = [
      {
        getPath: () => '/api/users',
        getMetadata: () => null,
        getHandler: () => null,
      },
      {
        getPath: () => '/api/posts',
        getMetadata: () => null,
        getHandler: () => null,
      },
    ];
    const grouped = registry.getAllEndpoints(true);
    expect(grouped['api']).toContain('/api/users');
    expect(grouped['api']).toContain('/api/posts');
    // Result must be null-prototype dict
    expect(Object.getPrototypeOf(grouped)).toBeNull();
  });
});
