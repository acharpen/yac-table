// ////////////////////////////////////////////////////////////////////////////
// Custom TSLint rule
//
// Manually forked from tslint
// Licensed under MIT (https://github.com/palantir/tslint/blob/master/src/rules/strictBooleanExpressionsRule.ts)
// ////////////////////////////////////////////////////////////////////////////

import * as Lint from 'tslint';
import * as ts from 'typescript';

export class Rule extends Lint.Rules.TypedRule {
  public static metadata: Lint.IRuleMetadata = {
    ruleName: 'no-number-in-boolean-expressions',
    description: "Forbids to use the type 'number' in boolean expressions.",
    optionsDescription: '',
    options: {},
    type: 'maintainability',
    typescriptOnly: true,
    requiresTypeInfo: true
  };

  public applyWithProgram(sourceFile: ts.SourceFile, program: ts.Program): Lint.RuleFailure[] {
    return this.applyWithFunction(sourceFile, walk, null, program.getTypeChecker());
  }
}

function walk(ctx: Lint.WalkContext<unknown>, checker: ts.TypeChecker): void {
  const cb = (node: ts.Node) => {
    switch (node.kind) {
      case ts.SyntaxKind.BinaryExpression: {
        const b = node as ts.BinaryExpression;
        if (binaryBooleanExpressionKind(b) !== undefined) {
          const { left, right } = b;
          checkExpression(left, b);
          checkExpression(right, b);
        }
        break;
      }

      case ts.SyntaxKind.PrefixUnaryExpression: {
        const { operator, operand } = node as ts.PrefixUnaryExpression;
        if (operator === ts.SyntaxKind.ExclamationToken) {
          checkExpression(operand, node as ts.PrefixUnaryExpression);
        }
        break;
      }

      case ts.SyntaxKind.IfStatement:
      case ts.SyntaxKind.WhileStatement:
      case ts.SyntaxKind.DoStatement: {
        const c = node as ts.IfStatement | ts.WhileStatement | ts.DoStatement;
        // If it's a boolean binary expression, we'll check it when recursing.
        if (!isBooleanBinaryExpression(c.expression)) {
          checkExpression(c.expression, c);
        }
        break;
      }

      case ts.SyntaxKind.ConditionalExpression: {
        checkExpression((node as ts.ConditionalExpression).condition, node as ts.ConditionalExpression);
        break;
      }

      case ts.SyntaxKind.ForStatement: {
        const { condition } = node as ts.ForStatement;
        if (condition !== undefined) {
          checkExpression(condition, node as ts.ForStatement);
        }
        break;
      }
    }

    ts.forEachChild(node, cb);
  };

  const checkExpression = (node: ts.Expression, location: ts.Node) => {
    const type = checker.getTypeAtLocation(node);
    if (type.isNumberLiteral()) {
      ctx.addFailureAtNode(node, showFailure(location));
    }
  };

  ts.forEachChild(ctx.sourceFile, cb);
}

function binaryBooleanExpressionKind(node: ts.BinaryExpression): '&&' | '||' | undefined {
  switch (node.operatorToken.kind) {
    case ts.SyntaxKind.AmpersandAmpersandToken:
      return '&&';
    case ts.SyntaxKind.BarBarToken:
      return '||';
    default:
      return undefined;
  }
}

function isBooleanBinaryExpression(node: ts.Expression): boolean {
  return (
    node.kind === ts.SyntaxKind.BinaryExpression &&
    binaryBooleanExpressionKind(node as ts.BinaryExpression) !== undefined
  );
}

function showFailure(location: ts.Node): string {
  return `The type 'number' is not allowed in the ${showLocation(location)}.`;
}

function showLocation(n: ts.Node): string {
  switch (n.kind) {
    case ts.SyntaxKind.PrefixUnaryExpression:
      return "operand for the '!' operator";
    case ts.SyntaxKind.ConditionalExpression:
      return 'condition';
    case ts.SyntaxKind.ForStatement:
      return "'for' condition";
    case ts.SyntaxKind.IfStatement:
      return "'if' condition";
    case ts.SyntaxKind.WhileStatement:
      return "'while' condition";
    case ts.SyntaxKind.DoStatement:
      return "'do-while' condition";
    case ts.SyntaxKind.BinaryExpression:
      return `operand for the '${binaryBooleanExpressionKind(n as ts.BinaryExpression)}' operator`;
  }
}
