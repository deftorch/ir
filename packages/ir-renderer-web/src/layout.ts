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

  // Apply layout constraints
  if (doc.constraints && doc.constraints.layout_constraints) {
    const sizeConstraints = doc.constraints.layout_constraints.filter(
      (c) => c.type === 'min_size' || c.type === 'aspect_ratio'
    );
    const posConstraints = doc.constraints.layout_constraints.filter(
      (c) => c.type === 'align' || c.type === 'pin' || c.type === 'distribute'
    );

    const executeConstraint = (constraint: any) => {
      const { type, targets, params } = constraint;
      if (!targets || targets.length === 0) return;

      switch (type) {
        case 'min_size': {
          targets.forEach((targetId: string) => {
            const layout = layouts[targetId];
            if (layout) {
              if (typeof params.width === 'number' && layout.width < params.width) {
                layout.width = params.width;
              }
              if (typeof params.height === 'number' && layout.height < params.height) {
                layout.height = params.height;
              }
            }
          });
          break;
        }

        case 'aspect_ratio': {
          const ratio = params.ratio;
          if (typeof ratio === 'number' && ratio > 0) {
            targets.forEach((targetId: string) => {
              const layout = layouts[targetId];
              if (layout) {
                layout.height = layout.width / ratio;
              }
            });
          }
          break;
        }

        case 'align': {
          const anchorId = targets[0];
          const anchorLayout = layouts[anchorId];
          if (!anchorLayout) return;

          const edge = params.edge || 'left';
          for (let i = 1; i < targets.length; i++) {
            const targetId = targets[i];
            const targetLayout = layouts[targetId];
            if (targetLayout) {
              if (edge === 'left') {
                targetLayout.x = anchorLayout.x;
              } else if (edge === 'right') {
                targetLayout.x = anchorLayout.x + anchorLayout.width - targetLayout.width;
              } else if (edge === 'top') {
                targetLayout.y = anchorLayout.y;
              } else if (edge === 'bottom') {
                targetLayout.y = anchorLayout.y + anchorLayout.height - targetLayout.height;
              } else if (edge === 'center_x') {
                targetLayout.x = anchorLayout.x + (anchorLayout.width - targetLayout.width) / 2;
              } else if (edge === 'center_y') {
                targetLayout.y = anchorLayout.y + (anchorLayout.height - targetLayout.height) / 2;
              }
            }
          }
          break;
        }

        case 'pin': {
          const childId = targets[0];
          const parentId = targets[1];
          const childLayout = layouts[childId];
          const parentLayout = layouts[parentId];
          if (!childLayout || !parentLayout) return;

          const edge = params.edge || 'left';
          const value = params.value || 0;

          if (edge === 'left') {
            childLayout.x = parentLayout.x + value;
          } else if (edge === 'right') {
            childLayout.x = parentLayout.x + parentLayout.width - childLayout.width - value;
          } else if (edge === 'top') {
            childLayout.y = parentLayout.y + value;
          } else if (edge === 'bottom') {
            childLayout.y = parentLayout.y + parentLayout.height - childLayout.height - value;
          }
          break;
        }

        case 'distribute': {
          const direction = params.direction || 'horizontal';
          const gap = params.gap;

          const targetLayouts = targets
            .map((id: string) => ({ id, layout: layouts[id] }))
            .filter((t: { id: string; layout: ComputedLayout | undefined }) => t.layout !== undefined) as { id: string; layout: ComputedLayout }[];

          if (targetLayouts.length < 2) return;

          if (direction === 'horizontal') {
            targetLayouts.sort((a, b) => a.layout.x - b.layout.x);

            if (typeof gap === 'number') {
              let currentX = targetLayouts[0].layout.x;
              for (let i = 1; i < targetLayouts.length; i++) {
                currentX += targetLayouts[i - 1].layout.width + gap;
                targetLayouts[i].layout.x = currentX;
              }
            } else {
              const firstLayout = targetLayouts[0].layout;
              const lastLayout = targetLayouts[targetLayouts.length - 1].layout;
              const totalSpan = lastLayout.x - firstLayout.x;
              const totalWidths = targetLayouts.slice(0, -1).reduce((acc: number, t: { id: string; layout: ComputedLayout }) => acc + t.layout.width, 0);
              const remainingSpace = totalSpan - totalWidths;
              const computedGap = remainingSpace / (targetLayouts.length - 1);

              let currentX = firstLayout.x;
              for (let i = 1; i < targetLayouts.length - 1; i++) {
                currentX += targetLayouts[i - 1].layout.width + computedGap;
                targetLayouts[i].layout.x = currentX;
              }
            }
          } else {
            targetLayouts.sort((a, b) => a.layout.y - b.layout.y);

            if (typeof gap === 'number') {
              let currentY = targetLayouts[0].layout.y;
              for (let i = 1; i < targetLayouts.length; i++) {
                currentY += targetLayouts[i - 1].layout.height + gap;
                targetLayouts[i].layout.y = currentY;
              }
            } else {
              const firstLayout = targetLayouts[0].layout;
              const lastLayout = targetLayouts[targetLayouts.length - 1].layout;
              const totalSpan = lastLayout.y - firstLayout.y;
              const totalHeights = targetLayouts.slice(0, -1).reduce((acc: number, t: { id: string; layout: ComputedLayout }) => acc + t.layout.height, 0);
              const remainingSpace = totalSpan - totalHeights;
              const computedGap = remainingSpace / (targetLayouts.length - 1);

              let currentY = firstLayout.y;
              for (let i = 1; i < targetLayouts.length - 1; i++) {
                currentY += targetLayouts[i - 1].layout.height + computedGap;
                targetLayouts[i].layout.y = currentY;
              }
            }
          }
          break;
        }
      }
    };

    // Pass 1: Size constraints first
    sizeConstraints.forEach(executeConstraint);

    // Pass 2: Position constraints second
    posConstraints.forEach(executeConstraint);
  }

  return layouts;
}
