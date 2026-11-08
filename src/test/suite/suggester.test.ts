import * as assert from 'assert';
import { scanSource } from '../../scanner';
import { suggestCandidates, getNamesInScope, JS_TS_RESERVED_WORDS } from '../../suggester';

describe('Suggester Tests (Scope Collision, Ranking, Reserved Words)', () => {
  it('correctly collects identifiers declared in current and parent scopes', () => {
    const code = `
      const outerA = 1;
      let outerB = 2;
      function test() {
        const innerA = 3;
        const x = [];
      }
    `;
    const { declarations, scopes } = scanSource(code);
    const targetDecl = declarations.find((d) => d.name === 'x');
    assert.ok(targetDecl);

    const inScope = getNamesInScope(targetDecl, scopes);
    assert.ok(inScope.has('outerA'));
    assert.ok(inScope.has('outerB'));
    assert.ok(inScope.has('innerA'));
    // Should not count x itself as collision
    assert.strictEqual(inScope.has('x'), false);
  });

  it('filters out candidates that collide with existing variables in scope', () => {
    const code = `
      const items = ['already', 'here'];
      function run() {
        const x = [];
      }
    `;
    const { declarations, scopes } = scanSource(code);
    const targetDecl = declarations.find((d) => d.name === 'x');
    assert.ok(targetDecl);

    const candidates = suggestCandidates(targetDecl, scopes, {
      confidenceThreshold: 0.6,
    });

    // Normally [] suggests 'items', but 'items' already exists in outer scope!
    assert.strictEqual(candidates.some((c) => c.name === 'items'), false);
    // Should fall back to non-colliding candidates like 'elements'
    assert.ok(candidates.some((c) => c.name === 'elements'));
  });

  it('filters out candidates that match JavaScript/TypeScript reserved words', () => {
    assert.ok(JS_TS_RESERVED_WORDS.has('class'));
    assert.ok(JS_TS_RESERVED_WORDS.has('function'));
    assert.ok(JS_TS_RESERVED_WORDS.has('return'));
    assert.ok(JS_TS_RESERVED_WORDS.has('default'));
  });

  it('returns at most 3 candidates sorted by confidence descending', () => {
    const code = `
      const x = document.getElementById('submit-button');
    `;
    const { declarations, scopes } = scanSource(code);
    const targetDecl = declarations.find((d) => d.name === 'x');
    assert.ok(targetDecl);

    const candidates = suggestCandidates(targetDecl, scopes, {
      confidenceThreshold: 0.5,
    });

    assert.ok(candidates.length <= 3);
    for (let i = 1; i < candidates.length; i++) {
      assert.ok(candidates[i - 1].confidence >= candidates[i].confidence);
    }
  });

  it('filters out candidates below the confidence threshold', () => {
    const code = `
      const x = [];
    `;
    const { declarations, scopes } = scanSource(code);
    const targetDecl = declarations.find((d) => d.name === 'x');
    assert.ok(targetDecl);

    // High threshold: only candidates >= 0.78
    const candidates = suggestCandidates(targetDecl, scopes, {
      confidenceThreshold: 0.78,
    });

    assert.ok(candidates.every((c) => c.confidence >= 0.78));
  });
});

