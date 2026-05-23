import { describe, it, expect } from 'vitest';
import { createIRCanvas, createIRNode, createIRDocument } from 'ir-schema';
import {
  tokenize,
  Parser,
  evaluateExpression,
  calculateContrastRatio,
  parseColorToRGB
} from './semantic-dsl';
import { validateIR } from './index';

describe('semantic-dsl tokenizer & parser', () => {
  it('should tokenize expressions correctly', () => {
    const expr = 'text.fill.contrast_with(parent.fill) >= 4.5';
    const tokens = tokenize(expr);

    expect(tokens.map((t) => t.type)).toEqual([
      'IDENTIFIER',
      'DOT',
      'IDENTIFIER',
      'DOT',
      'IDENTIFIER',
      'LPAREN',
      'IDENTIFIER',
      'DOT',
      'IDENTIFIER',
      'RPAREN',
      'OPERATOR',
      'NUMBER',
      'EOF'
    ]);
  });

  it('should parse math operations and respect operator precedence', () => {
    const canvas = createIRCanvas({ platform: 'web', width: 800, height: 600 });
    const doc = createIRDocument({ domain: 'visual', session_id: '123', canvas });

    const context = { canvas, document: doc };

    expect(evaluateExpression('2 + 3 * 4', context)).toBe(14);
    expect(evaluateExpression('(2 + 3) * 4', context)).toBe(20);
    expect(evaluateExpression('10 / 2 - 1', context)).toBe(4);
  });
});

describe('semantic-dsl WCAG contrast ratio', () => {
  it('should parse colors correctly', () => {
    expect(parseColorToRGB('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseColorToRGB('#000000')).toEqual({ r: 0, g: 0, b: 0 });
    expect(parseColorToRGB('#f00')).toEqual({ r: 255, g: 0, b: 0 });
    expect(parseColorToRGB({ r: 10, g: 20, b: 30 })).toEqual({ r: 10, g: 20, b: 30 });
  });

  it('should compute WCAG contrast ratio correctly', () => {
    // White vs Black contrast should be 21
    expect(calculateContrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 1);
    // Same colors contrast should be 1
    expect(calculateContrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 1);
    // White vs Mid Gray (#7f7f7f)
    expect(calculateContrastRatio('#ffffff', '#7f7f7f')).toBeCloseTo(4.0, 1);
  });
});

describe('semantic-dsl evaluation context & path resolution', () => {
  const canvas = createIRCanvas({ platform: 'web', width: 800, height: 600 });
  const textNode = createIRNode({
    id: 'text-1',
    type: 'text',
    style_override: { fill: '#ffffff' },
    properties: { content: 'hello', font_size: 16 }
  });
  const parentNode = createIRNode({
    id: 'frame-1',
    type: 'frame',
    style_override: { fill: '#000000' },
    properties: {}
  });

  const doc = createIRDocument({
    domain: 'visual',
    session_id: 's-1',
    canvas,
    objects: [parentNode]
  });

  const context = {
    self: textNode,
    parent: parentNode,
    canvas,
    document: doc
  };

  it('should resolve node properties and size', () => {
    expect(evaluateExpression('self.type', context)).toBe('text');
    expect(evaluateExpression('text.properties.content', context)).toBe('hello');
    expect(evaluateExpression('canvas.width', context)).toBe(800);
    expect(evaluateExpression('canvas.aspect_ratio', context)).toBeCloseTo(1.33, 2);
  });

  it('should evaluate contrast_with method calls', () => {
    // contrast between self.fill (#ffffff) and parent.fill (#000000) should be 21
    expect(evaluateExpression('self.fill.contrast_with(parent.fill)', context)).toBeCloseTo(21, 1);
    expect(evaluateExpression('text.fill.contrast_with(parent.fill) >= 4.5', context)).toBe(true);
    expect(evaluateExpression('text.fill.contrast_with("#ffffff") < 4.5', context)).toBe(true);
  });

  it('should fall back to theme context styles if not overridden', () => {
    const themeDoc = createIRDocument({
      domain: 'visual',
      session_id: 's-theme',
      canvas,
      style_context: {
        theme_tokens: {
          colors: {
            fill: '#ffffff',
            primary: '#ff0000',
            typography: {},
            spacing: {},
            radii: {},
            shadows: {},
            easings: {},
            durations: {}
          } as any,
          typography: {
            families: {},
            sizes: {},
            weights: {},
            line_heights: {},
            spacings: {}
          },
          spacing: {},
          radii: {},
          shadows: {},
          easings: {},
          durations: {}
        }
      }
    });

    const plainNode = createIRNode({ type: 'shape' });
    const localContext = {
      self: plainNode,
      canvas,
      document: themeDoc
    };

    // fill is resolved from theme_tokens.colors
    expect(evaluateExpression('self.fill', localContext)).toBe('#ffffff');
  });
});

describe('validateIR with semantic rules', () => {
  it('should report violation error when semantic rules are violated', () => {
    const canvas = createIRCanvas({ platform: 'web', width: 800, height: 600 });
    const textNode = createIRNode({
      id: 'text-1',
      type: 'text',
      style_override: { fill: '#7f7f7f' } // low contrast against parent
    });
    const parentNode = createIRNode({
      id: 'frame-1',
      type: 'frame',
      style_override: { fill: '#ffffff' },
      children: [textNode]
    });

    const doc = createIRDocument({
      domain: 'visual',
      session_id: 's-1',
      canvas,
      objects: [parentNode],
      constraints: {
        semantic_rules: [
          {
            id: 'contrast-rule-1',
            scope: 'parent_child',
            condition: 'self.fill.contrast_with(parent.fill) >= 4.5',
            violation: 'error',
            message: 'Text must have high contrast against its container'
          }
        ]
      }
    });

    const validationResult = validateIR(doc);
    expect(validationResult.valid).toBe(false);
    expect(validationResult.errors.length).toBe(1);
    expect(validationResult.errors[0].code).toBe('semantic_rule_violation');
    expect(validationResult.errors[0].message).toContain('high contrast');
    expect(validationResult.errors[0].severity).toBe('error');
    expect(validationResult.errors[0].path).toBe('/objects/0/children/0');
  });

  it('should pass validation if semantic rules are satisfied', () => {
    const canvas = createIRCanvas({ platform: 'web', width: 800, height: 600 });
    const textNode = createIRNode({
      id: 'text-1',
      type: 'text',
      style_override: { fill: '#000000' } // high contrast
    });
    const parentNode = createIRNode({
      id: 'frame-1',
      type: 'frame',
      style_override: { fill: '#ffffff' },
      children: [textNode]
    });

    const doc = createIRDocument({
      domain: 'visual',
      session_id: 's-1',
      canvas,
      objects: [parentNode],
      constraints: {
        semantic_rules: [
          {
            id: 'contrast-rule-1',
            scope: 'parent_child',
            condition: 'self.fill.contrast_with(parent.fill) >= 4.5',
            violation: 'error',
            message: 'Text must have high contrast'
          }
        ]
      }
    });

    const validationResult = validateIR(doc);
    expect(validationResult.valid).toBe(true);
    expect(validationResult.errors.length).toBe(0);
  });
});
