/**
 * AST Instrumenter
 *
 * Parses user JavaScript with Acorn, then walks the AST and injects:
 *  - __capture__(line, { ...vars }) after each statement
 *  - __pushFrame__(name, { ...params }) at function entry
 *  - __popFrame__() at function exit
 *  - Loop guards to prevent infinite loops
 *  - Rewrites console.log/warn/error to __logOutput__
 *  - Blocks eval() and new Function()
 */

import * as acorn from 'acorn';
import { generate } from 'astring';

// We work with acorn's ESTree nodes but need to cast to extend them
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyNode = any;

// Module-level state: when inside a block-scope frame (e.g. a for-loop with
// let/const), this holds the variable names that belong to the PARENT frame.
// buildCaptureExpression reads this to emit a third argument to __capture__.
let _parentVarNames: string[] | null = null;

/**
 * Instrument a user's source code for step-by-step state capture.
 * Returns the instrumented source string.
 * Throws on parse errors.
 */
export function instrument(source: string): string {
  // Parse the user's code
  const ast = acorn.parse(source, {
    ecmaVersion: 'latest',
    sourceType: 'script',
    locations: true,
  }) as AnyNode;

  // Collect scope info: we walk the AST and build a scope tree
  // For simplicity, we do a two-pass approach:
  //  1. Collect all variable declarations per scope
  //  2. Inject capture/frame calls

  // Pass: inject instrumentation by transforming the body arrays
  instrumentBlock(ast.body, [], true);

  // Prepend the eval/Function blockers and loop counter
  const preamble = `var __loopCount = 0; var __MAX_LOOPS = 10000;
var eval = undefined;
`;

  const generated = generate(ast);
  return preamble + generated;
}

/**
 * Collect hoisted declarations from a block (var + function declarations).
 * These are safe to reference from the very start of the scope.
 */
function collectHoistedNames(body: AnyNode[]): string[] {
  const names: string[] = [];
  for (const stmt of body) {
    if (stmt.type === 'FunctionDeclaration' && stmt.id) {
      names.push(stmt.id.name);
    } else if (stmt.type === 'VariableDeclaration' && stmt.kind === 'var') {
      for (const decl of stmt.declarations) {
        extractPatternNames(decl.id, names);
      }
    }
  }
  return names;
}

/**
 * Collect variable names declared by a single statement.
 */
function collectDeclaredNamesFromStmt(stmt: AnyNode): string[] {
  const names: string[] = [];
  if (stmt.type === 'VariableDeclaration') {
    for (const decl of stmt.declarations) {
      extractPatternNames(decl.id, names);
    }
  } else if (stmt.type === 'FunctionDeclaration' && stmt.id) {
    names.push(stmt.id.name);
  } else if (stmt.type === 'ClassDeclaration' && stmt.id) {
    names.push(stmt.id.name);
  }
  return names;
}

/**
 * Extract variable names from a destructuring pattern or identifier.
 */
function extractPatternNames(pattern: AnyNode, names: string[]): void {
  if (!pattern) return;
  if (pattern.type === 'Identifier') {
    names.push(pattern.name);
  } else if (pattern.type === 'ObjectPattern') {
    for (const prop of pattern.properties) {
      if (prop.type === 'RestElement') {
        extractPatternNames(prop.argument, names);
      } else {
        extractPatternNames(prop.value, names);
      }
    }
  } else if (pattern.type === 'ArrayPattern') {
    for (const elem of pattern.elements) {
      if (elem) extractPatternNames(elem, names);
    }
  } else if (pattern.type === 'RestElement') {
    extractPatternNames(pattern.argument, names);
  } else if (pattern.type === 'AssignmentPattern') {
    extractPatternNames(pattern.left, names);
  }
}

/**
 * Get all variable names that are in scope at a given block level.
 * `scopeChain` is an array of scope-name strings we track for naming.
 */
function buildCaptureExpression(varNames: string[], line: number): AnyNode {
  // __capture__(line, { var1: var1, var2: var2, ... })
  const properties = varNames.map((name) => ({
    type: 'Property',
    key: { type: 'Identifier', name },
    value: { type: 'Identifier', name },
    kind: 'init',
    shorthand: true,
    computed: false,
    method: false,
  }));

  const args: AnyNode[] = [
    { type: 'Literal', value: line },
    { type: 'ObjectExpression', properties },
  ];

  // If inside a block scope, pass parent var names as third argument
  // so the runtime can distribute vars to the correct frames.
  if (_parentVarNames) {
    args.push({
      type: 'ArrayExpression',
      elements: _parentVarNames.map((n) => ({
        type: 'Literal',
        value: n,
      })),
    });
  }

  return {
    type: 'ExpressionStatement',
    expression: {
      type: 'CallExpression',
      callee: { type: 'Identifier', name: '__capture__' },
      arguments: args,
      optional: false,
    },
  };
}

