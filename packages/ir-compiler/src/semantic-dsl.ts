import { IRDocument, IRNode, IRCanvas } from 'ir-schema';

// ── TOKENS ───────────────────────────────────────────────────

type TokenType =
  | 'NUMBER'
  | 'STRING'
  | 'IDENTIFIER'
  | 'OPERATOR'
  | 'LPAREN'
  | 'RPAREN'
  | 'DOT'
  | 'COMMA'
  | 'EOF';

interface Token {
  type: TokenType;
  value: string;
}

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const char = input[i];

    // Whitespace
    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // Numbers (e.g. 4.5)
    if (/[0-9]/.test(char)) {
      let val = '';
      while (i < input.length && /[0-9.]/.test(input[i])) {
        val += input[i];
        i++;
      }
      tokens.push({ type: 'NUMBER', value: val });
      continue;
    }

    // String literals (e.g. "#ffffff" or 'brand://primary')
    if (char === '"' || char === "'") {
      const quote = char;
      let val = '';
      i++; // skip quote
      while (i < input.length && input[i] !== quote) {
        val += input[i];
        i++;
      }
      i++; // skip closing quote
      tokens.push({ type: 'STRING', value: val });
      continue;
    }

    // Identifiers (e.g. text, parent, contrast_with)
    if (/[a-zA-Z_]/.test(char)) {
      let val = '';
      while (i < input.length && /[a-zA-Z0-9_]/.test(input[i])) {
        val += input[i];
        i++;
      }
      tokens.push({ type: 'IDENTIFIER', value: val });
      continue;
    }

    // Multi-char operators: ==, !=, <=, >=
    if (
      (char === '=' && input[i + 1] === '=') ||
      (char === '!' && input[i + 1] === '=') ||
      (char === '<' && input[i + 1] === '=') ||
      (char === '>' && input[i + 1] === '=')
    ) {
      tokens.push({ type: 'OPERATOR', value: char + input[i + 1] });
      i += 2;
      continue;
    }

    // Single-char operators
    if (['+', '-', '*', '/', '<', '>', '='].includes(char)) {
      tokens.push({ type: 'OPERATOR', value: char });
      i++;
      continue;
    }

    // Syntax punctuation
    if (char === '(') {
      tokens.push({ type: 'LPAREN', value: '(' });
      i++;
      continue;
    }
    if (char === ')') {
      tokens.push({ type: 'RPAREN', value: ')' });
      i++;
      continue;
    }
    if (char === '.') {
      tokens.push({ type: 'DOT', value: '.' });
      i++;
      continue;
    }
    if (char === ',') {
      tokens.push({ type: 'COMMA', value: ',' });
      i++;
      continue;
    }

    // Fallback/invalid character
    i++;
  }

  tokens.push({ type: 'EOF', value: '' });
  return tokens;
}

// ── AST NODES ────────────────────────────────────────────────

export type ASTNode =
  | { type: 'Literal'; value: any }
  | { type: 'Identifier'; name: string }
  | { type: 'MemberAccess'; object: ASTNode; property: string }
  | { type: 'MethodCall'; object: ASTNode; method: string; args: ASTNode[] }
  | { type: 'BinaryExpression'; left: ASTNode; operator: string; right: ASTNode };

// ── PARSER ───────────────────────────────────────────────────

export class Parser {
  private tokens: Token[];
  private current = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private isAtEnd(): boolean {
    return this.peek().type === 'EOF';
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    throw new Error(`Parser Error: ${message} at token type ${this.peek().type} ("${this.peek().value}")`);
  }

  public parse(): ASTNode {
    return this.expression();
  }

  private expression(): ASTNode {
    return this.relational();
  }

  private relational(): ASTNode {
    let expr = this.additive();

    while (
      this.peek().type === 'OPERATOR' &&
      ['==', '!=', '<', '>', '<=', '>='].includes(this.peek().value)
    ) {
      const operator = this.advance().value;
      const right = this.additive();
      expr = { type: 'BinaryExpression', left: expr, operator, right };
    }

    return expr;
  }

  private additive(): ASTNode {
    let expr = this.multiplicative();

    while (this.peek().type === 'OPERATOR' && ['+', '-'].includes(this.peek().value)) {
      const operator = this.advance().value;
      const right = this.multiplicative();
      expr = { type: 'BinaryExpression', left: expr, operator, right };
    }

    return expr;
  }

