import * as ts from 'typescript';
import { Candidate, DeclarationInfo } from '../types';

/**
 * Capitalizes the first letter of a string.
 */
export function capitalize(str: string): string {
  if (!str) {
    return '';
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Converts a string (including kebab-case, snake_case, or selector) to camelCase.
 */
export function toCamelCase(str: string): string {
  // Strip CSS selector prefixes (#, ., [attr...])
  const cleaned = str.replace(/^[#.\[\]]+/, '').replace(/\]$/, '');
  const words = cleaned
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, '');

  if (!words) {
    return 'item';
  }
  return words.charAt(0).toLowerCase() + words.slice(1);
}

/**
 * Common English irregular plurals.
 */
const IRREGULAR_PLURALS: Record<string, string> = {
  person: 'people',
  child: 'children',
  man: 'men',
  woman: 'women',
  datum: 'data',
  index: 'indices',
};

const IRREGULAR_SINGULARS: Record<string, string> = {
  people: 'person',
  children: 'child',
  men: 'man',
  women: 'woman',
  data: 'datum',
  indices: 'index',
};

/**
 * Simple English pluralization helper.
 */
export function pluralize(noun: string): string {
  const lower = noun.toLowerCase();
  if (IRREGULAR_PLURALS[lower]) {
    const plural = IRREGULAR_PLURALS[lower];
    return noun[0] === noun[0].toUpperCase() ? capitalize(plural) : plural;
  }
  if (lower.endsWith('y') && !/[aeiou]y$/i.test(lower)) {
    return noun.slice(0, -1) + 'ies';
  }
  if (/(s|x|z|ch|sh)$/i.test(lower)) {
    return noun + 'es';
  }
  return noun + 's';
}

/**
 * Simple English singularization helper.
 */
export function singularize(noun: string): string {
  const lower = noun.toLowerCase();
  if (IRREGULAR_SINGULARS[lower]) {
    const singular = IRREGULAR_SINGULARS[lower];
    return noun[0] === noun[0].toUpperCase() ? capitalize(singular) : singular;
  }
  if (lower.endsWith('ies') && lower.length > 3) {
    return noun.slice(0, -3) + 'y';
  }
  if (/(ches|shes|sses|xes|zes)$/i.test(lower)) {
    return noun.slice(0, -2);
  }
  if (lower.endsWith('s') && !lower.endsWith('ss') && lower !== 'status' && lower !== 'news') {
    return noun.slice(0, -1);
  }
  return noun;
}

/**
 * Helper to unwrap `await expr` to inner `expr`.
 */
function unwrapAwait(expr: ts.Expression): ts.Expression {
  if (ts.isAwaitExpression(expr)) {
    return expr.expression;
  }
  return expr;
}

/**
 * Infers candidate names from the variable declaration's initializer expression.
 *
 * @param decl - Declaration information containing initializerNode and AST context
 * @returns Array of candidates ordered by confidence
 */
export function inferFromInitializer(decl: DeclarationInfo): Candidate[] {
  if (!decl.initializerNode) {
    return [];
  }

  const rawInit = decl.initializerNode;
  const init = unwrapAwait(rawInit);
  const sourceFile = decl.sourceFile;
  const isAwaited = ts.isAwaitExpression(rawInit);

  // 1. Array literal: [] or [...]
  if (ts.isArrayLiteralExpression(init)) {
    return [
      {
        name: 'items',
        confidence: 0.8,
        reason: "Initialized with an array literal. 'items' describes an ordered collection.",
        tip: 'Use plural nouns for collections and lists.',
      },
      {
        name: 'elements',
        confidence: 0.75,
        reason: "Initialized with an array. 'elements' is a common collection noun.",
        tip: 'Use plural nouns for collections.',
      },
      {
        name: 'list',
        confidence: 0.65,
        reason: 'Initialized with an array.',
        tip: 'Prefer plural nouns (e.g. items) over generic words like list.',
      },
    ];
  }

  // 2. Object literal: {}
  if (ts.isObjectLiteralExpression(init)) {
    if (init.properties.length === 0) {
      return [
        {
          name: 'options',
          confidence: 0.8,
          reason: "Initialized with an empty object, commonly used for optional configurations.",
          tip: "Use 'options' or 'config' for configuration objects.",
        },
        {
          name: 'config',
          confidence: 0.8,
          reason: "Initialized with an empty object literal representing configuration settings.",
          tip: "Name configuration objects 'config' or 'settings'.",
        },
        {
          name: 'settings',
          confidence: 0.75,
          reason: 'Initialized with an empty object.',
          tip: 'Use clear purpose-driven nouns for dictionary/config objects.',
        },
      ];
    }
  }

  // 3. Date instance: new Date()
  if (ts.isNewExpression(init)) {
    const constructorName = init.expression.getText(sourceFile);
    if (constructorName === 'Date') {
      return [
        {
          name: 'currentDate',
          confidence: 0.95,
          reason: "Initialized with new Date(), representing current timestamp or date.",
          tip: "Use 'currentDate', 'timestamp', or 'now' for Date objects.",
        },
        {
          name: 'date',
          confidence: 0.85,
          reason: "Initialized with new Date().",
          tip: "A descriptive date name like 'createdDate' or 'currentDate' adds more context.",
        },
        {
          name: 'timestamp',
          confidence: 0.8,
          reason: "Initialized with new Date().",
          tip: "Use 'timestamp' if tracking points in time.",
        },
      ];
    }

    // 12. new Map() / new Set()
    if (constructorName === 'Map') {
      return [
        {
          name: 'lookupMap',
          confidence: 0.85,
          reason: "Initialized with new Map() for fast key-value lookups.",
          tip: "Use a purpose noun combined with 'Map' (e.g. userMap, lookupMap).",
        },
        {
          name: 'cache',
          confidence: 0.75,
          reason: "Map instances often serve as lookup caches.",
          tip: "Name key-value stores after what they cache or index.",
        },
        {
          name: 'itemsMap',
          confidence: 0.7,
          reason: "Map collection.",
          tip: "Pair the entity name with 'Map'.",
        },
      ];
    }

    if (constructorName === 'Set') {
      return [
        {
          name: 'uniqueValues',
          confidence: 0.85,
          reason: "Initialized with new Set(), which stores distinct elements.",
          tip: "Sets store unique elements; 'unique...' or '...Set' indicates this clearly.",
        },
        {
          name: 'seenItems',
          confidence: 0.8,
          reason: "Set instances are commonly used to track visited or seen identifiers.",
          tip: "Reflect the uniqueness purpose in the name.",
        },
        {
          name: 'itemSet',
          confidence: 0.75,
          reason: "Set collection.",
          tip: "Use the plural noun or append 'Set' to describe contents.",
        },
      ];
    }
  }

  // 4. Method calls & expressions
  if (ts.isCallExpression(init)) {
    const callText = init.expression.getText(sourceFile);

    // 4a. fetch(...)
    if (callText === 'fetch' || callText.endsWith('.fetch')) {
      return [
        {
          name: 'response',
          confidence: 0.95,
          reason: `Holds the ${isAwaited ? 'resolved ' : ''}HTTP Response from fetch().`,
          tip: "Use 'response' or 'apiResponse' for HTTP fetch results.",
        },
        {
          name: 'apiResponse',
          confidence: 0.85,
          reason: 'Result of an API fetch request.',
          tip: "Suffix with 'Response' to distinguish raw HTTP responses from parsed payloads.",
        },
        {
          name: 'httpResponse',
          confidence: 0.8,
          reason: 'HTTP response object returned by fetch().',
          tip: "Distinguish HTTP responses from parsed JSON data.",
        },
      ];
    }

    // 4b. res.json() / response.json()
    if (callText.endsWith('.json')) {
      return [
        {
          name: 'parsedResponse',
          confidence: 0.9,
          reason: `Holds the ${isAwaited ? 'parsed JSON ' : 'Promise of parsed '}body from response.json().`,
          tip: "Use 'data', 'payload', or a specific domain noun instead of vague placeholders.",
        },
        {
          name: 'responseData',
          confidence: 0.88,
          reason: 'Parsed JSON response data.',
          tip: "Name the response object after the domain model it contains.",
        },
        {
          name: 'payload',
          confidence: 0.8,
          reason: 'Parsed payload from network response.',
          tip: "Use 'payload' or model name for parsed network data.",
        },
      ];
    }

    // 4c. document.getElementById('submit')
    if (callText.endsWith('getElementById')) {
      const arg = init.arguments[0];
      if (arg && (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg))) {
        const idName = toCamelCase(arg.text);
        return [
          {
            name: `${idName}Element`,
            confidence: 0.95,
            reason: `Retrieves DOM element with ID '${arg.text}'. Suffixing with 'Element' indicates a DOM node.`,
            tip: "Suffix DOM elements with 'Element' or 'El' for immediate clarity.",
          },
          {
            name: idName,
            confidence: 0.8,
            reason: `Named directly after DOM element ID '${arg.text}'.`,
            tip: "Adding 'Element' avoids collision with domain models of the same name.",
          },
          {
            name: `${idName}El`,
            confidence: 0.75,
            reason: `Abbreviated DOM element suffix for '${arg.text}'.`,
            tip: "Consistent suffixes like 'Element' keep UI code clean.",
          },
        ];
      }
      return [
        {
          name: 'element',
          confidence: 0.8,
          reason: 'Retrieves a DOM element by ID.',
          tip: "Include what element is being selected in the variable name.",
        },
      ];
    }

    // 4d. document.querySelector(...) / querySelectorAll(...)
    if (callText.endsWith('querySelector')) {
      const arg = init.arguments[0];
      if (arg && (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg))) {
        const selectorName = toCamelCase(arg.text);
        return [
          {
            name: `${selectorName}Element`,
            confidence: 0.95,
            reason: `Matches DOM element for selector '${arg.text}'.`,
            tip: "Add 'Element' to distinguish DOM nodes from raw data strings or objects.",
          },
          {
            name: selectorName,
            confidence: 0.8,
            reason: `Derived from query selector '${arg.text}'.`,
            tip: "Consider adding 'Element' suffix for clarity.",
          },
          {
            name: `${selectorName}El`,
            confidence: 0.75,
            reason: `Abbreviated DOM element name for '${arg.text}'.`,
            tip: "Suffix DOM elements clearly.",
          },
        ];
      }
      return [
        {
          name: 'targetElement',
          confidence: 0.8,
          reason: 'Result of document.querySelector.',
          tip: "Name DOM elements after their role in the UI.",
        },
      ];
    }

    if (callText.endsWith('querySelectorAll')) {
      const arg = init.arguments[0];
      if (arg && (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg))) {
        const selectorName = toCamelCase(arg.text);
        const pluralNoun = pluralize(selectorName);
        return [
          {
            name: `${selectorName}Elements`,
            confidence: 0.95,
            reason: `List of DOM elements matching selector '${arg.text}'.`,
            tip: "Use plural 'Elements' for querySelectorAll NodeLists.",
          },
          {
            name: pluralNoun,
            confidence: 0.85,
            reason: `Plural collection of '${arg.text}' nodes.`,
            tip: "Use plural nouns for NodeList collections.",
          },
        ];
      }
    }

    // 4e. arr.filter(...)
    if (ts.isPropertyAccessExpression(init.expression) && init.expression.name.text === 'filter') {
      const sourceArray = init.expression.expression.getText(sourceFile);
      const cleanSource = toCamelCase(sourceArray);
      return [
        {
          name: `filtered${capitalize(cleanSource)}`,
          confidence: 0.95,
          reason: `Filtered subset of '${sourceArray}'. 'filtered' prefix clarifies that it contains a subset.`,
          tip: "Prefix filtered collections with 'filtered' or a descriptive filter condition.",
        },
        {
          name: `matching${capitalize(cleanSource)}`,
          confidence: 0.85,
          reason: `Elements from '${sourceArray}' that match the filter predicate.`,
          tip: "Reflect the filtering criteria in the variable name.",
        },
        {
          name: cleanSource,
          confidence: 0.7,
          reason: `Subset of '${sourceArray}'.`,
          tip: "Differentiate filtered collections from the original source array.",
        },
      ];
    }

    // 4f. arr.map(...)
    if (ts.isPropertyAccessExpression(init.expression) && init.expression.name.text === 'map') {
      const sourceArray = init.expression.expression.getText(sourceFile);
      const cleanSource = toCamelCase(sourceArray);
      const singularSource = singularize(cleanSource);

      // Check if callback maps to a property like `u => u.name`
      let propertyName: string | undefined;
      const callback = init.arguments[0];
      if (callback && (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))) {
        const body = callback.body;
        if (ts.isPropertyAccessExpression(body)) {
          propertyName = body.name.text;
        }
      }

      if (propertyName) {
        const specificName = `${singularSource}${capitalize(propertyName)}s`;
        return [
          {
            name: specificName,
            confidence: 0.95,
            reason: `Array of ${propertyName} values mapped from '${sourceArray}'.`,
            tip: "Name mapped arrays after the specific property extracted.",
          },
          {
            name: `${propertyName}s`,
            confidence: 0.88,
            reason: `Collection of ${propertyName} values.`,
            tip: "Pluralize the mapped property name for clarity.",
          },
          {
            name: `mapped${capitalize(cleanSource)}`,
            confidence: 0.8,
            reason: `Mapped transform of '${sourceArray}'.`,
            tip: "Use the mapped value's property name when possible.",
          },
        ];
      }

      return [
        {
          name: `mapped${capitalize(cleanSource)}`,
          confidence: 0.88,
          reason: `Transformed elements from '${sourceArray}'.`,
          tip: "Name mapped arrays after what the new transformed items represent.",
        },
        {
          name: `${cleanSource}List`,
          confidence: 0.75,
          reason: `Collection resulting from mapping '${sourceArray}'.`,
          tip: "Clarify what type of items the new collection contains.",
        },
      ];
    }

    // 4g. arr.find(...)
    if (ts.isPropertyAccessExpression(init.expression) && init.expression.name.text === 'find') {
      const sourceArray = init.expression.expression.getText(sourceFile);
      const cleanSource = toCamelCase(sourceArray);
      const singularItem = singularize(cleanSource);
      return [
        {
          name: singularItem,
          confidence: 0.95,
          reason: `Single item found in '${sourceArray}' collection. Singular of '${cleanSource}'.`,
          tip: "Use the singular noun of the collection when retrieving a single element via find().",
        },
        {
          name: `matched${capitalize(singularItem)}`,
          confidence: 0.85,
          reason: `The element in '${sourceArray}' that satisfied the find() condition.`,
          tip: "Highlight that this is a matched record from a collection.",
        },
        {
          name: `selected${capitalize(singularItem)}`,
          confidence: 0.8,
          reason: `Selected item from '${sourceArray}'.`,
          tip: "Singular nouns identify individual found records.",
        },
      ];
    }
  }

  // 5. Comparison or boolean expression (a > b, !x, etc.)
  if (
    (ts.isPrefixUnaryExpression(init) && init.operator === ts.SyntaxKind.ExclamationToken) ||
    (ts.isBinaryExpression(init) &&
      [
        ts.SyntaxKind.EqualsEqualsToken,
        ts.SyntaxKind.EqualsEqualsEqualsToken,
        ts.SyntaxKind.ExclamationEqualsToken,
        ts.SyntaxKind.ExclamationEqualsEqualsToken,
        ts.SyntaxKind.GreaterThanToken,
        ts.SyntaxKind.GreaterThanEqualsToken,
        ts.SyntaxKind.LessThanToken,
        ts.SyntaxKind.LessThanEqualsToken,
      ].includes(init.operatorToken.kind))
  ) {
    // If comparison against .length > 0
    const exprText = init.getText(sourceFile);
    if (exprText.includes('.length > 0') || exprText.includes('.length >= 1')) {
      return [
        {
          name: 'hasItems',
          confidence: 0.92,
          reason: "Checks if a collection is non-empty. 'hasItems' communicates state clearly.",
          tip: "Prefix boolean checks with 'has', 'is', 'can', or 'should'.",
        },
        {
          name: 'isNotEmpty',
          confidence: 0.85,
          reason: "Boolean condition testing for non-empty collection.",
          tip: "Boolean variables should read like a true/false question.",
        },
        {
          name: 'isValid',
          confidence: 0.75,
          reason: 'Boolean validation check.',
          tip: "Use 'is' or 'has' prefixes for boolean status.",
        },
      ];
    }

    return [
      {
        name: 'isValid',
        confidence: 0.85,
        reason: "Boolean comparison expression. 'isValid' clearly denotes a true/false condition.",
        tip: "Prefix booleans with 'is', 'has', 'can', or 'should'.",
      },
      {
        name: 'isMatch',
        confidence: 0.8,
        reason: "Result of comparison expression.",
        tip: "Choose a boolean prefix describing the specific condition tested.",
      },
      {
        name: 'hasConditionMet',
        confidence: 0.7,
        reason: "Boolean flag representing evaluation result.",
        tip: "Make boolean flags read like yes/no questions.",
      },
    ];
  }

  // 6. Number literal 0 (counter accumulator)
  if (ts.isNumericLiteral(init)) {
    if (init.text === '0') {
      return [
        {
          name: 'count',
          confidence: 0.85,
          reason: "Numeric value initialized to 0, commonly used as a counter or tally.",
          tip: "Use 'count', 'total', or 'index' for numeric counters.",
        },
        {
          name: 'total',
          confidence: 0.8,
          reason: "Initialized to 0, often used as an accumulator.",
          tip: "Name accumulators after what is being summed or counted.",
        },
        {
          name: 'index',
          confidence: 0.75,
          reason: "Zero-based counter or offset.",
          tip: "Use 'index' or 'offset' when tracking positional indices.",
        },
      ];
    }
  }

  return [];
}
