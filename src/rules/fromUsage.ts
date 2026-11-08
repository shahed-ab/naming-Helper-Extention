import * as ts from 'typescript';
import { Candidate, DeclarationInfo } from '../types';
import { singularize, pluralize, toCamelCase } from './fromValue';

/**
 * Finds the nearest enclosing function, method, arrow function, or source file
 * that bounds the scope where the variable can be referenced.
 */
function getEnclosingScopeNode(decl: DeclarationInfo): ts.Node {
  let current: ts.Node | undefined = decl.node.parent;
  while (current) {
    if (
      ts.isFunctionDeclaration(current) ||
      ts.isFunctionExpression(current) ||
      ts.isArrowFunction(current) ||
      ts.isMethodDeclaration(current) ||
      ts.isSourceFile(current)
    ) {
      return current;
    }
    current = current.parent;
  }
  return decl.sourceFile;
}

/**
 * Finds all identifier nodes referencing the variable in its enclosing scope.
 */
function findUsageIdentifiers(decl: DeclarationInfo): ts.Identifier[] {
  const usages: ts.Identifier[] = [];
  const targetName = decl.name;
  const scopeNode = getEnclosingScopeNode(decl);

  function visit(node: ts.Node): void {
    if (
      ts.isIdentifier(node) &&
      node.text === targetName &&
      node !== decl.nameNode
    ) {
      // Ensure this identifier is not a property access name like obj.x
      if (
        ts.isPropertyAccessExpression(node.parent) &&
        node.parent.name === node
      ) {
        return;
      }
      // Ensure not a property assignment key like { x: 10 }
      if (
        ts.isPropertyAssignment(node.parent) &&
        node.parent.name === node
      ) {
        return;
      }
      usages.push(node);
    }
    ts.forEachChild(node, visit);
  }

  visit(scopeNode);
  return usages;
}

/**
 * Checks if the variable is declared as a callback parameter in a collection method call
 * e.g. `users.map(x => x.name)` or `items.filter(x => ...)`
 */
function inferFromIterationCallback(decl: DeclarationInfo): Candidate[] {
  if (!decl.isParameter && !decl.isArrowParameter) {
    return [];
  }

  // Parameter -> ArrowFunction/FunctionExpression -> CallExpression argument
  let current: ts.Node | undefined = decl.node.parent;
  let depth = 0;
  while (current && depth < 3) {
    if (
      ts.isCallExpression(current) &&
      ts.isPropertyAccessExpression(current.expression)
    ) {
      const methodName = current.expression.name.text;
      const iteratingMethods = [
        'map',
        'forEach',
        'filter',
        'find',
        'findIndex',
        'some',
        'every',
        'flatMap',
      ];
      if (iteratingMethods.includes(methodName)) {
        const callerText = current.expression.expression.getText(decl.sourceFile);
        const cleanCaller = toCamelCase(callerText);
        const singularNoun = singularize(cleanCaller);

        if (singularNoun && singularNoun !== cleanCaller) {
          return [
            {
              name: singularNoun,
              confidence: 0.95,
              reason: `Callback item in '${callerText}.${methodName}()'. Singular of collection '${cleanCaller}'.`,
              tip: `Use the singular noun of the array ('${singularNoun}') for iteration items.`,
            },
            {
              name: `current${singularNoun[0].toUpperCase()}${singularNoun.slice(1)}`,
              confidence: 0.8,
              reason: `Current element being processed from '${cleanCaller}'.`,
              tip: `Singular nouns clearly communicate single items during iteration.`,
            },
          ];
        } else {
          return [
            {
              name: 'item',
              confidence: 0.75,
              reason: `Single item in '${callerText}.${methodName}()' iteration.`,
              tip: "Use the singular noun of the collection being iterated.",
            },
          ];
        }
      }
    }
    current = current.parent;
    depth++;
  }

  return [];
}

/**
 * Checks if the declaration has a TypeScript type annotation that clarifies its name.
 * e.g. `const x: User[]` or `let x: Customer`
 */
function inferFromTypeAnnotation(decl: DeclarationInfo): Candidate[] {
  // Check if declaration node has a type annotation
  const typeNode = (decl.node as { type?: ts.TypeNode }).type;
  if (!typeNode) {
    return [];
  }

  // Type reference e.g. User[]
  if (ts.isArrayTypeNode(typeNode)) {
    const elemType = typeNode.elementType.getText(decl.sourceFile);
    if (/^[A-Z][a-zA-Z0-9]*$/.test(elemType)) {
      const plural = pluralize(toCamelCase(elemType));
      return [
        {
          name: plural,
          confidence: 0.95,
          reason: `Declared with array type '${elemType}[]'. Plural of type name.`,
          tip: "Name collections with the plural of their element type.",
        },
      ];
    }
  }

  // Generic Array<User>
  if (ts.isTypeReferenceNode(typeNode)) {
    const typeName = typeNode.typeName.getText(decl.sourceFile);
    if (typeName === 'Array' && typeNode.typeArguments && typeNode.typeArguments.length > 0) {
      const elemType = typeNode.typeArguments[0].getText(decl.sourceFile);
      if (/^[A-Z][a-zA-Z0-9]*$/.test(elemType)) {
        const plural = pluralize(toCamelCase(elemType));
        return [
          {
            name: plural,
            confidence: 0.95,
            reason: `Declared with type 'Array<${elemType}>'.`,
            tip: "Use plural of element type for collections.",
          },
        ];
      }
    }

    // Singular domain object e.g. User or Customer
    if (/^[A-Z][a-zA-Z0-9]*$/.test(typeName) && !['Promise', 'Record', 'Object', 'Function'].includes(typeName)) {
      const singular = toCamelCase(typeName);
      return [
        {
          name: singular,
          confidence: 0.9,
          reason: `Declared with TypeScript type '${typeName}'.`,
          tip: "Use the model/interface type name in camelCase.",
        },
      ];
    }
  }

  return [];
}

