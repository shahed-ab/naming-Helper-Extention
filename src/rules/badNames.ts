import * as ts from 'typescript';
import {
  DeclarationInfo,
  NamingHelperConfig,
  ScopeInfo,
  WeakNameViolation,
  DEFAULT_CONFIG,
} from '../types';
import { suggestCandidates } from '../suggester';

/**
 * Checks whether an identifier is used in a math or coordinate context
 * where single-letter names like x, y, z are idiomatic.
 */
function isMathOrCoordinateContext(decl: DeclarationInfo): boolean {
  const name = decl.name.toLowerCase();
  if (name !== 'x' && name !== 'y' && name !== 'z') {
    return false;
  }

  // Check parent node text or enclosing identifier for coordinate hints
  let current: ts.Node | undefined = decl.node.parent;
  let depth = 0;
  while (current && depth < 4) {
    const text = current.getText(decl.sourceFile);
    if (
      /\b(point|coord|coordinate|position|vector|matrix|width|height|rect|canvas|math)\b/i.test(
        text
      )
    ) {
      return true;
    }
    // Object literal property like { x: 10, y: 20 }
    if (ts.isObjectLiteralExpression(current) || ts.isTypeLiteralNode(current)) {
      return true;
    }
    current = current.parent;
    depth++;
  }

  return false;
}

/**
 * Checks if a parameter named 'e' or 'ev' is part of an event handler.
 */
function isEventHandlerContext(decl: DeclarationInfo): boolean {
  if (!decl.isParameter && !decl.isArrowParameter) {
    return false;
  }

  const name = decl.name.toLowerCase();
  if (name !== 'e' && name !== 'ev') {
    return false;
  }

  let current: ts.Node | undefined = decl.node.parent;
  let depth = 0;
  while (current && depth < 4) {
    // e.g. addEventListener('click', e => ...)
    if (ts.isCallExpression(current)) {
      const callText = current.expression.getText(decl.sourceFile);
      if (
        callText.includes('addEventListener') ||
        callText.endsWith('.on') ||
        callText.endsWith('.addListener')
      ) {
        return true;
      }
    }
    // e.g. function onClick(e) or const handleClick = (e) =>
    if (
      ts.isFunctionDeclaration(current) ||
      ts.isVariableDeclaration(current) ||
      ts.isPropertyAssignment(current) ||
      ts.isMethodDeclaration(current)
    ) {
      const handlerName = current.name ? current.name.getText(decl.sourceFile) : '';
      if (/^(on[A-Z]|handle[A-Z]|.*Handler$|.*Listener$)/.test(handlerName)) {
        return true;
      }
    }
    current = current.parent;
    depth++;
  }

  return false;
}

/**
 * Determines whether the declaration represents an inferred boolean type.
 */
function isInferredBoolean(decl: DeclarationInfo): boolean {
  if (!decl.initializerNode) {
    return false;
  }
  const init = decl.initializerNode;
  if (
    init.kind === ts.SyntaxKind.TrueKeyword ||
    init.kind === ts.SyntaxKind.FalseKeyword
  ) {
    return true;
  }
  if (ts.isPrefixUnaryExpression(init) && init.operator === ts.SyntaxKind.ExclamationToken) {
    return true;
  }
  if (
    ts.isBinaryExpression(init) &&
    [
      ts.SyntaxKind.EqualsEqualsToken,
      ts.SyntaxKind.EqualsEqualsEqualsToken,
      ts.SyntaxKind.ExclamationEqualsToken,
      ts.SyntaxKind.ExclamationEqualsEqualsToken,
      ts.SyntaxKind.GreaterThanToken,
      ts.SyntaxKind.GreaterThanEqualsToken,
      ts.SyntaxKind.LessThanToken,
      ts.SyntaxKind.LessThanEqualsToken,
    ].includes(init.operatorToken.kind)
  ) {
    return true;
  }
  return false;
}

/**
 * Determines whether the declaration represents an inferred array/collection type.
 */
