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
  const match = expr.match(/(?:props\.)?([a-zA-Z_$][a-zA-Z0-9_$]*)/);
  return match ? match[1] : expr;
}

export function renderVueComponent(doc: IRDocument): { code: string } {
  const layouts = computeLayout(doc);
  const webResult = renderWeb(doc, layouts);
  const propsList = extractProps(doc);

  function renderNodeVue(node: IRNode): string {
    const id = node.id;
    const type = node.type;
    const bindings = node.bindings || {};
    const className = `ir-node ir-${type}`;

    if (type === 'text') {
      const contentBinding = bindings.content || bindings.text;
      const innerContent = contentBinding
        ? `{{ ${cleanPropExpr(contentBinding)} }}`
        : node.properties.content || node.properties.text || '';
      return `    <div id="${id}" class="${className}">${innerContent}</div>`;
    }

    if (type === 'image') {
      const srcAttr = bindings.src ? `:src="${cleanPropExpr(bindings.src)}"` : `src="${node.properties.src || ''}"`;
      const altAttr = bindings.alt ? `:alt="${cleanPropExpr(bindings.alt)}"` : `alt="${node.properties.alt || ''}"`;
      return `    <img id="${id}" class="${className}" ${srcAttr} ${altAttr} />`;
    }

    const childrenVue = node.children
      ? node.children.map((c) => renderNodeVue(c)).join('\n')
      : '';

    if (childrenVue) {
      return `    <div id="${id}" class="${className}">\n${childrenVue}\n    </div>`;
    } else {
      return `    <div id="${id}" class="${className}"></div>`;
    }
  }

  const rootNodesVue = doc.objects.map((node) => renderNodeVue(node)).join('\n');
  const scriptBlock = propsList.length > 0
    ? `<script setup>\ndefineProps({\n${propsList.map((p) => `  ${p}: {\n    type: String,\n    default: ''\n  }`).join(',\n')}\n})\n</script>\n\n`
    : '';

  const code = `${scriptBlock}<template>
  <div id="ir-canvas">
${rootNodesVue}
  </div>
</template>

<style scoped>
${webResult.css}
</style>
`;

  return { code };
}
