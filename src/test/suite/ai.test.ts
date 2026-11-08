import * as assert from 'assert';
import * as ts from 'typescript';
import { extractEnclosingFunctionSnippet } from '../../aiUtils';

describe('AI Assistant Privacy & Snippet Extraction Tests', () => {
  it('extracts ONLY the enclosing function body and excludes outer file content', () => {
    const code = `
      const secretGlobal = "confidential-token";

      function outsideA() {
        return "not-sent";
      }

      function targetFunction() {
        const x = 123;
        return x * 2;
      }

      function outsideB() {
        return "also-not-sent";
      }
    `;

    const sourceFile = ts.createSourceFile(
      'test.ts',
      code,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS
    );

    // Position on `const x = 123;` (Line 9, column 14)
    const position: ts.LineAndCharacter = { line: 9, character: 14 };
    const { snippet, functionName } = extractEnclosingFunctionSnippet(sourceFile, position);

    assert.strictEqual(functionName, 'targetFunction');
    assert.ok(snippet.includes('const x = 123;'));
    assert.ok(snippet.includes('function targetFunction'));

    // Privacy verification: none of the outside content is present!
    assert.strictEqual(snippet.includes('secretGlobal'), false);
    assert.strictEqual(snippet.includes('confidential-token'), false);
    assert.strictEqual(snippet.includes('outsideA'), false);
    assert.strictEqual(snippet.includes('outsideB'), false);
  });

  it('extracts enclosing arrow function body correctly', () => {
    const code = `
      const multiply = (factor) => {
        const x = factor * 10;
        return x;
      };
    `;

    const sourceFile = ts.createSourceFile(
      'test.ts',
      code,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS
    );

    const position: ts.LineAndCharacter = { line: 2, character: 14 };
    const { snippet } = extractEnclosingFunctionSnippet(sourceFile, position);

    assert.ok(snippet.includes('const x = factor * 10;'));
  });

  it('truncates excessively large function bodies', () => {
    const longBody = 'const a = 1;\n'.repeat(300);
    const code = `function hugeFunction() {\n${longBody}\n}`;

    const sourceFile = ts.createSourceFile(
      'test.ts',
      code,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS
    );

    const position: ts.LineAndCharacter = { line: 5, character: 4 };
    const { snippet } = extractEnclosingFunctionSnippet(sourceFile, position);

    assert.ok(snippet.length <= 2015);
  });
});