function isInferredArray(decl: DeclarationInfo): boolean {
  if (!decl.initializerNode) {
    return false;
  }
  const init = decl.initializerNode;
  if (ts.isArrayLiteralExpression(init)) {
    return true;
  }
  if (ts.isCallExpression(init)) {
    const text = init.expression.getText(decl.sourceFile);
    if (
      text.endsWith('.filter') ||
      text.endsWith('.map') ||
      text.endsWith('.slice') ||
      text.endsWith('.concat')
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Checks a declaration against bad naming rules.
 *
 * @param decl - Information about the declared symbol
 * @param config - Current configuration settings
 * @param scopes - Map of scope id to ScopeInfo for scope collision/repeat checks
 * @returns WeakNameViolation if the name is considered weak, or null if fine
 */
export function checkWeakName(
  decl: DeclarationInfo,
  config: Partial<NamingHelperConfig> = {},
  scopes: Map<number, ScopeInfo> = new Map()
): WeakNameViolation | null {
  const blocklist = (config.blocklist ?? DEFAULT_CONFIG.blocklist).map((b) =>
    b.toLowerCase()
  );
  const allowedSingleLetters =
    config.allowedSingleLetters ?? DEFAULT_CONFIG.allowedSingleLetters;
  const ignoredNames = config.ignoredNames ?? DEFAULT_CONFIG.ignoredNames;

  const rawName = decl.name;
  const lowerName = rawName.toLowerCase();

  // If explicitly ignored by user settings, skip
  if (ignoredNames.includes(rawName)) {
    return null;
  }

  // 1. Blocklist check
  if (blocklist.includes(lowerName)) {
    // Exception: single-letter allowed in context
    if (rawName === 'x' && isMathOrCoordinateContext(decl)) {
      return null;
    }

    const candidates = suggestCandidates(decl, scopes, config);
    return {
      name: rawName,
      range: decl.range,
      ruleId: 'blocklist',
      message: candidates.length > 0
        ? `'${rawName}' is a vague placeholder name. Consider '${candidates[0].name}'.`
        : `'${rawName}' is a vague placeholder name.`,
      explanation: candidates.length > 0
        ? `'${rawName}' doesn't tell a reader what it holds. Since it stores ${candidates[0].reason.toLowerCase()}, a name like '${candidates[0].name}' communicates both what it is and what it is for.`
        : `'${rawName}' doesn't tell a reader what it holds or represents.`,
      namingTip: candidates[0]?.tip ?? 'Choose a descriptive noun that reveals intent and context.',
      declaration: decl,
      candidates,
    };
  }

  // 2. Single-letter check
  if (rawName.length === 1) {
    // Unused parameter convention (_ or _var)
    if (rawName === '_') {
      return null;
    }

    // Loop variables i, j, k in for loops
    if (decl.isLoopVariable && ['i', 'j', 'k'].includes(rawName)) {
      return null;
    }

    // Catch clause parameter 'e'
    if (decl.isCatchClause && rawName === 'e') {
      return null;
    }

    // Event handler callback 'e' or 'ev'
    if (isEventHandlerContext(decl)) {
      return null;
    }

    // Math / coordinate x, y, z
    if (['x', 'y', 'z'].includes(rawName) && isMathOrCoordinateContext(decl)) {
      return null;
    }

    // Check if the single letter is in allowedSingleLetters configuration
    if (allowedSingleLetters.includes(rawName)) {
      // If configured as allowed globally, allow it
      return null;
    }

    const candidates = suggestCandidates(decl, scopes, config);
    return {
      name: rawName,
      range: decl.range,
      ruleId: 'single-letter',
      message: candidates.length > 0
        ? `'${rawName}' is a single-letter name. Consider '${candidates[0].name}'.`
        : `'${rawName}' is a single-letter name outside permitted loop or math contexts.`,
      explanation: candidates.length > 0
        ? `Single-letter names make code hard to read. Based on its value, '${candidates[0].name}' provides immediate clarity.`
        : `Single-letter names make code hard to read, maintain, and search for.`,
      namingTip: candidates[0]?.tip ?? 'Use a clear word explaining what value this variable holds.',
      declaration: decl,
      candidates,
    };
  }

  // 3. Trailing-number check (e.g. user1, user2, list1, data2)
  const trailingNumberMatch = rawName.match(/^([a-zA-Z_]+)(\d+)$/);
  if (trailingNumberMatch) {
    const baseName = trailingNumberMatch[1];
    // Check if baseName or sibling numbered versions exist in the scope
    const currentScope = scopes.get(decl.scopeId);
    let isRepeated = false;
    if (currentScope) {
      for (const sibling of currentScope.declaredNames) {
        if (sibling !== rawName && sibling.toLowerCase().startsWith(baseName.toLowerCase())) {
          isRepeated = true;
          break;
        }
      }
    }

    // If repeated in scope, or generic base name like item1, user1
    if (isRepeated || ['item', 'list', 'data', 'temp', 'user', 'val'].includes(baseName.toLowerCase())) {
      const candidates = suggestCandidates(decl, scopes, config);
      return {
        name: rawName,
        range: decl.range,
        ruleId: 'trailing-number',
        message: candidates.length > 0
          ? `'${rawName}' uses a numeric suffix. Consider '${candidates[0].name}'.`
          : `'${rawName}' uses a numeric suffix instead of a descriptive role.`,
        explanation: `Number suffixes like '${rawName}' usually mean variables should be in an array or given more distinct roles (e.g., activeUser vs pendingUser).`,
        namingTip: candidates[0]?.tip ?? 'Differentiate variables by their role or state instead of adding numbers.',
        declaration: decl,
        candidates,
      };
    }
  }

  // 4. Type contradiction check
  // e.g. A boolean called 'flag' or an array called 'item'
  if (isInferredBoolean(decl) && ['flag', 'val', 'value', 'temp'].includes(lowerName)) {
    const candidates = suggestCandidates(decl, scopes, config);
    return {
      name: rawName,
      range: decl.range,
      ruleId: 'type-contradiction',
      message: candidates.length > 0
        ? `'${rawName}' is a boolean but lacks an is/has prefix. Consider '${candidates[0].name}'.`
        : `'${rawName}' is a boolean but lacks an is/has/should prefix.`,
      explanation: `Booleans represent true/false conditions. A name like '${rawName}' hides the fact that it is a boolean.`,
      namingTip: candidates[0]?.tip ?? "Prefix boolean variables with 'is', 'has', 'should', or 'can'.",
      declaration: decl,
      candidates,
    };
  }

  if (isInferredArray(decl) && ['item', 'element', 'thing', 'entry'].includes(lowerName)) {
    const candidates = suggestCandidates(decl, scopes, config);
    return {
      name: rawName,
      range: decl.range,
      ruleId: 'type-contradiction',
      message: candidates.length > 0
        ? `'${rawName}' holds an array but uses a singular noun. Consider '${candidates[0].name}'.`
        : `'${rawName}' holds a collection/array but uses a singular noun.`,
      explanation: `'${rawName}' holds a list of items, but its singular name implies a single item.`,
      namingTip: candidates[0]?.tip ?? 'Use plural nouns (e.g. items, elements) for collections and arrays.',
      declaration: decl,
      candidates,
    };
  }

  return null;
}