  private multiplicative(): ASTNode {
    let expr = this.primary();

    while (this.peek().type === 'OPERATOR' && ['*', '/'].includes(this.peek().value)) {
      const operator = this.advance().value;
      const right = this.primary();
      expr = { type: 'BinaryExpression', left: expr, operator, right };
    }

    return expr;
  }

  private primary(): ASTNode {
    if (this.match('NUMBER')) {
      return { type: 'Literal', value: parseFloat(this.previous().value) };
    }

    if (this.match('STRING')) {
      return { type: 'Literal', value: this.previous().value };
    }

    if (this.match('LPAREN')) {
      const expr = this.expression();
      this.consume('RPAREN', "Expect ')' after expression.");
      return expr;
    }

    if (this.match('IDENTIFIER')) {
      let expr: ASTNode = { type: 'Identifier', name: this.previous().value };

      while (true) {
        if (this.match('DOT')) {
          const prop = this.consume('IDENTIFIER', 'Expect property name after \'.\'.').value;
          expr = { type: 'MemberAccess', object: expr, property: prop };
        } else if (this.match('LPAREN')) {
          // If previous expression was MemberAccess, treat as method call
          if (expr.type === 'MemberAccess') {
            const args: ASTNode[] = [];
            if (!this.check('RPAREN')) {
              do {
                args.push(this.expression());
              } while (this.match('COMMA'));
            }
            this.consume('RPAREN', "Expect ')' after arguments.");
            expr = {
              type: 'MethodCall',
              object: expr.object,
              method: expr.property,
              args
            };
          } else {
            throw new Error('Parser Error: Direct function calls without an object context are not supported.');
          }
        } else {
          break;
        }
      }

      return expr;
    }

    throw new Error(`Parser Error: Unexpected token "${this.peek().value}"`);
  }
}

// ── COLOR RESOLUTION & WCAG ───────────────────────────────────

interface RGB {
  r: number;
  g: number;
  b: number;
}

export function parseColorToRGB(color: any): RGB | null {
  if (typeof color === 'string') {
    let clean = color.trim().toLowerCase();
    if (clean.startsWith('#')) {
      clean = clean.substring(1);
      if (clean.length === 3) {
        return {
          r: parseInt(clean[0] + clean[0], 16),
          g: parseInt(clean[1] + clean[1], 16),
          b: parseInt(clean[2] + clean[2], 16)
        };
      }
      if (clean.length === 6) {
        return {
          r: parseInt(clean.substring(0, 2), 16),
          g: parseInt(clean.substring(2, 4), 16),
          b: parseInt(clean.substring(4, 6), 16)
        };
      }
    }
  } else if (color && typeof color === 'object') {
    if (typeof color.r === 'number' && typeof color.g === 'number' && typeof color.b === 'number') {
      return { r: color.r, g: color.g, b: color.b };
    }
  }
  return null;
}

