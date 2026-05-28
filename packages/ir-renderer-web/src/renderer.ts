import { IRDocument, IRNode } from 'ir-schema';
import { ComputedLayout } from './layout';

export function cssColor(val: any, colorToVarMap?: Map<string, string>): string {
  if (!val) return '';
  
  if (colorToVarMap) {
    let lookupKey = '';
    if (typeof val === 'string') {
      lookupKey = val.trim().toLowerCase();
    } else {
      lookupKey = cssColor(val).trim().toLowerCase();
    }
    if (colorToVarMap.has(lookupKey)) {
      return colorToVarMap.get(lookupKey)!;
    }
  }

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
    case 'shape': {
      const shapeType = node.properties?.shape_type || 'rect';
      if (shapeType === 'triangle') {
        return `<svg id="${node.id}" class="ir-node ir-shape ir-triangle" viewBox="0 0 100 100" preserveAspectRatio="none"><polygon points="50,0 100,100 0,100" fill="currentColor" /></svg>`;
      }
      if (shapeType === 'circle') {
        return `<div id="${node.id}" class="ir-node ir-shape ir-circle" style="border-radius: 50%;"></div>`;
      }
      return `<div id="${node.id}" class="ir-node ir-shape ir-rect"></div>`;
    }
    case 'frame':
    case 'group':
    default: {
      const childrenHtml = node.children ? node.children.map(renderChildren).join('\n') : '';
      return `<div id="${node.id}" class="ir-node ir-${type}">${childrenHtml}</div>`;
    }
  }
}

export function generateStateCss(
  nodeId: string,
  nodeType: string,
  stateName: string,
  stateOverride: any,
  doc: IRDocument,
  colorToVarMap?: Map<string, string>
): string {
  let css = `#${nodeId}:${stateName} {\n`;
  
  const findNode = (nodes: IRNode[]): IRNode | undefined => {
    for (const n of nodes) {
      if (n.id === nodeId) return n;
      if (n.children) {
        const found = findNode(n.children);
        if (found) return found;
      }
    }
    return undefined;
  };
  const targetNode = findNode(doc.objects);
  const isTriangle = targetNode?.type === 'shape' && targetNode.properties?.shape_type === 'triangle';

  if (stateOverride.fill) {
    if (nodeType === 'text' || isTriangle) {
      css += `  color: ${cssColor(stateOverride.fill, colorToVarMap)};\n`;
      if (isTriangle) {
        css += `  background-color: transparent;\n`;
      }
    } else {
      css += `  background-color: ${cssColor(stateOverride.fill, colorToVarMap)};\n`;
    }
  }
  if (stateOverride.background_color) {
    css += `  background-color: ${cssColor(stateOverride.background_color, colorToVarMap)};\n`;
  }
  if (nodeType !== 'text') {
    if (stateOverride.stroke) {
      const width = stateOverride.stroke_width ?? 1;
      css += `  border: ${width}px solid ${cssColor(stateOverride.stroke, colorToVarMap)};\n`;
    } else if (stateOverride.border_color) {
      const width = stateOverride.border_width ?? 1;
      css += `  border: ${width}px solid ${cssColor(stateOverride.border_color, colorToVarMap)};\n`;
    }
  }
  if (stateOverride.border_radius) {
    css += `  border-radius: ${stateOverride.border_radius}px;\n`;
  }
  if (stateOverride.opacity !== undefined) {
    css += `  opacity: ${stateOverride.opacity};\n`;
  }
  
  let transform = '';
  if (stateOverride.rotation !== undefined) {
    transform += `rotate(${stateOverride.rotation}deg) `;
  }
  if (stateOverride.scale !== undefined) {
    transform += `scale(${stateOverride.scale.x}, ${stateOverride.scale.y}) `;
  }
  if (transform) {
    css += `  transform: ${transform.trim()};\n`;
  }

  css += `}\n`;
  return css;
}

