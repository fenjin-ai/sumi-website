import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const braces = require('braces');

describe('patched glob parser', () => {
  it('keeps ordinary source globs and range expansion intact', () => {
    expect(braces.compile('src/{en,zh}/**/*.css')).toBe('src/(en|zh)/**/*.css');
    expect(braces.expand('page-{1..3}.html')).toEqual([
      'page-1.html',
      'page-2.html',
      'page-3.html',
    ]);
    expect(braces.stringify(braces.parse('src/{en,zh}'))).toBe('src/{en,zh}');
  });

  it.each(['{', '('])(
    'rejects deeply nested %s input before a recursive walker runs',
    (open) => {
      const close = open === '{' ? '}' : ')';
      const pattern = open.repeat(4000) + 'a,b' + close.repeat(4000);
      for (const operation of [
        braces.parse,
        braces.compile,
        braces.expand,
        braces.stringify,
      ]) {
        expect(() => operation(pattern)).toThrow(
          'Brace nesting exceeds 128 levels',
        );
      }
    },
  );

  it('bounds manually supplied ASTs and cycles', () => {
    let tree = { type: 'text', value: 'x' };
    for (let i = 0; i < 200; i++) {
      tree = { type: 'brace', nodes: [tree] };
    }
    const cycle = { type: 'brace', nodes: [] };
    cycle.nodes.push(cycle);
    for (const operation of [braces.compile, braces.expand, braces.stringify]) {
      expect(() => operation(tree)).toThrow('Brace nesting exceeds 128 levels');
      expect(() => operation(cycle)).toThrow(
        'Brace nesting exceeds 128 levels',
      );
    }
  });
});
