import * as ts from 'typescript';

/**
 * Extracts only the enclosing function, arrow function, or method body around a node.
 * Pure AST function that does not depend on vscode.
 */
export function extractEnclosingFunctionSnippet(
  sourceFile: ts.SourceFile,
  position: ts.LineAndCharacter
): { snippet: string; functionName?: string } {
  const offset = sourceFile.getPositionOfLineAndCharacter(
    position.line,
    position.character
  );

  let targetFunctionNode: ts.Node | undefined;

  function findEnclosing(node: ts.Node): void {
    if (
      (ts.isFunctionDeclaration(node) ||
        ts.isFunctionExpression(node) ||
        ts.isArrowFunction(node) ||
        ts.isMethodDeclaration(node)) &&
      node.getStart(sourceFile) <= offset &&
      offset <= node.getEnd()
    ) {
      targetFunctionNode = node;
    }
    ts.forEachChild(node, findEnclosing);
  }

  findEnclosing(sourceFile);

  if (targetFunctionNode) {
    const text = targetFunctionNode.getText(sourceFile);
    // Limit snippet to 2,000 characters to prevent excessive payload
    return {
      snippet: text.length > 2000 ? text.slice(0, 2000) + '\n// ...' : text,
      functionName:
        ts.isFunctionDeclaration(targetFunctionNode) && targetFunctionNode.name
          ? targetFunctionNode.name.text
          : undefined,
    };
  }

  // Fallback to enclosing line
  const lineStart = sourceFile.getPositionOfLineAndCharacter(position.line, 0);
  const lineEnd = sourceFile.getLineEndOfPosition(lineStart);
  return {
    snippet: sourceFile.text.substring(lineStart, lineEnd).trim(),
  };
}

