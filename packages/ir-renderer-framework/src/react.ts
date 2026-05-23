import { IRDocument, IRNode } from 'ir-schema';
import { computeLayout, renderWeb } from 'ir-renderer-web';

export function renderReactComponent(
  doc: IRDocument,
  componentName: string
): { code: string; css: string } {
  const layouts = computeLayout(doc);
  const webResult = renderWeb(doc, layouts);

  function renderNodeJSX(node: IRNode): string {
    const id = node.id;
    const type = node.type;
    const bindings = node.bindings || {};
    const className = `ir-node ir-${type}`;

    if (type === 'text') {
      const contentBinding = bindings.content || bindings.text;
      const innerContent = contentBinding
        ? `{${contentBinding}}`
        : node.properties.content || node.properties.text || '';
      return `      <div id="${id}" className="${className}">${innerContent}</div>`;
    }

    if (type === 'image') {
      const srcVal = bindings.src ? `{${bindings.src}}` : `"${node.properties.src || ''}"`;
      const altVal = bindings.alt ? `{${bindings.alt}}` : `"${node.properties.alt || ''}"`;
      return `      <img id="${id}" className="${className}" src=${srcVal} alt=${altVal} />`;
    }

    // Default container types: shape, frame, group, etc.
    const childrenJSX = node.children
      ? node.children.map((c) => renderNodeJSX(c)).join('\n')
      : '';
    
    if (childrenJSX) {
      return `      <div id="${id}" className="${className}">\n${childrenJSX}\n      </div>`;
    } else {
      return `      <div id="${id}" className="${className}"></div>`;
    }
  }

  const rootNodesJSX = doc.objects.map((node) => renderNodeJSX(node)).join('\n');

  const code = `import React from 'react';

export function ${componentName}(props: any) {
  return (
    <div id="ir-canvas">
${rootNodesJSX}
    </div>
  );
}
`;

  return {
    code,
    css: webResult.css
  };
}