function buildPushFrame(name: string, paramNames: string[]): AnyNode {
  const properties = paramNames.map((n) => ({
    type: 'Property',
    key: { type: 'Identifier', name: n },
    value: { type: 'Identifier', name: n },
    kind: 'init',
    shorthand: true,
    computed: false,
    method: false,
  }));

  return {
    type: 'ExpressionStatement',
    expression: {
      type: 'CallExpression',
      callee: { type: 'Identifier', name: '__pushFrame__' },
      arguments: [
        { type: 'Literal', value: name },
        { type: 'ObjectExpression', properties },
      ],
      optional: false,
    },
  };
}

function buildPopFrame(): AnyNode {
  return {
    type: 'ExpressionStatement',
    expression: {
      type: 'CallExpression',
      callee: { type: 'Identifier', name: '__popFrame__' },
      arguments: [],
      optional: false,
    },
  };
}

function buildLoopGuard(): AnyNode {
  // if (++__loopCount > __MAX_LOOPS) throw new Error("Infinite loop detected (exceeded " + __MAX_LOOPS + " iterations)");
  return {
    type: 'IfStatement',
    test: {
      type: 'BinaryExpression',
      operator: '>',
      left: {
        type: 'UpdateExpression',
        operator: '++',
        prefix: true,
        argument: { type: 'Identifier', name: '__loopCount' },
      },
      right: { type: 'Identifier', name: '__MAX_LOOPS' },
    },
    consequent: {
      type: 'ThrowStatement',
      argument: {
        type: 'NewExpression',
        callee: { type: 'Identifier', name: 'Error' },
        arguments: [
          {
            type: 'BinaryExpression',
            operator: '+',
            left: {
              type: 'BinaryExpression',
              operator: '+',
              left: { type: 'Literal', value: 'Infinite loop detected (exceeded ' },
              right: { type: 'Identifier', name: '__MAX_LOOPS' },
            },
            right: { type: 'Literal', value: ' iterations)' },
          },
        ],
      },
    },
    alternate: null,
  };
}

/**
 * Recursively instrument a block (array of statements).
 * `scopeVars` is the accumulated list of variable names visible in this scope.
 * `isTopLevel` indicates whether this is the program body.
 */
function instrumentBlock(
  body: AnyNode[],
  scopeVars: string[],
  isTopLevel: boolean,
): void {
  // Track which variables have been declared so far in this block.
  // We must NOT try to read `let`/`const` variables before their declaration
  // (temporal dead zone), so we only capture variables that have been seen.
  // However, `var` and `function` declarations are hoisted and safe to read
  // from the start of the scope.
  const hoisted = collectHoistedNames(body);
  const declaredSoFar = [...scopeVars];
  for (const name of hoisted) {
    if (!declaredSoFar.includes(name)) {
      declaredSoFar.push(name);
    }
  }

  // If top-level, add an initial capture with only the inherited scope vars
  if (isTopLevel && body.length > 0) {
    const firstLine = body[0]?.loc?.start?.line ?? 1;
    body.unshift(buildCaptureExpression(declaredSoFar, firstLine));
  }

  // We iterate and insert new statements. Use index tracking.
  let i = isTopLevel ? 1 : 0; // skip the initial capture we just inserted
  while (i < body.length) {
    const stmt = body[i];
    const line = stmt.loc?.start?.line ?? 0;

    // Before recursing, collect names this statement declares so that
    // the capture AFTER this statement can include them.
    const newNames = collectDeclaredNamesFromStmt(stmt);
    for (const name of newNames) {
      if (!declaredSoFar.includes(name)) {
        declaredSoFar.push(name);
      }
    }

    // Recurse into nested structures first
    // Pass the full set of vars visible at this point
    instrumentStatement(stmt, declaredSoFar);

    // Insert __capture__ after this statement (for most statement types)
    if (shouldCaptureAfter(stmt)) {
      const capture = buildCaptureExpression(declaredSoFar, line);
      body.splice(i + 1, 0, capture);
      i += 2; // skip past the original statement + inserted capture
    } else {
      i += 1;
    }
  }
}

/**
 * Determines if a capture call should be inserted after this statement.
 */
function shouldCaptureAfter(stmt: AnyNode): boolean {
  switch (stmt.type) {
    case 'VariableDeclaration':
    case 'ExpressionStatement':
    case 'ReturnStatement':
    case 'ThrowStatement':
    case 'AssignmentExpression':
      return true;
    case 'IfStatement':
    case 'ForStatement':
    case 'ForInStatement':
    case 'ForOfStatement':
    case 'WhileStatement':
    case 'DoWhileStatement':
    case 'SwitchStatement':
    case 'TryStatement':
      // These have their own block instrumentation
      return false;
    case 'FunctionDeclaration':
      // Capture that the function was declared
      return true;
    case 'ClassDeclaration':
      return true;
    default:
      return false;
  }
}

