import type * as ts from 'typescript';

/**
 * Kind of declaration identified by the scanner.
 */
export type DeclarationKind =
  | 'const'
  | 'let'
  | 'var'
  | 'param'
  | 'catch'
  | 'for'
  | 'destructured';

/**
 * Position inside a text document (0-based lines and characters).
 */
export interface PositionInfo {
  line: number;
  character: number;
}

/**
 * Range inside a text document.
 */
export interface RangeInfo {
  start: PositionInfo;
  end: PositionInfo;
}

/**
 * Information about a declared symbol in the AST.
 */
export interface DeclarationInfo {
  /** Identifier name */
  name: string;
  /** Kind of declaration */
  kind: DeclarationKind;
  /** Text range covering the identifier token itself */
  range: RangeInfo;
  /** Text range covering the full declaration statement */
  fullRange: RangeInfo;
  /** Scope identifier */
  scopeId: number;
  /** Parent scope identifier, or null if top-level */
  parentScopeId: number | null;
  /** Whether the declaration is exported */
  isExported: boolean;
  /** True if declared as part of for / for-in / for-of */
  isLoopVariable: boolean;
  /** True if declared as a catch clause parameter */
  isCatchClause: boolean;
  /** True if declared as a function/method parameter */
  isParameter: boolean;
  /** True if declared as an arrow function parameter */
  isArrowParameter: boolean;
  /** Source code text of initializer expression, if present */
  initializerCode?: string;
  /** AST node of the initializer expression */
  initializerNode?: ts.Expression;
  /** AST node of the identifier name */
  nameNode: ts.Identifier;
  /** AST node of the declaration statement or parameter */
  node: ts.Node;
  /** The AST source file */
  sourceFile: ts.SourceFile;
}

/**
 * Scope hierarchy entry with all names declared in it.
 */
export interface ScopeInfo {
  id: number;
  parentId: number | null;
  declaredNames: Set<string>;
}

/**
 * A suggested replacement candidate.
 */
export interface Candidate {
  name: string;
  confidence: number;
  reason: string;
  tip?: string;
}

/**
 * A detected weak name violation with explanation and suggested candidates.
 */
export interface WeakNameViolation {
  name: string;
  range: RangeInfo;
  ruleId: 'blocklist' | 'single-letter' | 'trailing-number' | 'type-contradiction';
  message: string;
  explanation: string;
  namingTip: string;
  declaration: DeclarationInfo;
  candidates: Candidate[];
}

/**
 * Configuration options for Naming Helper.
 */
export interface NamingHelperConfig {
  enable: boolean;
  severity: 'Hint' | 'Information' | 'Warning';
  confidenceThreshold: number;
  blocklist: string[];
  allowedSingleLetters: string[];
  ignoredNames: string[];
  excludeGlobs: string[];
  debounceMs: number;
  showStatusBar: boolean;
  ai: {
    enabled: boolean;
    provider: 'none' | 'custom-endpoint';
  };
}

/**
 * Default configuration values.
 */
export const DEFAULT_CONFIG: NamingHelperConfig = {
  enable: true,
  severity: 'Hint',
  confidenceThreshold: 0.6,
  blocklist: [
    'x',
    'temp',
    'tmp',
    'data',
    'data2',
    'foo',
    'bar',
    'baz',
    'val',
    'value',
    'res',
    'arr',
    'obj',
    'thing',
    'stuff',
    'item1',
    'list1',
  ],
  allowedSingleLetters: ['i', 'j', 'k', 'e', '_'],
  ignoredNames: [],
  excludeGlobs: [
    '**/node_modules/**',
    '**/dist/**',
    '**/*.min.js',
    '**/*.d.ts',
  ],
  debounceMs: 500,
  showStatusBar: true,
  ai: {
    enabled: false,
    provider: 'none',
  },
};

