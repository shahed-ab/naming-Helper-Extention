import * as ts from 'typescript';
import {
  DeclarationInfo,
  DeclarationKind,
  RangeInfo,
  ScopeInfo,
} from './types';

/**
 * Result returned by the AST scanner.
 */
export interface ScanResult {
  declarations: DeclarationInfo[];
  scopes: Map<number, ScopeInfo>;
  sourceFile: ts.SourceFile;
}

/**
 * Helper to compute 0-based RangeInfo from a TS node.
 */
export function getRangeInfo(sourceFile: ts.SourceFile, node: ts.Node): RangeInfo {
  const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
  return {
    start: { line: start.line, character: start.character },
    end: { line: end.line, character: end.character },
  };
}

/**
 * Determines ScriptKind from file path.
 */
function getScriptKind(fileName: string): ts.ScriptKind {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.tsx')) {
    return ts.ScriptKind.TSX;
  }
  if (lower.endsWith('.jsx')) {
    return ts.ScriptKind.JSX;
  }
  if (lower.endsWith('.ts')) {
    return ts.ScriptKind.TS;
  }
  return ts.ScriptKind.JS;
}

/**
 * Parses source text and scans all variable, parameter, and binding declarations.
 *
 * @param sourceText - The document code as a string
 * @param fileName - Optional file name used to determine script kind
 * @returns ScanResult containing all declarations, scopes, and the AST
 */