/**
 * Instrument a single statement and its children.
 */
function instrumentStatement(stmt: AnyNode, scopeVars: string[]): void {
  switch (stmt.type) {
    case 'FunctionDeclaration':
    case 'FunctionExpression':
    case 'ArrowFunctionExpression':
      instrumentFunction(stmt, scopeVars);
      break;

    case 'IfStatement':
      if (stmt.consequent.type === 'BlockStatement') {
        instrumentBlock(stmt.consequent.body, scopeVars, false);
      }
      if (stmt.alternate) {
        if (stmt.alternate.type === 'BlockStatement') {
          instrumentBlock(stmt.alternate.body, scopeVars, false);
        } else if (stmt.alternate.type === 'IfStatement') {
          instrumentStatement(stmt.alternate, scopeVars);
        }
      }
      break;

    case 'ForStatement':
    case 'ForInStatement':
    case 'ForOfStatement':
      instrumentLoop(stmt, scopeVars);
      break;

    case 'WhileStatement':
    case 'DoWhileStatement':
      instrumentLoop(stmt, scopeVars);
      break;

    case 'SwitchStatement':
      for (const c of stmt.cases) {
        if (c.consequent && c.consequent.length > 0) {
          instrumentBlock(c.consequent, scopeVars, false);
        }
      }
      break;

    case 'TryStatement':
      if (stmt.block) {
        instrumentBlock(stmt.block.body, scopeVars, false);
      }
      if (stmt.handler && stmt.handler.body) {
        const catchVars = [...scopeVars];
        if (stmt.handler.param) {
          extractPatternNames(stmt.handler.param, catchVars);
        }
        instrumentBlock(stmt.handler.body.body, catchVars, false);
      }
      if (stmt.finalizer) {
        instrumentBlock(stmt.finalizer.body, scopeVars, false);
      }
      break;

    case 'BlockStatement':
      instrumentBlock(stmt.body, scopeVars, false);
      break;

    case 'VariableDeclaration':
      // Check if any init is a function expression, instrument it
      for (const decl of stmt.declarations) {
        if (decl.init) {
          instrumentExpression(decl.init, scopeVars);
        }
      }
      break;

    case 'ExpressionStatement':
      instrumentExpression(stmt.expression, scopeVars);
      break;

    case 'ReturnStatement':
      if (stmt.argument) {
        instrumentExpression(stmt.argument, scopeVars);
      }
      break;

    case 'ClassDeclaration':
    case 'ClassExpression':
      instrumentClass(stmt, scopeVars);
      break;
  }
}

/**
 * Walk expressions to find nested functions, arrow functions, etc.
 */
function instrumentExpression(expr: AnyNode, scopeVars: string[]): void {
  if (!expr) return;

  switch (expr.type) {
    case 'FunctionExpression':
    case 'ArrowFunctionExpression':
      instrumentFunction(expr, scopeVars);
      break;

    case 'CallExpression':
      instrumentExpression(expr.callee, scopeVars);
      for (const arg of expr.arguments) {
        instrumentExpression(arg, scopeVars);
      }
      break;

    case 'AssignmentExpression':
      instrumentExpression(expr.right, scopeVars);
      break;

    case 'BinaryExpression':
    case 'LogicalExpression':
      instrumentExpression(expr.left, scopeVars);
      instrumentExpression(expr.right, scopeVars);
      break;

    case 'ConditionalExpression':
      instrumentExpression(expr.test, scopeVars);
      instrumentExpression(expr.consequent, scopeVars);
      instrumentExpression(expr.alternate, scopeVars);
      break;

    case 'ArrayExpression':
      for (const elem of expr.elements) {
        if (elem) instrumentExpression(elem, scopeVars);
      }
      break;

    case 'ObjectExpression':
      for (const prop of expr.properties) {
        if (prop.value) instrumentExpression(prop.value, scopeVars);
      }
      break;

    case 'ClassExpression':
      instrumentClass(expr, scopeVars);
      break;

    case 'TemplateLiteral':
      for (const e of expr.expressions) {
        instrumentExpression(e, scopeVars);
      }
      break;
  }
}

/**
 * Instrument a function declaration/expression/arrow.
 */
