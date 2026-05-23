import { IRDocument, IRNode } from 'ir-schema';
import { ComputedLayout } from './layout';

export function cssColor(val: any): string {
  if (typeof val === 'string') return val;
  if (val && typeof val === 'object') {
    if (typeof val.r === 'number') {
      return `rgba(${val.r}, ${val.g}, ${val.b}, ${val.a ?? 1})`;
    }
    if (typeof val.c === 'number') {
      // CMYK to RGB conversion approximation
      const r = Math.round(255 * (1 - val.c / 100) * (1 - val.k / 100));
      const g = Math.round(255 * (1 - val.m / 100) * (1 - val.k / 100));
      const b = Math.round(255 * (1 - val.y / 100) * (1 - val.k / 100));
      return `rgb(${r}, ${g}, ${b})`;
    }
  }
  return '';
}

export function renderNodeHtml(node: IRNode, renderChildren: (node: IRNode) => string): string {
  const type = node.type;

  switch (type) {
    case 'text': {
      const content = node.properties.content || node.properties.text || '';
      return `<div id="${node.id}" class="ir-node ir-text">${content}</div>`;
    }
    case 'image': {
      const src = node.properties.src || '';
      const alt = node.properties.alt || '';
      return `<img id="${node.id}" class="ir-node ir-image" src="${src}" alt="${alt}" />`;
    }
    case 'shape':
    case 'frame':
    case 'group':
    default: {
      const childrenHtml = node.children ? node.children.map(renderChildren).join('\n') : '';
      return `<div id="${node.id}" class="ir-node ir-${type}">${childrenHtml}</div>`;
    }
  }
}

export function generateNodeCss(
  node: IRNode,
  layout: ComputedLayout,
  parentLayout: ComputedLayout | undefined,
  resolvedStyle: Record<string, any> = {},
  doc: IRDocument
): string {
  const relX = parentLayout ? layout.x - parentLayout.x : layout.x;
  const relY = parentLayout ? layout.y - parentLayout.y : layout.y;

  let css = `#${node.id} {\n`;
  css += `  position: absolute;\n`;
  css += `  left: ${relX}px;\n`;
  css += `  top: ${relY}px;\n`;
  css += `  width: ${layout.width}px;\n`;
  css += `  height: ${layout.height}px;\n`;
  
  if (node.type === 'text') {
    css += `  word-wrap: break-word;\n`;
    css += `  white-space: normal;\n`;
  }

  // Standard transform properties
  let transform = '';
  if (node.rotation) {
    transform += `rotate(${node.rotation}deg) `;
  }
  if (node.scale && (node.scale.x !== 1 || node.scale.y !== 1)) {
    transform += `scale(${node.scale.x}, ${node.scale.y}) `;
  }
  if (transform) {
    css += `  transform: ${transform.trim()};\n`;
  }
  if (node.transform_origin) {
    css += `  transform-origin: ${node.transform_origin.x * 100}% ${node.transform_origin.y * 100}%;\n`;
  }

  // Visual Styles
  if (node.opacity !== 1.0) {
    css += `  opacity: ${node.opacity};\n`;
  }
  if (!node.visible) {
    css += `  display: none;\n`;
  }
  if (node.z_index !== undefined) {
    css += `  z-index: ${node.z_index};\n`;
  }
  if (node.blend_mode) {
    css += `  mix-blend-mode: ${node.blend_mode};\n`;
  }

  // Determine explicit style styling (to avoid inheriting page/canvas level backgrounds and borders)
  const hasExplicitFill = (node.style_override && node.style_override.fill !== undefined) ||
                          (node.style_ref && doc.style_context?.component_styles?.[node.style_ref]?.fill !== undefined);
  const hasExplicitBg = (node.style_override && node.style_override.background_color !== undefined) ||
                        (node.style_ref && doc.style_context?.component_styles?.[node.style_ref]?.background_color !== undefined);
  const hasExplicitStroke = (node.style_override && node.style_override.stroke !== undefined) ||
                            (node.style_ref && doc.style_context?.component_styles?.[node.style_ref]?.stroke !== undefined);
  const hasExplicitBorderColor = (node.style_override && node.style_override.border_color !== undefined) ||
                                 (node.style_ref && doc.style_context?.component_styles?.[node.style_ref]?.border_color !== undefined);

  // 1. Text color vs Shape background
  if (resolvedStyle.fill) {
    if (node.type === 'text') {
      css += `  color: ${cssColor(resolvedStyle.fill)};\n`;
    } else if (hasExplicitFill) {
      css += `  background-color: ${cssColor(resolvedStyle.fill)};\n`;
    }
  }

  // 2. Explicit background color override
  if (hasExplicitBg && resolvedStyle.background_color) {
    css += `  background-color: ${cssColor(resolvedStyle.background_color)};\n`;
  }

  // 3. Borders / Strokes
  if (node.type !== 'text') {
    if (hasExplicitStroke && resolvedStyle.stroke) {
      const width = resolvedStyle.stroke_width ?? 1;
      css += `  border: ${width}px solid ${cssColor(resolvedStyle.stroke)};\n`;
    } else if (hasExplicitBorderColor && resolvedStyle.border_color) {
      const width = resolvedStyle.border_width ?? 1;
      css += `  border: ${width}px solid ${cssColor(resolvedStyle.border_color)};\n`;
    }
  }

  if (resolvedStyle.border_radius) {
    css += `  border-radius: ${resolvedStyle.border_radius}px;\n`;
  }

  // Typography styles
  if (resolvedStyle.font_family) {
    css += `  font-family: ${resolvedStyle.font_family};\n`;
  }
  if (resolvedStyle.font_size) {
    css += `  font-size: ${resolvedStyle.font_size}px;\n`;
  }
  if (resolvedStyle.font_weight) {
    css += `  font-weight: ${resolvedStyle.font_weight};\n`;
  }
  if (resolvedStyle.line_height) {
    css += `  line-height: ${resolvedStyle.line_height};\n`;
  }
  if (resolvedStyle.letter_spacing) {
    css += `  letter-spacing: ${resolvedStyle.letter_spacing}px;\n`;
  }

  css += `}\n`;
  return css;
}

