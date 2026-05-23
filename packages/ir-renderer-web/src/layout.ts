import { IRDocument, IRNode } from 'ir-schema';

export interface ComputedLayout {
  width: number;
  height: number;
  x: number;
  y: number;
}

export function computeLayout(doc: IRDocument): Record<string, ComputedLayout> {
  const layouts: Record<string, ComputedLayout> = {};

  const traverse = (node: IRNode, parentX: number, parentY: number) => {
    let width = node.size.width;
    let height = node.size.height;

    const x = parentX + node.position.x;
    const y = parentY + node.position.y;

    // Pre-calculate children first in case this group is auto-sized
    if (node.children && node.children.length > 0) {
      node.children.forEach((child) => {
        traverse(child, x, y);
      });
    }

    if (node.type === 'text') {
      const fontSize = node.style_override?.font_size ?? 16;
      const content = node.properties.content || node.properties.text || '';
      const charWidth = fontSize * 0.6;
      const lineHeight = fontSize * 1.2;

      if (width === 'auto') {
        width = Math.max(content.length * charWidth, 10);
      }
      if (height === 'auto') {
        const maxCharsPerLine = typeof width === 'number' ? Math.floor(width / charWidth) : 50;
        const lines = Math.ceil(content.length / Math.max(maxCharsPerLine, 1));
        height = Math.max(lines, 1) * lineHeight;
      }
    } else if (node.type === 'group' || node.type === 'frame') {
      if ((width === 'auto' || height === 'auto') && node.children && node.children.length > 0) {
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;

        node.children.forEach((child) => {
          const childLayout = layouts[child.id];
          if (childLayout) {
            const relX = childLayout.x - x;
            const relY = childLayout.y - y;
            minX = Math.min(minX, relX);
            maxX = Math.max(maxX, relX + childLayout.width);
            minY = Math.min(minY, relY);
            maxY = Math.max(maxY, relY + childLayout.height);
          }
        });

        if (minX === Infinity) {
          minX = 0; maxX = 0; minY = 0; maxY = 0;
        }

        if (width === 'auto') width = maxX - minX;
        if (height === 'auto') height = maxY - minY;
      }
    }

    if (width === 'auto') width = 100;
    if (height === 'auto') height = 100;

    layouts[node.id] = {
      width: width as number,
      height: height as number,
      x,
      y
    };
  };

  doc.objects.forEach((node) => {
    traverse(node, 0, 0);
  });

  return layouts;
}