/**
 * Infers candidate names based on how the variable is referenced in code.
 *
 * @param decl - The declaration info
 * @returns Array of candidates inferred from usage
 */
export function inferFromUsage(decl: DeclarationInfo): Candidate[] {
  const candidates: Candidate[] = [];

  // 1. Check if used as iteration callback parameter (e.g. users.map(x => ...))
  const iterationCandidates = inferFromIterationCallback(decl);
  if (iterationCandidates.length > 0) {
    return iterationCandidates;
  }

  // 2. Check TypeScript type annotation on the declaration
  const typeCandidates = inferFromTypeAnnotation(decl);
  if (typeCandidates.length > 0) {
    return typeCandidates;
  }

  const usages = findUsageIdentifiers(decl);
  let usedAsCollection = false;
  let usedAsBooleanCondition = false;
  let passedAsArgumentFunction: string | undefined;
  let argumentIndex = 0;

  for (const usage of usages) {
    const parent = usage.parent;

    // Check .length, .push, .map, .forEach used on it
    if (
      ts.isPropertyAccessExpression(parent) &&
      parent.expression === usage
    ) {
      const propName = parent.name.text;
      if (['length', 'push', 'map', 'forEach', 'filter', 'slice', 'splice', 'pop', 'shift'].includes(propName)) {
        usedAsCollection = true;
      }
    }

    // Check used directly in if condition, ternary, or boolean unary
    if (ts.isIfStatement(parent) && parent.expression === usage) {
      usedAsBooleanCondition = true;
    } else if (ts.isConditionalExpression(parent) && parent.condition === usage) {
      usedAsBooleanCondition = true;
    } else if (
      ts.isPrefixUnaryExpression(parent) &&
      parent.operator === ts.SyntaxKind.ExclamationToken &&
      parent.operand === usage
    ) {
      usedAsBooleanCondition = true;
    }

    // Check passed as an argument to a function call
    if (ts.isCallExpression(parent) && parent.arguments.includes(usage)) {
      passedAsArgumentFunction = parent.expression.getText(decl.sourceFile);
      argumentIndex = parent.arguments.indexOf(usage);
    }
  }

  // Generate candidates based on usage patterns

  // Usage: Collection operations (.length, .push, etc.)
  if (usedAsCollection) {
    candidates.push(
      {
        name: 'items',
        confidence: 0.85,
        reason: "Used with collection methods/properties (.length, .push, etc.).",
        tip: "Use plural nouns for collections and lists.",
      },
      {
        name: 'elements',
        confidence: 0.8,
        reason: "Used as an array/collection in code.",
        tip: "Collections should be named with plural nouns.",
      }
    );
  }

  // Usage: Used directly as boolean in if/while conditions
  if (usedAsBooleanCondition) {
    candidates.push(
      {
        name: 'isValid',
        confidence: 0.85,
        reason: "Evaluated directly in boolean condition checks.",
        tip: "Prefix boolean flags with 'is', 'has', 'can', or 'should'.",
      },
      {
        name: 'isEnabled',
        confidence: 0.78,
        reason: "Used as a true/false condition flag.",
        tip: "Booleans should read like questions that answer yes or no.",
      }
    );
  }

  // Usage: Passed to a function e.g. sendEmail(x) or displayUser(x)
  if (passedAsArgumentFunction) {
    // Check if function name reveals parameter entity (e.g. sendEmail -> email, displayUser -> user)
    const match = passedAsArgumentFunction.match(
      /^(?:send|get|set|fetch|display|render|update|delete|create|handle|save|format|process)([A-Z][a-zA-Z0-9]*)$/
    );
    if (match && match[1]) {
      const derived = toCamelCase(match[1]);
      candidates.push({
        name: derived,
        confidence: 0.88,
        reason: `Passed as argument to '${passedAsArgumentFunction}()', which operates on a '${derived}'.`,
        tip: "Match variable names to the function parameter's domain concept.",
      });
    }

    // Attempt to inspect source file for target function definition and parameter name
    let foundParamName: string | undefined;
    decl.sourceFile.forEachChild((node) => {
      if (
        ts.isFunctionDeclaration(node) &&
        node.name &&
        node.name.text === passedAsArgumentFunction
      ) {
        const param = node.parameters[argumentIndex];
        if (param && ts.isIdentifier(param.name)) {
          foundParamName = param.name.text;
        }
      }
    });

    if (foundParamName && foundParamName.length > 1) {
      candidates.unshift({
        name: foundParamName,
        confidence: 0.95,
        reason: `Passed as argument to '${passedAsArgumentFunction}(${foundParamName})'. Matches parameter name.`,
        tip: "Naming arguments after the parameter they satisfy improves readability.",
      });
    }
  }

  return candidates;
}

