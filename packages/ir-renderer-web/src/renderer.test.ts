import { describe, it, expect } from 'vitest';
import { createIRDocument, createIRCanvas, createIRNode, createIRStyleContext } from 'ir-schema';
import { renderDocument, computeLayout } from './index';

describe('ir-renderer-web layout & renderer', () => {
  const canvas = createIRCanvas({ platform: 'web', width: 800, height: 600 });

  it('should compute layouts with auto-sizing and absolute positioning correctly', () => {
    const style_context = createIRStyleContext({
      theme_tokens: {
        colors: { fill: '#ff0000' },
        typography: { families: {}, sizes: {}, weights: {}, line_heights: {}, spacings: {} },
        spacing: {},
        radii: {},
        shadows: {},
        easings: {},
        durations: {}
      }
    });

    const doc = createIRDocument({
      domain: 'visual',
      session_id: 'test-layout',
      canvas,
      style_context,
      objects: [
        createIRNode({
          id: 'group-1',
          type: 'group',
          position: { x: 50, y: 50, z: 0 },
          size: { width: 'auto', height: 'auto' },
          children: [
            createIRNode({
              id: 'child-1',
              type: 'shape',
              position: { x: 10, y: 10, z: 0 },
              size: { width: 100, height: 100 }
            }),
            createIRNode({
              id: 'child-2',
              type: 'text',
              position: { x: 20, y: 20, z: 0 },
              size: { width: 'auto', height: 'auto' },
              properties: { content: 'Hello' },
              style_override: { font_size: 16 }
            })
          ]
        })
      ]
    });

    const layouts = computeLayout(doc);

    expect(layouts['child-1']).toEqual({
      x: 60,
      y: 60,
      width: 100,
      height: 100
    });

    expect(layouts['child-2'].x).toBe(70);
    expect(layouts['child-2'].y).toBe(70);
    expect(layouts['child-2'].width).toBeCloseTo(48, 1);
    expect(layouts['child-2'].height).toBeCloseTo(19.2, 1);

    expect(layouts['group-1'].width).toBe(100);
    expect(layouts['group-1'].height).toBe(100);
  });

  it('should render document to HTML and CSS fragments', () => {
    const doc = createIRDocument({
      domain: 'visual',
      session_id: 'test-render',
      canvas,
      style_context: createIRStyleContext(),
      objects: [
        createIRNode({
          id: 'rect-1',
          type: 'shape',
          position: { x: 10, y: 10, z: 0 },
          size: { width: 100, height: 100 },
          style_override: { fill: '#ff0000', stroke: '#000000', stroke_width: 2 }
        })
      ]
    });

    doc.style_context.resolved = {
      'rect-1': { fill: '#ff0000', stroke: '#000000', stroke_width: 2 }
    };

    const { html, css, fullHtml } = renderDocument(doc);

    expect(html).toContain('id="ir-canvas"');
    expect(html).toContain('id="rect-1"');
    expect(html).toContain('class="ir-node ir-shape ir-rect"');

    expect(css).toContain('#ir-canvas {');
    expect(css).toContain('#rect-1 {');
    expect(css).toContain('background-color: #ff0000;');
    expect(css).toContain('border: 2px solid #000000;');
    expect(css).toContain('left: 10px;');
    expect(css).toContain('top: 10px;');
    expect(css).toContain('width: 100px;');
    expect(css).toContain('height: 100px;');

    expect(fullHtml).toContain('<!DOCTYPE html>');
  });

  it('should generate trace ID and inject C2PA metadata when c2pa_required is true', () => {
    const doc = createIRDocument({
      domain: 'visual',
      session_id: 'test-c2pa',
      canvas,
      style_context: createIRStyleContext(),
      objects: [
        createIRNode({
          id: 'rect-c2pa',
          type: 'shape',
          position: { x: 10, y: 10, z: 0 },
          size: { width: 100, height: 100 }
        })
      ],
      constraints: {
        brand_profile_id: 'test-brand',
        wcag_level: 'AA',
        c2pa_required: true,
        semantic_rules: [],
        layout_constraints: []
      }
    });

    const result = renderDocument(doc);
    expect(result.traceId).toBeDefined();
    expect(result.traceId).toContain('trace-');
    expect(result.c2paManifest).toBeDefined();
    expect(result.c2paManifest).toContain('"@context": "https://c2pa.org/schemas/v1"');
    expect(result.fullHtml).toContain('meta name="ir-trace-id"');
    expect(result.fullHtml).toContain('script type="application/c2pa+json"');
  });

  it('should apply layout constraints (pin, align, aspect_ratio, min_size) during layout computation', () => {
    const doc = createIRDocument({
      domain: 'visual',
      session_id: 'test-layout-constraints',
      canvas,
      style_context: createIRStyleContext(),
      objects: [
        createIRNode({
          id: 'container-box',
          type: 'group',
          position: { x: 0, y: 0, z: 0 },
          size: { width: 400, height: 400 }
        }),
        createIRNode({
          id: 'child-box-1',
          type: 'shape',
          position: { x: 10, y: 10, z: 0 },
          size: { width: 50, height: 50 }
        }),
        createIRNode({
          id: 'child-box-2',
          type: 'shape',
          position: { x: 10, y: 80, z: 0 },
          size: { width: 60, height: 60 }
        })
      ],
      constraints: {
        brand_profile_id: 'test-brand',
        wcag_level: 'AA',
        semantic_rules: [],
        layout_constraints: [
          {
            id: 'pin-constraint',
            type: 'pin',
            targets: ['child-box-1', 'container-box'],
            params: { edge: 'right', value: 20 }
          },
          {
            id: 'align-constraint',
            type: 'align',
            targets: ['child-box-1', 'child-box-2'],
            params: { edge: 'left' }
          },
          {
            id: 'ratio-constraint',
            type: 'aspect_ratio',
            targets: ['container-box'],
            params: { ratio: 2 }
          },
          {
            id: 'min-size-constraint',
            type: 'min_size',
            targets: ['child-box-1'],
            params: { width: 80 }
          }
        ]
      }
    });

    const layouts = computeLayout(doc);

    expect(layouts['child-box-1'].width).toBe(80);
    expect(layouts['child-box-1'].x).toBe(300);
    expect(layouts['child-box-2'].x).toBe(300);
    expect(layouts['container-box'].height).toBe(200);
  });

  it('should render shape nodes (triangles, circles, rects) with correct CSS and HTML markup', () => {
    const doc = createIRDocument({
      domain: 'visual',
      session_id: 'test-shapes',
      canvas,
      style_context: createIRStyleContext(),
      objects: [
        createIRNode({
          id: 'tri-1',
          type: 'shape',
          position: { x: 0, y: 0, z: 0 },
          size: { width: 100, height: 100 },
          properties: { shape_type: 'triangle' },
          style_override: { fill: '#00ff00' }
        }),
        createIRNode({
          id: 'cir-1',
          type: 'shape',
          position: { x: 100, y: 0, z: 0 },
          size: { width: 100, height: 100 },
          properties: { shape_type: 'circle' }
        })
      ]
    });

    doc.style_context.resolved = {
      'tri-1': { fill: '#00ff00' },
      'cir-1': { fill: '#0000ff' }
    };

    const { html, css } = renderDocument(doc);

    expect(html).toContain('id="tri-1" class="ir-node ir-shape ir-triangle"');
    expect(html).toContain('<polygon points="50,0 100,100 0,100" fill="currentColor"');

    expect(html).toContain('id="cir-1" class="ir-node ir-shape ir-circle" style="border-radius: 50%;"');

    expect(css).toContain('color: #00ff00;');
    expect(css).toContain('background-color: transparent;');
    expect(css).toContain('background-color: #0000ff;');
  });
});
