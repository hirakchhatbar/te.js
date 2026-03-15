/**
 * Unit tests for lib/llm parse utilities (extractJSON, extractJSONArray, reconcileOrderedTags).
 */
import { describe, it, expect } from 'vitest';
import {
  extractJSON,
  extractJSONArray,
  reconcileOrderedTags,
} from './index.js';

describe('llm/parse', () => {
  describe('extractJSON', () => {
    it('extracts object from plain JSON string', () => {
      const str = '{"name":"Users","description":"CRUD"}';
      expect(extractJSON(str)).toEqual({ name: 'Users', description: 'CRUD' });
    });
    it('extracts first object from text with markdown', () => {
      const str = 'Here is the result:\n```json\n{"summary":"Get item"}\n```';
      expect(extractJSON(str)).toEqual({ summary: 'Get item' });
    });
    it('returns null for empty or no object', () => {
      expect(extractJSON('')).toBeNull();
      expect(extractJSON('no brace here')).toBeNull();
    });
  });

  describe('extractJSONArray', () => {
    it('extracts array from string', () => {
      const str = '["Users", "Auth", "Health"]';
      expect(extractJSONArray(str)).toEqual(['Users', 'Auth', 'Health']);
    });
    it('returns null when no array', () => {
      expect(extractJSONArray('')).toBeNull();
      expect(extractJSONArray('nothing')).toBeNull();
    });
  });

  describe('reconcileOrderedTags', () => {
    it('reorders tags by orderedTagNames', () => {
      const tags = [
        { name: 'Health', description: '...' },
        { name: 'Users', description: '...' },
        { name: 'Auth', description: '...' },
      ];
      const ordered = reconcileOrderedTags(['Users', 'Auth', 'Health'], tags);
      expect(ordered.map((t) => t.name)).toEqual(['Users', 'Auth', 'Health']);
    });
    it('appends tags not in orderedTagNames', () => {
      const tags = [{ name: 'Users' }, { name: 'Other' }];
      const ordered = reconcileOrderedTags(['Users'], tags);
      expect(ordered.map((t) => t.name)).toEqual(['Users', 'Other']);
    });
    it('returns copy of tags when orderedTagNames empty', () => {
      const tags = [{ name: 'A' }];
      const ordered = reconcileOrderedTags([], tags);
      expect(ordered).toEqual([{ name: 'A' }]);
      expect(ordered).not.toBe(tags);
    });
  });
});