export function getRelativeLuminance(rgb: RGB): number {
  const rs = rgb.r / 255;
  const gs = rgb.g / 255;
  const bs = rgb.b / 255;

  const r = rs <= 0.04045 ? rs / 12.92 : Math.pow((rs + 0.055) / 1.055, 2.4);
  const g = gs <= 0.04045 ? gs / 12.92 : Math.pow((gs + 0.055) / 1.055, 2.4);
  const b = bs <= 0.04045 ? bs / 12.92 : Math.pow((bs + 0.055) / 1.055, 2.4);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function calculateContrastRatio(color1: any, color2: any): number {
  const rgb1 = parseColorToRGB(color1);
  const rgb2 = parseColorToRGB(color2);

  if (!rgb1 || !rgb2) return 1.0;

  const l1 = getRelativeLuminance(rgb1);
  const l2 = getRelativeLuminance(rgb2);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

// ── EVALUATOR ────────────────────────────────────────────────

export interface EvaluationContext {
  self?: IRNode;
  parent?: IRNode;
  canvas: IRCanvas;
  document: IRDocument;
}

export function resolveValue(value: any, doc: IRDocument): any {
  if (typeof value === 'string') {
    if (value.startsWith('theme://')) {
      const path = value.substring(8).split('.');
      let current: any = doc.style_context?.theme_tokens;
      for (const part of path) {
        if (current && typeof current === 'object') {
          current = current[part];
        } else {
          return value;
        }
      }
      return current !== undefined ? current : value;
    }
    if (value.startsWith('brand://')) {
      const colorName = value.substring(8);
      const colors = doc.style_context?.theme_tokens?.colors;
      if (colors) {
        if (colors[value] !== undefined) return colors[value];
        if (colors[colorName] !== undefined) return colors[colorName];
      }
    }
  }
  return value;
}

export function resolveNodeStyleProperty(node: IRNode, doc: IRDocument, propertyName: string): any {
  if (node.style_override && node.style_override[propertyName] !== undefined) {
    return resolveValue(node.style_override[propertyName], doc);
  }
  if (node.style_ref && doc.style_context?.component_styles) {
    const compStyle = doc.style_context.component_styles[node.style_ref];
    if (compStyle && compStyle[propertyName] !== undefined) {
      return resolveValue(compStyle[propertyName], doc);
    }
  }
  if (doc.style_context?.theme_tokens) {
    const theme = doc.style_context.theme_tokens;
    if (
      propertyName === 'fill' ||
      propertyName === 'stroke' ||
      propertyName === 'background_color' ||
      propertyName === 'border_color'
    ) {
      if (theme.colors && theme.colors[propertyName] !== undefined) {
        return resolveValue(theme.colors[propertyName], doc);
      }
    }
  }
  return undefined;
}

export function evaluateAST(node: ASTNode, context: EvaluationContext): any {
  switch (node.type) {
    case 'Literal':
      return node.value;

    case 'Identifier': {
      const name = node.name;
      if (name === 'self') return context.self;
      if (name === 'parent') return context.parent;
      if (name === 'canvas') return context.canvas;
      if (name === 'document') return context.document;
      // Syntactic type resolution (e.g. text refers to context.self if it is a text node)
      if (context.self && context.self.type === name) return context.self;
      if (context.parent && context.parent.type === name) return context.parent;
      return undefined;
    }

    case 'MemberAccess': {
      const obj = evaluateAST(node.object, context);
      const prop = node.property;

      if (!obj) return undefined;

      // Handle canvas properties
      if (obj === context.canvas) {
        if (prop === 'aspect_ratio') {
          const width = context.canvas.width;
          const height = context.canvas.height;
          return width === 'auto' || height === 'auto' ? 1.0 : (width as number) / (height as number);
        }
        return (context.canvas as any)[prop];
      }

      // Handle node properties
      if (obj.id && obj.type) {
        const irNode = obj as IRNode;
        if (prop === 'fill' || prop === 'stroke' || prop === 'background_color' || prop === 'border_color') {
          return resolveNodeStyleProperty(irNode, context.document, prop);
        }
        if (prop === 'width') return irNode.size.width;
        if (prop === 'height') return irNode.size.height;
        if (prop === 'x') return irNode.position.x;
        if (prop === 'y') return irNode.position.y;
        if (prop === 'z') return irNode.position.z;
        // Check properties dictionary
        if (irNode.properties && irNode.properties[prop] !== undefined) {
          return irNode.properties[prop];
        }
        return (irNode as any)[prop];
      }

      return obj[prop];
    }

    case 'MethodCall': {
      const obj = evaluateAST(node.object, context);
      const method = node.method;
      const evaluatedArgs = node.args.map((arg) => evaluateAST(arg, context));

      if (method === 'contrast_with') {
        const otherColor = resolveValue(evaluatedArgs[0], context.document);
        const selfColor = resolveValue(obj, context.document);
        return calculateContrastRatio(selfColor, otherColor);
      }

      throw new Error(`Evaluator Error: Unsupported method call "${method}"`);
    }

    case 'BinaryExpression': {
      const left = evaluateAST(node.left, context);
      const right = evaluateAST(node.right, context);
      const op = node.operator;

      switch (op) {
        case '+': return left + right;
        case '-': return left - right;
        case '*': return left * right;
        case '/': return left / right;
        case '==': return left == right;
        case '!=': return left != right;
        case '<': return left < right;
        case '>': return left > right;
        case '<=': return left <= right;
        case '>=': return left >= right;
        default:
          throw new Error(`Evaluator Error: Unsupported binary operator "${op}"`);
      }
    }
  }
}

export function evaluateExpression(expression: string, context: EvaluationContext): any {
  const tokens = tokenize(expression);
  const parser = new Parser(tokens);
  const ast = parser.parse();
  return evaluateAST(ast, context);
}
