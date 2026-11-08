import * as assert from 'assert';
import { scanSource } from '../../scanner';
import { inferFromUsage } from '../../rules/fromUsage';

describe('Usage-Based Inference Rules (fromUsage)', () => {
  it('infers plural noun when collection methods (.length, .push) are used on variable', () => {
    const code = `
      function run() {
        const x = getUnknown();
        x.push(10);
        console.log(x.length);
      }
    `;
    const { declarations } = scanSource(code);
    const targetDecl = declarations.find((d) => d.name === 'x');
    assert.ok(targetDecl);

    const candidates = inferFromUsage(targetDecl);
    assert.ok(candidates.length > 0);
    assert.ok(candidates.some((c) => c.name === 'items' || c.name === 'elements'));
  });

  it('infers boolean prefix when used directly in an if condition', () => {
    const code = `
      function check(flag) {
        if (flag) {
          doAction();
        }
      }
    `;
    const { declarations } = scanSource(code);
    const targetDecl = declarations.find((d) => d.name === 'flag');
    assert.ok(targetDecl);

    const candidates = inferFromUsage(targetDecl);
    assert.ok(candidates.length > 0);
    assert.ok(candidates.some((c) => c.name.startsWith('is') || c.name.startsWith('has')));
  });

  it('infers singular noun when used as an arrow parameter in collection iteration: users.map(x => ...)', () => {
    const code = `
      const results = users.map(x => x.name);
    `;
    const { declarations } = scanSource(code);
    const targetDecl = declarations.find((d) => d.name === 'x');
    assert.ok(targetDecl);

    const candidates = inferFromUsage(targetDecl);
    assert.ok(candidates.length > 0);
    assert.strictEqual(candidates[0].name, 'user');
    assert.ok(candidates[0].confidence >= 0.9);
  });

  it('infers from function call argument when function declaration parameter name is descriptive', () => {
    const code = `
      function sendEmail(address) {}
      function run() {
        const x = getRecipient();
        sendEmail(x);
      }
    `;
    const { declarations } = scanSource(code);
    const targetDecl = declarations.find((d) => d.name === 'x');
    assert.ok(targetDecl);

    const candidates = inferFromUsage(targetDecl);
    assert.ok(candidates.length > 0);
    assert.strictEqual(candidates[0].name, 'address');
  });

  it('infers from function name pattern when passed as argument: displayUser(x)', () => {
    const code = `
      function run() {
        const x = getObject();
        displayUser(x);
      }
    `;
    const { declarations } = scanSource(code);
    const targetDecl = declarations.find((d) => d.name === 'x');
    assert.ok(targetDecl);

    const candidates = inferFromUsage(targetDecl);
    assert.ok(candidates.length > 0);
    assert.strictEqual(candidates[0].name, 'user');
  });

  it('infers from TypeScript type annotation: const x: User[] -> users', () => {
    const code = `
      const x: User[] = getList();
    `;
    const { declarations } = scanSource(code);
    const targetDecl = declarations.find((d) => d.name === 'x');
    assert.ok(targetDecl);

    const candidates = inferFromUsage(targetDecl);
    assert.ok(candidates.length > 0);
    assert.strictEqual(candidates[0].name, 'users');
    assert.ok(candidates[0].confidence >= 0.9);
  });

  it('infers from TypeScript singular interface annotation: let x: Customer -> customer', () => {
    const code = `
      let x: Customer;
    `;
    const { declarations } = scanSource(code);
    const targetDecl = declarations.find((d) => d.name === 'x');
    assert.ok(targetDecl);

    const candidates = inferFromUsage(targetDecl);
    assert.ok(candidates.length > 0);
    assert.strictEqual(candidates[0].name, 'customer');
  });
});

