/**
 * Unit tests for auto-docs source-resolver (extractRelativeImports, resolveTargetFilePath, formatDependencyContext).
 */
import { describe, it, expect } from 'vitest';
import path from 'node:path';
import {
  extractRelativeImports,
  resolveTargetFilePath,
  formatDependencyContext,
} from '../../auto-docs/analysis/source-resolver.js';

describe('source-resolver', () => {
  describe('extractRelativeImports', () => {
    it('extracts relative import paths', () => {
      const source = `import x from './foo.js';\nimport { y } from '../bar.js';`;
      const imports = extractRelativeImports(source);
      expect(imports).toContain('./foo.js');
      expect(imports).toContain('../bar.js');
    });
    it('ignores absolute or node imports', () => {
      const source = `import path from 'path';\nimport x from './local.js';`;
      const imports = extractRelativeImports(source);
      expect(imports).toEqual(['./local.js']);
    });
    it('returns unique paths', () => {
      const source = `import a from './foo.js';\nimport b from './foo.js';`;
      expect(extractRelativeImports(source)).toHaveLength(1);
    });
  });

  describe('resolveTargetFilePath', () => {
    it('joins dirTargets with groupId and .target.js', () => {
      const resolved = resolveTargetFilePath('users', 'targets');
      expect(resolved).toMatch(/targets[\\/]users\.target\.js$/);
    });
    it('converts groupId slashes to path sep', () => {
      const resolved = resolveTargetFilePath('subdir/users', 'targets');
      expect(resolved).toMatch(/subdir[\\/]users\.target\.js$/);
    });
  });

  describe('formatDependencyContext', () => {
    it('returns empty string for empty sources', () => {
      expect(formatDependencyContext(new Map(), null)).toBe('');
    });
    it('formats map of path -> source with labels', () => {
      const sources = new Map([
        ['/cwd/targets/users.target.js', 'const x = 1;'],
        ['/cwd/services/user.js', 'const y = 2;'],
      ]);
      const targetPath = '/cwd/targets/users.target.js';
      const out = formatDependencyContext(sources, targetPath, 1000);
      expect(out).toContain('Target');
      expect(out).toContain('const x = 1;');
      expect(out).toContain('const y = 2;');
    });
  });
});
