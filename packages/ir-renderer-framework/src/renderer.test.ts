import { describe, it, expect } from 'vitest';
import { createIRDocument, createIRCanvas, createIRNode, createIRStyleContext } from 'ir-schema';
import { renderReactComponent, renderSvelteComponent, renderVueComponent } from './index';

describe('ir-renderer-framework code generators', () => {
  const validCanvas = createIRCanvas({ platform: 'web', width: 800, height: 600 });
  const styleContext = createIRStyleContext();

  const testDoc = createIRDocument({
    domain: 'visual',
    session_id: 'test-session',
    canvas: validCanvas,
    style_context: styleContext,
    objects: [
      createIRNode({
        id: 'card-1',
        type: 'frame',
        position: { x: 0, y: 0 },
        size: { width: 400, height: 300 },
        children: [
          createIRNode({
            id: 'title-1',
            type: 'text',
            position: { x: 20, y: 20 },
            size: { width: 'auto', height: 'auto' },
            properties: { content: 'Static Text' },
            bindings: { content: 'props.title' }
          }),
          createIRNode({
            id: 'avatar-1',
            type: 'image',
            position: { x: 20, y: 100 },
            size: { width: 80, height: 80 },
            properties: { src: 'default.png', alt: 'Avatar' },
            bindings: { src: 'props.imageUrl', alt: 'props.altText' }
          })
        ]
      })
    ]
  });

  it('should compile to a valid React component with props bindings', () => {
    const result = renderReactComponent(testDoc, 'TestCard');
    
    // Check component structure and export
    expect(result.code).toContain("import React from 'react';");
    expect(result.code).toContain('export function TestCard(props: any)');
    
    // Check JSX class names and self-closing tags
    expect(result.code).toContain('className="ir-node ir-frame"');
    expect(result.code).toContain('className="ir-node ir-text"');
    expect(result.code).toContain('className="ir-node ir-image"');
    
    // Check dynamic JSX bindings
    expect(result.code).toContain('{props.title}');
    expect(result.code).toContain('src={props.imageUrl}');
    expect(result.code).toContain('alt={props.altText}');

    // CSS should be generated
    expect(result.css).toContain('#card-1');
    expect(result.css).toContain('#title-1');
  });

  it('should compile to a valid Svelte component with exports and bindings', () => {
    const result = renderSvelteComponent(testDoc);

    // Check script exports
    expect(result.code).toContain('<script>');
    expect(result.code).toContain('export let title = \'\';');
    expect(result.code).toContain('export let imageUrl = \'\';');
    expect(result.code).toContain('export let altText = \'\';');
    
    // Check HTML Svelte bindings
    expect(result.code).toContain('class="ir-node ir-text"');
    expect(result.code).toContain('{title}');
    expect(result.code).toContain('src={imageUrl}');
    expect(result.code).toContain('alt={altText}');
  });

  it('should compile to a valid Vue component with props setup and bindings', () => {
    const result = renderVueComponent(testDoc);

    // Check Vue script setup structure
    expect(result.code).toContain('<script setup>');
    expect(result.code).toContain('defineProps({');
    expect(result.code).toContain('title: {');
    expect(result.code).toContain('imageUrl: {');

    // Check Vue v-bind attributes
    expect(result.code).toContain('{{ title }}');
    expect(result.code).toContain(':src="imageUrl"');
    expect(result.code).toContain(':alt="altText"');
  });
});
