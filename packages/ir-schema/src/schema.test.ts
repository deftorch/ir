import { describe, it, expect } from 'vitest';
import { createIRCanvas, createIRNode, createIRDocument, schemas, generateUUID } from './index';

describe('ir-schema core', () => {
  it('should generate valid UUIDs', () => {
    const uuid = generateUUID();
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('should create canvas with defaults', () => {
    const canvas = createIRCanvas({
      platform: 'web',
      width: 1920,
      height: 1080
    });

    expect(canvas.platform).toBe('web');
    expect(canvas.width).toBe(1920);
    expect(canvas.height).toBe(1080);
    expect(canvas.fps).toBeUndefined();
  });

  it('should create node with defaults', () => {
    const node = createIRNode({
      type: 'text',
      properties: { text: 'Hello World' }
    });

    expect(node.id).toBeDefined();
    expect(node.type).toBe('text');
    expect(node.opacity).toBe(1.0);
    expect(node.visible).toBe(true);
    expect(node.locked).toBe(false);
    expect(node.position).toEqual({ x: 0, y: 0 });
    expect(node.scale).toEqual({ x: 1, y: 1 });
    expect(node.rotation).toBe(0);
    expect(node.properties.text).toBe('Hello World');
  });

  it('should create document with generated metadata', () => {
    const canvas = createIRCanvas({
      platform: 'web',
      width: 1080,
      height: 1080
    });

    const doc = createIRDocument({
      domain: 'visual',
      session_id: 'test-session',
      canvas
    });

    expect(doc.meta.schema_version).toBe('2.0');
    expect(doc.meta.domain).toBe('visual');
    expect(doc.meta.session_id).toBe('test-session');
    expect(doc.meta.ir_id).toBeDefined();
    expect(doc.meta.created_at).toBeDefined();
    expect(doc.canvas).toEqual(canvas);
    expect(doc.objects).toEqual([]);
    expect(doc.style_context.component_styles).toEqual({});
  });

  it('should export all schemas correctly', () => {
    expect(schemas.canvas).toBeDefined();
    expect(schemas.node).toBeDefined();
    expect(schemas.constraintSet).toBeDefined();
    expect(schemas.document).toBeDefined();

    expect(schemas.document.$id).toBe('https://ir-dsl.org/schemas/document.json');
  });
});
