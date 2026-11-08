import * as assert from 'assert';
import { scanSource } from '../../scanner';
import { inferFromInitializer, pluralize, singularize, toCamelCase } from '../../rules/fromValue';

describe('Value-Based Inference Rules (fromValue)', () => {
  describe('Helper Utilities', () => {
    it('pluralizes nouns accurately', () => {
      assert.strictEqual(pluralize('user'), 'users');
      assert.strictEqual(pluralize('item'), 'items');
      assert.strictEqual(pluralize('category'), 'categories');
      assert.strictEqual(pluralize('box'), 'boxes');
      assert.strictEqual(pluralize('person'), 'people');
      assert.strictEqual(pluralize('child'), 'children');
    });

    it('singularizes nouns accurately', () => {
      assert.strictEqual(singularize('users'), 'user');
      assert.strictEqual(singularize('items'), 'item');
      assert.strictEqual(singularize('categories'), 'category');
      assert.strictEqual(singularize('boxes'), 'box');
      assert.strictEqual(singularize('people'), 'person');
      assert.strictEqual(singularize('children'), 'child');
    });

    it('converts identifiers, selectors and kebab-case to camelCase', () => {
      assert.strictEqual(toCamelCase('submit'), 'submit');
      assert.strictEqual(toCamelCase('submit-btn'), 'submitBtn');
      assert.strictEqual(toCamelCase('.user-card'), 'userCard');
      assert.strictEqual(toCamelCase('#main-container'), 'mainContainer');
    });
  });

  describe('Initializer Row Tests', () => {
    it('infers from empty array literal: []', () => {
      const { declarations } = scanSource('const x = [];');
      const candidates = inferFromInitializer(declarations[0]);

      assert.ok(candidates.length > 0);
      assert.strictEqual(candidates[0].name, 'items');
      assert.ok(candidates[0].confidence >= 0.7);
    });

    it('infers from empty object literal: {}', () => {
      const { declarations } = scanSource('const x = {};');
      const candidates = inferFromInitializer(declarations[0]);

      assert.ok(candidates.length > 0);
      assert.ok(candidates.some((c) => c.name === 'options' || c.name === 'config'));
    });

    it('infers from await fetch(...)', () => {
      const { declarations } = scanSource("const x = await fetch('https://api.example.com');");
      const candidates = inferFromInitializer(declarations[0]);

      assert.ok(candidates.length > 0);
      assert.strictEqual(candidates[0].name, 'response');
      assert.ok(candidates[0].confidence >= 0.9);
    });

    it('infers from await res.json() / response.json()', () => {
      const { declarations } = scanSource('const x = await res.json();');
      const candidates = inferFromInitializer(declarations[0]);

      assert.ok(candidates.length > 0);
      assert.ok(candidates.some((c) => c.name === 'parsedResponse' || c.name === 'responseData'));
    });

    it('infers from new Date()', () => {
      const { declarations } = scanSource('const x = new Date();');
      const candidates = inferFromInitializer(declarations[0]);

      assert.ok(candidates.length > 0);
      assert.ok(candidates.some((c) => c.name === 'currentDate' || c.name === 'date'));
      assert.ok(candidates[0].confidence >= 0.85);
    });

    it("infers from document.getElementById('submit')", () => {
      const { declarations } = scanSource("const x = document.getElementById('submit-button');");
      const candidates = inferFromInitializer(declarations[0]);

      assert.ok(candidates.length > 0);
      assert.strictEqual(candidates[0].name, 'submitButtonElement');
      assert.ok(candidates[0].confidence >= 0.9);
    });

    it("infers from document.querySelector('.card')", () => {
      const { declarations } = scanSource("const x = document.querySelector('.card');");
      const candidates = inferFromInitializer(declarations[0]);

      assert.ok(candidates.length > 0);
      assert.strictEqual(candidates[0].name, 'cardElement');
      assert.ok(candidates[0].confidence >= 0.9);
    });

    it("infers from document.querySelectorAll('.card')", () => {
      const { declarations } = scanSource("const x = document.querySelectorAll('.card');");
      const candidates = inferFromInitializer(declarations[0]);

      assert.ok(candidates.length > 0);
      assert.strictEqual(candidates[0].name, 'cardElements');
    });

    it('infers from arr.filter(...) -> filtered + capitalized source name', () => {
      const { declarations } = scanSource('const x = users.filter(u => u.active);');
      const candidates = inferFromInitializer(declarations[0]);

      assert.ok(candidates.length > 0);
      assert.strictEqual(candidates[0].name, 'filteredUsers');
      assert.ok(candidates[0].confidence >= 0.9);
    });

    it('infers from arr.map(...) with property extraction -> users.map(u => u.name)', () => {
      const { declarations } = scanSource('const x = users.map(u => u.name);');
      const candidates = inferFromInitializer(declarations[0]);

      assert.ok(candidates.length > 0);
      assert.strictEqual(candidates[0].name, 'userNames');
      assert.ok(candidates[0].confidence >= 0.9);
    });

    it('infers from generic arr.map(...)', () => {
      const { declarations } = scanSource('const x = items.map(fn);');
      const candidates = inferFromInitializer(declarations[0]);

      assert.ok(candidates.length > 0);
      assert.strictEqual(candidates[0].name, 'mappedItems');
    });

    it('infers from arr.find(...) -> singular of source name', () => {
      const { declarations } = scanSource('const x = users.find(u => u.id === targetId);');
      const candidates = inferFromInitializer(declarations[0]);

      assert.ok(candidates.length > 0);
      assert.strictEqual(candidates[0].name, 'user');
      assert.ok(candidates[0].confidence >= 0.9);
    });

    it('infers from comparison / boolean expression', () => {
      const { declarations } = scanSource('const x = count > 10;');
      const candidates = inferFromInitializer(declarations[0]);

      assert.ok(candidates.length > 0);
      assert.strictEqual(candidates[0].name, 'isValid');
      assert.ok(candidates[0].name.startsWith('is') || candidates[0].name.startsWith('has'));
    });

    it('infers from collection.length > 0 comparison', () => {
      const { declarations } = scanSource('const x = items.length > 0;');
      const candidates = inferFromInitializer(declarations[0]);

      assert.ok(candidates.length > 0);
      assert.strictEqual(candidates[0].name, 'hasItems');
    });

    it('infers from number literal 0', () => {
      const { declarations } = scanSource('let x = 0;');
      const candidates = inferFromInitializer(declarations[0]);

      assert.ok(candidates.length > 0);
      assert.strictEqual(candidates[0].name, 'count');
    });

    it('infers from new Map()', () => {
      const { declarations } = scanSource('const x = new Map();');
      const candidates = inferFromInitializer(declarations[0]);

      assert.ok(candidates.length > 0);
      assert.ok(candidates.some((c) => c.name.toLowerCase().includes('map')));
    });

    it('infers from new Set()', () => {
      const { declarations } = scanSource('const x = new Set();');
      const candidates = inferFromInitializer(declarations[0]);

      assert.ok(candidates.length > 0);
      assert.ok(candidates.some((c) => c.name === 'uniqueValues' || c.name.includes('Set')));
    });
  });
});