export function generateNodeCss(
  node: IRNode,
  layout: ComputedLayout,
  parentLayout: ComputedLayout | undefined,
  resolvedStyle: Record<string, any> = {},
  doc: IRDocument,
  colorToVarMap?: Map<string, string>,
  parentHasFlowLayout?: boolean
): string {
  const relX = parentLayout ? layout.x - parentLayout.x : layout.x;
  const relY = parentLayout ? layout.y - parentLayout.y : layout.y;

  let css = `#${node.id} {\n`;
  if (!parentHasFlowLayout) {
    css += `  position: absolute;\n`;
    css += `  left: ${relX}px;\n`;
    css += `  top: ${relY}px;\n`;
    css += `  width: ${layout.width}px;\n`;
    css += `  height: ${layout.height}px;\n`;
  } else {
    // Under flow layout, we only specify width/height if they are not 'auto'
    if (node.size.width !== 'auto') {
      css += `  width: ${layout.width}px;\n`;
    }
    if (node.size.height !== 'auto') {
      css += `  height: ${layout.height}px;\n`;
    }
  }
  
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

  // Transitions
  const transitionVal = resolvedStyle.transition || node.transition || (node.states ? 'all 0.2s ease' : undefined);
  if (transitionVal) {
    css += `  transition: ${transitionVal};\n`;
  }

  // Flexbox / Grid layout properties
  if (resolvedStyle.display) {
    css += `  display: ${resolvedStyle.display};\n`;
  }
  if (resolvedStyle.flex_direction) {
    css += `  flex-direction: ${resolvedStyle.flex_direction};\n`;
  }
  if (resolvedStyle.flex_wrap) {
    css += `  flex-wrap: ${resolvedStyle.flex_wrap};\n`;
  }
  if (resolvedStyle.justify_content) {
    css += `  justify-content: ${resolvedStyle.justify_content};\n`;
  }
  if (resolvedStyle.align_items) {
    css += `  align-items: ${resolvedStyle.align_items};\n`;
  }
  if (resolvedStyle.gap !== undefined) {
    css += `  gap: ${typeof resolvedStyle.gap === 'number' ? `${resolvedStyle.gap}px` : resolvedStyle.gap};\n`;
  }
  if (resolvedStyle.grid_template_columns) {
    css += `  grid-template-columns: ${resolvedStyle.grid_template_columns};\n`;
  }
  if (resolvedStyle.grid_template_rows) {
    css += `  grid-template-rows: ${resolvedStyle.grid_template_rows};\n`;
  }
  if (resolvedStyle.flex_grow !== undefined) {
    css += `  flex-grow: ${resolvedStyle.flex_grow};\n`;
  }
  if (resolvedStyle.flex_shrink !== undefined) {
    css += `  flex-shrink: ${resolvedStyle.flex_shrink};\n`;
  }
  if (resolvedStyle.flex_basis) {
    css += `  flex-basis: ${resolvedStyle.flex_basis};\n`;
  }
  if (resolvedStyle.align_self) {
    css += `  align-self: ${resolvedStyle.align_self};\n`;
  }
  if (resolvedStyle.justify_self) {
    css += `  justify-self: ${resolvedStyle.justify_self};\n`;
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
      css += `  color: ${cssColor(resolvedStyle.fill, colorToVarMap)};\n`;
    } else if (node.type === 'shape' && node.properties?.shape_type === 'triangle') {
      css += `  color: ${cssColor(resolvedStyle.fill, colorToVarMap)};\n`;
      css += `  background-color: transparent;\n`;
    } else if (node.type === 'shape' || hasExplicitFill) {
      css += `  background-color: ${cssColor(resolvedStyle.fill, colorToVarMap)};\n`;
    }
  }

  // 2. Explicit background color override
  if (hasExplicitBg && resolvedStyle.background_color) {
    css += `  background-color: ${cssColor(resolvedStyle.background_color, colorToVarMap)};\n`;
  }

  // 3. Borders / Strokes
  if (node.type !== 'text') {
    if (hasExplicitStroke && resolvedStyle.stroke) {
      const width = resolvedStyle.stroke_width ?? 1;
      css += `  border: ${width}px solid ${cssColor(resolvedStyle.stroke, colorToVarMap)};\n`;
    } else if (hasExplicitBorderColor && resolvedStyle.border_color) {
      const width = resolvedStyle.border_width ?? 1;
      css += `  border: ${width}px solid ${cssColor(resolvedStyle.border_color, colorToVarMap)};\n`;
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

  // Pseudo-class states
  if (node.states?.hover) {
    css += generateStateCss(node.id, node.type, 'hover', node.states.hover, doc, colorToVarMap);
  }
  if (node.states?.active) {
    css += generateStateCss(node.id, node.type, 'active', node.states.active, doc, colorToVarMap);
  }

  return css;
}

export function renderWeb(
  doc: IRDocument,
  layouts: Record<string, ComputedLayout>
): { html: string; css: string; fullHtml: string; traceId: string; c2paManifest?: string } {
  const themeColors = doc.style_context?.theme_tokens?.colors || {};
  const colorToVarMap = new Map<string, string>();
  
  let themeVarsCss = '';
  for (const [key, val] of Object.entries(themeColors)) {
    const varName = `--color-${key.replace(/_/g, '-')}`;
    const cssVal = cssColor(val);
    if (cssVal) {
      themeVarsCss += `  ${varName}: ${cssVal};\n`;
      const normalizeColorStr = (c: any): string => {
        if (typeof c === 'string') return c.trim().toLowerCase();
        return cssColor(c).trim().toLowerCase();
      };
      colorToVarMap.set(normalizeColorStr(val), `var(${varName})`);
    }
  }

  let html = `<div id="ir-canvas">\n`;
  let css = `#ir-canvas {\n`;
  css += `  position: relative;\n`;
  css += `  width: ${doc.canvas.width === 'auto' ? '100%' : `${doc.canvas.width}px`};\n`;
  css += `  height: ${doc.canvas.height === 'auto' ? '100%' : `${doc.canvas.height}px`};\n`;
  css += `  overflow: hidden;\n`;
  if (themeColors.background_color) {
    css += `  background-color: ${cssColor(themeColors.background_color, colorToVarMap)};\n`;
  } else {
    css += `  background-color: #ffffff;\n`;
  }
  if (themeVarsCss) {
    css += `\n  /* Theme Variables */\n${themeVarsCss}`;
  }
  css += `}\n\n`;

  const resolvedStyles = doc.style_context?.resolved || {};
  const mediaQueriesMap = new Map<string, string>();

  const processNodeHtml = (node: IRNode): string => {
    return renderNodeHtml(node, processNodeHtml);
  };

  const processNodeCss = (node: IRNode, parentLayout?: ComputedLayout, parentNode?: IRNode) => {
    const layout = layouts[node.id];
    const parentStyle = parentNode ? resolvedStyles[parentNode.id] || {} : {};
    const parentHasFlowLayout = parentStyle.display === 'flex' || parentStyle.display === 'grid';

    if (layout) {
      css += generateNodeCss(node, layout, parentLayout, resolvedStyles[node.id] || {}, doc, colorToVarMap, parentHasFlowLayout);
    }

    // Collect Media Overrides
    if (node.media_overrides) {
      for (const [query, styleOverride] of Object.entries(node.media_overrides)) {
        let queryCss = mediaQueriesMap.get(query) || '';
        
        queryCss += `#${node.id} {\n`;
        if (styleOverride.display) {
          queryCss += `  display: ${styleOverride.display};\n`;
        }
        if (styleOverride.width !== undefined) {
          queryCss += `  width: ${typeof styleOverride.width === 'number' ? `${styleOverride.width}px` : styleOverride.width};\n`;
        }
        if (styleOverride.height !== undefined) {
          queryCss += `  height: ${typeof styleOverride.height === 'number' ? `${styleOverride.height}px` : styleOverride.height};\n`;
        }
        if (styleOverride.position) {
          if (styleOverride.position.x !== undefined) queryCss += `  left: ${styleOverride.position.x}px;\n`;
          if (styleOverride.position.y !== undefined) queryCss += `  top: ${styleOverride.position.y}px;\n`;
        }
        if (styleOverride.fill) {
          if (node.type === 'text') {
            queryCss += `  color: ${cssColor(styleOverride.fill, colorToVarMap)};\n`;
          } else {
            queryCss += `  background-color: ${cssColor(styleOverride.fill, colorToVarMap)};\n`;
          }
        }
        if (styleOverride.background_color) {
          queryCss += `  background-color: ${cssColor(styleOverride.background_color, colorToVarMap)};\n`;
        }
        if (node.type !== 'text') {
          if (styleOverride.stroke) {
            const w = styleOverride.stroke_width ?? 1;
            queryCss += `  border: ${w}px solid ${cssColor(styleOverride.stroke, colorToVarMap)};\n`;
          } else if (styleOverride.border_color) {
            const w = styleOverride.border_width ?? 1;
            queryCss += `  border: ${w}px solid ${cssColor(styleOverride.border_color, colorToVarMap)};\n`;
          }
        }
        if (styleOverride.font_size) {
          queryCss += `  font-size: ${styleOverride.font_size}px;\n`;
        }
        if (styleOverride.flex_direction) {
          queryCss += `  flex-direction: ${styleOverride.flex_direction};\n`;
        }
        if (styleOverride.gap !== undefined) {
          queryCss += `  gap: ${typeof styleOverride.gap === 'number' ? `${styleOverride.gap}px` : styleOverride.gap};\n`;
        }
        queryCss += `}\n`;
        
        mediaQueriesMap.set(query, queryCss);
      }
    }

    if (node.children) {
      node.children.forEach((child) => processNodeCss(child, layout, node));
    }
  };

  // Generate HTML & CSS
  doc.objects.forEach((node) => {
    html += processNodeHtml(node) + '\n';
    processNodeCss(node);
  });

  html += `</div>`;

  // Append responsive media query blocks
  if (mediaQueriesMap.size > 0) {
    css += `\n/* Responsive Breakpoints */\n`;
    for (const [query, queryCss] of mediaQueriesMap.entries()) {
      css += `@media ${query} {\n${queryCss.split('\n').map(line => line ? `  ${line}` : '').join('\n')}}\n`;
    }
  }

  const traceId = `trace-${Math.random().toString(36).substring(2, 15)}-${Date.now()}`;
  let c2paManifest: string | undefined = undefined;
  let metadataHead = `  <meta name="ir-trace-id" content="${traceId}">\n`;

  if (doc.constraints?.c2pa_required) {
    const manifestObj = {
      "@context": "https://c2pa.org/schemas/v1",
      "@type": "Manifest",
      "claim": {
        "recorder": "IR Compiler Engine v0.1.0",
        "signature": "sha256-signed-claim-placeholder",
        "created": new Date().toISOString()
      }
    };
    c2paManifest = JSON.stringify(manifestObj, null, 2);
    metadataHead += `  <script type="application/c2pa+json">\n${c2paManifest.split('\n').map(line => `  ${line}`).join('\n')}\n  </script>\n`;
  }

  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IR Render Output</title>
${metadataHead}  <style>
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

  return { html, css, fullHtml, traceId, c2paManifest };
}
