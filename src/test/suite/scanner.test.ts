import * as assert from 'assert';
import { scanSource } from '../../scanner';

describe('Scanner Tests', () => {
  it('scans const, let, and var declarations with accurate positions', () => {
    const code = 'const alpha = 1;\nlet beta = 2;\nvar gamma = 3;';
    const { declarations } = scanSource(code);

    assert.strictEqual(declarations.length, 3);

    assert.strictEqual(declarations[0].name, 'alpha');
    assert.strictEqual(declarations[0].kind, 'const');
    assert.strictEqual(declarations[0].range.start.line, 0);
    assert.strictEqual(declarations[0].initializerCode, '1');

    assert.strictEqual(declarations[1].name, 'beta');
    assert.strictEqual(declarations[1].kind, 'let');
    assert.strictEqual(declarations[1].range.start.line, 1);
    assert.strictEqual(declarations[1].initializerCode, '2');

    assert.strictEqual(declarations[2].name, 'gamma');
    assert.strictEqual(declarations[2].kind, 'var');
    assert.strictEqual(declarations[2].range.start.line, 2);
  });

  it('scans function parameters and arrow parameters', () => {
    const code = `
      function greet(greeting, target) {
        return greeting + target;
      }
      const multiply = (factorA, factorB) => factorA * factorB;
    `;
    const { declarations } = scanSource(code);
    const params = declarations.filter((d) => d.isParameter);

    assert.strictEqual(params.length, 4);
    assert.strictEqual(params[0].name, 'greeting');
    assert.strictEqual(params[1].name, 'target');
    assert.strictEqual(params[2].name, 'factorA');
    assert.strictEqual(params[2].isArrowParameter, true);
    assert.strictEqual(params[3].name, 'factorB');
    assert.strictEqual(params[3].isArrowParameter, true);
  });

  it('scans destructured object and array bindings', () => {
    const code = `
      const { user, status: userStatus } = response;
      const [firstItem, secondItem] = items;
    `;
    const { declarations } = scanSource(code);
    const names = declarations.map((d) => d.name);

    assert.ok(names.includes('user'));
    assert.ok(names.includes('userStatus'));
    assert.ok(names.includes('firstItem'));
    assert.ok(names.includes('secondItem'));
  });

  it('scans loop variables and flags them as isLoopVariable', () => {
    const code = `
      for (let i = 0; i < 10; i++) {}
      for (const item of items) {}
      for (const key in object) {}
    `;
    const { declarations } = scanSource(code);

    assert.strictEqual(declarations.length, 3);
    assert.ok(declarations.every((d) => d.isLoopVariable));
  });

  it('scans catch clause parameter and flags it as isCatchClause', () => {
    const code = `
      try {} catch (err) {}
    `;
    const { declarations } = scanSource(code);

    assert.strictEqual(declarations.length, 1);
    assert.strictEqual(declarations[0].name, 'err');
    assert.strictEqual(declarations[0].isCatchClause, true);
  });

  it('recovers gracefully from syntax errors without throwing', () => {
    const brokenCode = `
      const x = ;
      function ( broken
      let normal = 123;
    `;
    assert.doesNotThrow(() => {
      const result = scanSource(brokenCode);
      assert.ok(result.declarations.length > 0);
    });
  });
});

