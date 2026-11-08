import * as assert from 'assert';
import { scanSource } from '../../scanner';
import { checkWeakName } from '../../rules/badNames';
import { DEFAULT_CONFIG } from '../../types';

describe('Bad Names Rule Tests', () => {
  it('flags names from the blocklist', () => {
    const code = `
      const temp = 42;
      let foo = "test";
      var data = [1, 2, 3];
      const obj = {};
    `;
    const { declarations, scopes } = scanSource(code);
    const violations = declarations
      .map((d) => checkWeakName(d, DEFAULT_CONFIG, scopes))
      .filter((v) => v !== null);

    assert.strictEqual(violations.length, 4);
    assert.strictEqual(violations[0]?.name, 'temp');
    assert.strictEqual(violations[0]?.ruleId, 'blocklist');
    assert.strictEqual(violations[1]?.name, 'foo');
    assert.strictEqual(violations[2]?.name, 'data');
    assert.strictEqual(violations[3]?.name, 'obj');
  });

  it('flags single-letter names outside allowed contexts', () => {
    const code = `
      const a = 10;
      let b = 20;
      function compute(q) {
        return q * 2;
      }
    `;
    const { declarations, scopes } = scanSource(code);
    const violations = declarations
      .map((d) => checkWeakName(d, DEFAULT_CONFIG, scopes))
      .filter((v) => v !== null);

    assert.strictEqual(violations.length, 3);
    assert.strictEqual(violations[0]?.name, 'a');
    assert.strictEqual(violations[0]?.ruleId, 'single-letter');
    assert.strictEqual(violations[1]?.name, 'b');
    assert.strictEqual(violations[2]?.name, 'q');
  });

  it('permits loop variables i, j, k in for loops', () => {
    const code = `
      for (let i = 0; i < 10; i++) {}
      for (let j = 0; j < 5; j++) {}
      for (let k = 0; k < 2; k++) {}
    `;
    const { declarations, scopes } = scanSource(code);
    const violations = declarations
      .map((d) => checkWeakName(d, DEFAULT_CONFIG, scopes))
      .filter((v) => v !== null);

    assert.strictEqual(violations.length, 0);
  });

  it('permits catch clause parameter e', () => {
    const code = `
      try {
        doSomething();
      } catch (e) {
        console.error(e);
      }
    `;
    const { declarations, scopes } = scanSource(code);
    const violations = declarations
      .map((d) => checkWeakName(d, DEFAULT_CONFIG, scopes))
      .filter((v) => v !== null);

    assert.strictEqual(violations.length, 0);
  });

  it('permits underscore _ for unused values', () => {
    const code = `
      const _ = 123;
      function run(_, second) {}
    `;
    const { declarations, scopes } = scanSource(code);
    const violations = declarations
      .map((d) => checkWeakName(d, DEFAULT_CONFIG, scopes))
      .filter((v) => v !== null && v.name === '_');

    assert.strictEqual(violations.length, 0);
  });

  it('permits x and y in coordinate/point contexts', () => {
    const code = `
      function setPoint(point) {
        const { x, y } = point;
      }
      const position = { x: 10, y: 20 };
    `;
    const { declarations, scopes } = scanSource(code);
    const violations = declarations
      .map((d) => checkWeakName(d, DEFAULT_CONFIG, scopes))
      .filter((v) => v !== null && (v.name === 'x' || v.name === 'y'));

    assert.strictEqual(violations.length, 0);
  });

  it('permits e in event handler contexts', () => {
    const code = `
      button.addEventListener('click', (e) => {
        console.log(e);
      });
      function onClick(e) {
        return e.target;
      }
    `;
    const { declarations, scopes } = scanSource(code);
    const violations = declarations
      .map((d) => checkWeakName(d, DEFAULT_CONFIG, scopes))
      .filter((v) => v !== null && v.name === 'e');

    assert.strictEqual(violations.length, 0);
  });

  it('detects trailing number patterns', () => {
    const code = `
      const user1 = { id: 1 };
      const user2 = { id: 2 };
      const list1 = [1, 2];
    `;
    const { declarations, scopes } = scanSource(code);
    const violations = declarations
      .map((d) => checkWeakName(d, DEFAULT_CONFIG, scopes))
      .filter((v) => v !== null);

    assert.ok(violations.some((v) => v.name === 'user1' && v.ruleId === 'trailing-number'));
    assert.ok(violations.some((v) => v.name === 'user2' && v.ruleId === 'trailing-number'));
  });

  it('detects type contradictions', () => {
    const code = `
      const flag = count > 0;
      const item = [1, 2, 3];
    `;
    const { declarations, scopes } = scanSource(code);
    const violations = declarations
      .map((d) => checkWeakName(d, DEFAULT_CONFIG, scopes))
      .filter((v) => v !== null);

    assert.strictEqual(violations.length, 2);
    assert.strictEqual(violations[0]?.name, 'flag');
    assert.strictEqual(violations[0]?.ruleId, 'type-contradiction');
    assert.strictEqual(violations[1]?.name, 'item');
    assert.strictEqual(violations[1]?.ruleId, 'type-contradiction');
  });

  it('honors ignoredNames setting', () => {
    const code = `
      const temp = 42;
    `;
    const { declarations, scopes } = scanSource(code);
    const violations = declarations
      .map((d) =>
        checkWeakName(
          d,
          { ...DEFAULT_CONFIG, ignoredNames: ['temp'] },
          scopes
        )
      )
      .filter((v) => v !== null);

    assert.strictEqual(violations.length, 0);
  });
});

