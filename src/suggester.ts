import {
  Candidate,
  DeclarationInfo,
  NamingHelperConfig,
  ScopeInfo,
  DEFAULT_CONFIG,
} from './types';
import { inferFromInitializer } from './rules/fromValue';

/**
 * Standard JavaScript and TypeScript reserved words.
 */
export const JS_TS_RESERVED_WORDS = new Set([
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'import',
  'in',
  'instanceof',
  'new',
  'null',
  'return',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'yield',
  'let',
  'static',
  'implements',
  'interface',
  'package',
  'private',
  'protected',
  'public',
  'await',
  'async',
]);

/**
 * Gathers all declared identifier names visible within the scope of a declaration
 * (including current scope and all ancestor enclosing scopes).
 *
 * @param decl - The declaration being evaluated
 * @param scopes - Map of all tracked scopes
 * @returns Set of identifier names in scope
 */
export function getNamesInScope(
  decl: DeclarationInfo,
  scopes: Map<number, ScopeInfo>
): Set<string> {
  const inScope = new Set<string>();

  let currentId: number | null = decl.scopeId;
  while (currentId !== null) {
    const scope = scopes.get(currentId);
    if (!scope) {
      break;
    }
    for (const name of scope.declaredNames) {
      // Do not include the variable's own old name as a collision
      if (name !== decl.name) {
        inScope.add(name);
      }
    }
    currentId = scope.parentId;
  }

  return inScope;
}

/**
 * Evaluates rules, eliminates scope collisions & reserved words,
 * applies confidence threshold, and returns up to 3 best candidates sorted by confidence.
 *
 * @param decl - The declaration to evaluate
 * @param scopes - Scopes map from AST scanner
 * @param config - Current configuration settings
 * @returns Top candidates (at most 3)
 */
export function suggestCandidates(
  decl: DeclarationInfo,
  scopes: Map<number, ScopeInfo>,
  config: Partial<NamingHelperConfig> = {}
): Candidate[] {
  const threshold = config.confidenceThreshold ?? DEFAULT_CONFIG.confidenceThreshold;
  const inScopeNames = getNamesInScope(decl, scopes);

  // 1. Gather raw candidates from rules
  const rawCandidates: Candidate[] = [];
  rawCandidates.push(...inferFromInitializer(decl));

  // 2. Filter out:
  // - Names matching old name
  // - Reserved keywords
  // - Names that already exist in current or parent scope
  // - Candidates below confidence threshold
  const seenCandidateNames = new Set<string>();
  const validCandidates: Candidate[] = [];

  for (const candidate of rawCandidates) {
    const candidateName = candidate.name.trim();

    if (!candidateName || candidateName === decl.name) {
      continue;
    }

    if (candidate.confidence < threshold) {
      continue;
    }

    if (JS_TS_RESERVED_WORDS.has(candidateName.toLowerCase())) {
      continue;
    }

    if (inScopeNames.has(candidateName)) {
      continue;
    }

    if (seenCandidateNames.has(candidateName.toLowerCase())) {
      continue;
    }

    seenCandidateNames.add(candidateName.toLowerCase());
    validCandidates.push(candidate);
  }

  // 3. Sort by confidence descending
  validCandidates.sort((a, b) => b.confidence - a.confidence);

  // 4. Return top 3 candidates
  return validCandidates.slice(0, 3);
}

