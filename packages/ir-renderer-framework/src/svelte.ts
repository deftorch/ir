import { IRDocument, IRNode } from 'ir-schema';
import { computeLayout, renderWeb } from 'ir-renderer-web';

function extractProps(doc: IRDocument): string[] {
  const propsSet = new Set<string>();
  function visit(node: IRNode) {
    if (node.bindings) {
      for (const val of Object.values(node.bindings)) {
        const match = val.match(/(?:props\.)?([a-zA-Z_$][a-zA-Z0-9_$]*)/);
        if (match) {
          propsSet.add(match[1]);
        }
      }
    }
    if (node.children) {
      node.children.forEach(visit);
    }
  }
  doc.objects.forEach(visit);
  return Array.from(propsSet);
}

function cleanPropExpr(expr: string): string {
  // Translate "props.myValue" to Svelte's local variable "myValue"
  const match = expr.match(/(?:props\.)?([a-zA-Z_$][a-zA-Z0-9_$]*)/);
  return match ? match[1] : expr;
}

export function renderSvelteComponent(doc: IRDocument): { code: string } {
  const layouts = computeLayout(doc);
  const webResult = renderWeb(doc, layouts);
  const propsList = extractProps(doc);

  function renderNodeSvelte(node: IRNode): string {
    const id = node.id;
    const type = node.type;
    const bindings = node.bindings || {};
    const className = `ir-node ir-${type}`;

    if (type === 'text') {
      const contentBinding = bindings.content || bindings.text;
      const innerContent = contentBinding
        ? `{${cleanPropExpr(contentBinding)}}`
        : node.properties.content || node.properties.text || '';
      return `  <div id="${id}" class="${className}">${innerContent}</div>`;
    }

    if (type === 'image') {
      const srcVal = bindings.src ? `{${cleanPropExpr(bindings.src)}}` : `"${node.properties.src || ''}"`;
      const altVal = bindings.alt ? `{${cleanPropExpr(bindings.alt)}}` : `"${node.properties.alt || ''}"`;
      return `  <img id="${id}" class="${className}" src=${srcVal} alt=${altVal} />`;
    }

    const childrenSvelte = node.children
      ? node.children.map((c) => renderNodeSvelte(c)).join('\n')
      : '';

    if (childrenSvelte) {
      return `  <div id="${id}" class="${className}">\n${childrenSvelte}\n  </div>`;
    } else {
      return `  <div id="${id}" class="${className}"></div>`;
    }
  }

  const rootNodesSvelte = doc.objects.map((node) => renderNodeSvelte(node)).join('\n');
  const scriptBlock = propsList.length > 0
    ? `<script>\n${propsList.map((p) => `  export let ${p} = '';`).join('\n')}\n</script>\n\n`
    : '';

  const code = `${scriptBlock}<div id="ir-canvas">
${rootNodesSvelte}
</div>

<style>
${webResult.css}
</style>
`;

  return { code };
}
