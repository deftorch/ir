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
    expect(html).toContain('class="ir-node ir-shape"');

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
});