export function scanSource(
  sourceText: string,
  fileName: string = 'file.tsx'
): ScanResult {
  const scriptKind = getScriptKind(fileName);
  const sourceFile = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    scriptKind
  );

  const declarations: DeclarationInfo[] = [];
  const scopes = new Map<number, ScopeInfo>();

  let scopeCounter = 0;
  const scopeStack: number[] = [];

  function enterScope(): number {
    const id = ++scopeCounter;
    const parentId = scopeStack.length > 0 ? scopeStack[scopeStack.length - 1] : null;
    scopes.set(id, { id, parentId, declaredNames: new Set<string>() });
    scopeStack.push(id);
    return id;
  }

  function exitScope(): void {
    scopeStack.pop();
  }

  function currentScopeId(): number {
    return scopeStack.length > 0 ? scopeStack[scopeStack.length - 1] : 1;
  }

  // Create root global/module scope
  enterScope();

  function recordNameInScope(scopeId: number, name: string): void {
    const scope = scopes.get(scopeId);
    if (scope) {
      scope.declaredNames.add(name);
    }
  }

  function addDeclaration(decl: DeclarationInfo): void {
    declarations.push(decl);
    recordNameInScope(decl.scopeId, decl.name);
  }

  /**
   * Recursively extract identifiers from a BindingName (identifier, object pattern, or array pattern).
   */
  function extractBindingNames(
    nameNode: ts.BindingName,
    kind: DeclarationKind,
    declarationNode: ts.Node,
    initializer?: ts.Expression,
    flags: {
      isLoopVariable?: boolean;
      isCatchClause?: boolean;
      isParameter?: boolean;
      isArrowParameter?: boolean;
      isExported?: boolean;
    } = {}
  ): void {
    if (ts.isIdentifier(nameNode)) {
      const scopeId = currentScopeId();
      const parentScopeId = scopes.get(scopeId)?.parentId ?? null;
      const declInfo: DeclarationInfo = {
        name: nameNode.text,
        kind,
        range: getRangeInfo(sourceFile, nameNode),
        fullRange: getRangeInfo(sourceFile, declarationNode),
        scopeId,
        parentScopeId,
        isExported: flags.isExported ?? false,
        isLoopVariable: flags.isLoopVariable ?? false,
        isCatchClause: flags.isCatchClause ?? false,
        isParameter: flags.isParameter ?? false,
        isArrowParameter: flags.isArrowParameter ?? false,
        initializerCode: initializer ? initializer.getText(sourceFile) : undefined,
        initializerNode: initializer,
        nameNode,
        node: declarationNode,
        sourceFile,
      };
      addDeclaration(declInfo);
    } else if (ts.isObjectBindingPattern(nameNode)) {
      for (const element of nameNode.elements) {
        if (ts.isBindingElement(element)) {
          extractBindingNames(
            element.name,
            'destructured',
            element,
            element.initializer ?? initializer,
            flags
          );
        }
      }
    } else if (ts.isArrayBindingPattern(nameNode)) {
      for (const element of nameNode.elements) {
        if (ts.isBindingElement(element)) {
          extractBindingNames(
            element.name,
            'destructured',
            element,
            element.initializer ?? initializer,
            flags
          );
        }
      }
    }
  }

  function isNodeExported(node: ts.Node): boolean {
    const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
    return !!modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
  }

  function getVarDeclarationKind(declarationList: ts.VariableDeclarationList): DeclarationKind {
    if ((declarationList.flags & ts.NodeFlags.Const) !== 0) {
      return 'const';
    }
    if ((declarationList.flags & ts.NodeFlags.Let) !== 0) {
      return 'let';
    }
    return 'var';
  }

  function visit(node: ts.Node): void {
    try {
      // 1. Variable Statements: const, let, var
      if (ts.isVariableStatement(node)) {
        const isExported = isNodeExported(node);
        const kind = getVarDeclarationKind(node.declarationList);
        for (const decl of node.declarationList.declarations) {
          extractBindingNames(decl.name, kind, decl, decl.initializer, {
            isExported,
          });
        }
      }

      // 2. For, For-in, For-of loops
      else if (
        ts.isForStatement(node) ||
        ts.isForInStatement(node) ||
        ts.isForOfStatement(node)
      ) {
        enterScope();
        if (node.initializer && ts.isVariableDeclarationList(node.initializer)) {
          const kind = getVarDeclarationKind(node.initializer);
          for (const decl of node.initializer.declarations) {
            extractBindingNames(decl.name, kind, decl, decl.initializer, {
              isLoopVariable: true,
            });
          }
        }
        // Visit children inside the loop scope
        ts.forEachChild(node, visit);
        exitScope();
        return;
      }

      // 3. Catch clause
      else if (ts.isCatchClause(node)) {
        enterScope();
        if (node.variableDeclaration) {
          extractBindingNames(
            node.variableDeclaration.name,
            'catch',
            node.variableDeclaration,
            undefined,
            { isCatchClause: true }
          );
        }
        ts.forEachChild(node.block, visit);
        exitScope();
        return;
      }

      // 4. Function Declarations / Expressions / Methods
      else if (
        ts.isFunctionDeclaration(node) ||
        ts.isFunctionExpression(node) ||
        ts.isMethodDeclaration(node) ||
        ts.isConstructorDeclaration(node)
      ) {
        enterScope();
        for (const param of node.parameters) {
          extractBindingNames(param.name, 'param', param, param.initializer, {
            isParameter: true,
          });
        }
        if (node.body) {
          ts.forEachChild(node.body, visit);
        }
        exitScope();
        return;
      }

      // 5. Arrow Functions
      else if (ts.isArrowFunction(node)) {
        enterScope();
        for (const param of node.parameters) {
          extractBindingNames(param.name, 'param', param, param.initializer, {
            isParameter: true,
            isArrowParameter: true,
          });
        }
        if (node.body) {
          if (ts.isBlock(node.body)) {
            ts.forEachChild(node.body, visit);
          } else {
            visit(node.body);
          }
        }
        exitScope();
        return;
      }

      // 6. Block statements creating lexical scopes
      else if (ts.isBlock(node) && !ts.isFunctionLike(node.parent)) {
        enterScope();
        ts.forEachChild(node, visit);
        exitScope();
        return;
      }

      ts.forEachChild(node, visit);
    } catch {
      // Defensive: continue traversing even if a partial AST node produces an error
    }
  }

  visit(sourceFile);

  // Close root scope
  exitScope();

  return {
    declarations,
    scopes,
    sourceFile,
  };
}