export function renderWeb(
  doc: IRDocument,
  layouts: Record<string, ComputedLayout>
): { html: string; css: string; fullHtml: string } {
  let html = `<div id="ir-canvas">\n`;
  let css = `#ir-canvas {\n`;
  css += `  position: relative;\n`;
  css += `  width: ${doc.canvas.width === 'auto' ? '100%' : `${doc.canvas.width}px`};\n`;
  css += `  height: ${doc.canvas.height === 'auto' ? '100%' : `${doc.canvas.height}px`};\n`;
  css += `  overflow: hidden;\n`;
  css += `  background-color: #ffffff;\n`;
  css += `}\n\n`;

  const resolvedStyles = doc.style_context?.resolved || {};

  const processNodeHtml = (node: IRNode): string => {
    return renderNodeHtml(node, processNodeHtml);
  };

  const processNodeCss = (node: IRNode, parentLayout?: ComputedLayout) => {
    const layout = layouts[node.id];
    if (layout) {
      css += generateNodeCss(node, layout, parentLayout, resolvedStyles[node.id] || {}, doc);
    }
    if (node.children) {
      node.children.forEach((child) => processNodeCss(child, layout));
    }
  };

  // Generate HTML & CSS
  doc.objects.forEach((node) => {
    html += processNodeHtml(node) + '\n';
    processNodeCss(node);
  });

  html += `</div>`;

  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IR Render Output</title>
  <style>
    body {
      margin: 0;
      padding: 20px;
      background-color: #f0f2f5;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    ${css}
  </style>
</head>
<body>
  ${html}
</body>
</html>`;

  return { html, css, fullHtml };
}