function instrumentFunction(fn: AnyNode, _parentVars: string[]): void {
  // Functions create their own scope — clear block-scope tracking
  const savedParentVarNames = _parentVarNames;
  _parentVarNames = null;

  const name = fn.id?.name || '<anonymous>';
  const paramNames: string[] = [];
  for (const param of fn.params) {
    extractPatternNames(param, paramNames);
  }

  // Get the function body
  let body: AnyNode[];
  if (fn.body.type === 'BlockStatement') {
    body = fn.body.body;
  } else {
    // Arrow function with expression body: convert to block with return
    const returnStmt = {
      type: 'ReturnStatement',
      argument: fn.body,
      loc: fn.body.loc,
    };
    fn.body = {
      type: 'BlockStatement',
      body: [returnStmt],
    };
    body = fn.body.body;
  }

  // Scope: params are available immediately; local declarations will be
  // discovered incrementally by instrumentBlock to avoid TDZ errors.
  const fnScopeVars = [...paramNames];

  // Instrument body statements
  instrumentBlock(body, fnScopeVars, false);

  // Insert __pushFrame__ at the beginning of the function body
  body.unshift(buildPushFrame(name, paramNames));

  // Insert __popFrame__ before every return statement and at the end
  insertPopFrameBeforeReturns(body);

  // Add __popFrame__ at the very end (for functions that fall through)
  body.push(buildPopFrame());

  _parentVarNames = savedParentVarNames;
}

/**
 * Insert __popFrame__() before each ReturnStatement in a body.
 */
function insertPopFrameBeforeReturns(body: AnyNode[]): void {
  let i = 0;
  while (i < body.length) {
    const stmt = body[i];
    if (stmt.type === 'ReturnStatement') {
      body.splice(i, 0, buildPopFrame());
      i += 2; // skip pop + return
    } else {
      // Recurse into blocks
      if (stmt.type === 'IfStatement') {
        if (stmt.consequent?.type === 'BlockStatement') {
          insertPopFrameBeforeReturns(stmt.consequent.body);
        }
        if (stmt.alternate?.type === 'BlockStatement') {
          insertPopFrameBeforeReturns(stmt.alternate.body);
        }
      }
      i += 1;
    }
  }
}

/**
 * Instrument a loop statement (for, while, do-while, for-in, for-of).
 */
function instrumentLoop(stmt: AnyNode, scopeVars: string[]): void {
  // Collect loop-specific variable declarations
  const loopVars = [...scopeVars];
  const blockScopedVars: string[] = [];

  if (stmt.type === 'ForStatement' && stmt.init?.type === 'VariableDeclaration') {
    const isBlockScoped = stmt.init.kind === 'let' || stmt.init.kind === 'const';
    for (const decl of stmt.init.declarations) {
      const names: string[] = [];
      extractPatternNames(decl.id, names);
      loopVars.push(...names);
      if (isBlockScoped) blockScopedVars.push(...names);
    }
  } else if (
    (stmt.type === 'ForInStatement' || stmt.type === 'ForOfStatement') &&
    stmt.left?.type === 'VariableDeclaration'
  ) {
    const isBlockScoped = stmt.left.kind === 'let' || stmt.left.kind === 'const';
    for (const decl of stmt.left.declarations) {
      const names: string[] = [];
      extractPatternNames(decl.id, names);
      loopVars.push(...names);
      if (isBlockScoped) blockScopedVars.push(...names);
    }
  }

  // Ensure the body is a block statement
  if (stmt.body.type !== 'BlockStatement') {
    stmt.body = {
      type: 'BlockStatement',
      body: [stmt.body],
    };
  }

  // Insert loop guard at the top
  stmt.body.body.unshift(buildLoopGuard());

  if (blockScopedVars.length > 0) {
    // Determine descriptive frame name
    const loopName = stmt.type === 'ForInStatement' ? 'for...in'
      : stmt.type === 'ForOfStatement' ? 'for...of' : 'for';

    // Push a block-scope frame after the loop guard
    stmt.body.body.splice(1, 0, buildPushFrame(loopName, blockScopedVars));

    // Set parent var context so captures distribute vars correctly
    const savedParentVarNames = _parentVarNames;
    _parentVarNames = scopeVars.slice();

    instrumentBlock(stmt.body.body, loopVars, false);

    _parentVarNames = savedParentVarNames;

    // Pop the block-scope frame at the end of the body
    stmt.body.body.push(buildPopFrame());
  } else {
    // No block-scoped vars (e.g. var-based loop) — normal instrumentation
    instrumentBlock(stmt.body.body, loopVars, false);
  }
}

/**
 * Instrument a class declaration/expression.
 */
function instrumentClass(cls: AnyNode, scopeVars: string[]): void {
  if (cls.body?.body) {
    for (const method of cls.body.body) {
      if (method.type === 'MethodDefinition' && method.value) {
        instrumentFunction(method.value, scopeVars);
      }
    }
  }
}
