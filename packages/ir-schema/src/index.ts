import crypto from 'crypto';
import canvasSchema from './schemas/canvas.json';
import nodeSchema from './schemas/node.json';
import constraintSetSchema from './schemas/constraint_set.json';
import documentSchema from './schemas/document.json';
import {
  IRDocument,
  IRCanvas,
  IRNode,
  IRConstraintSet,
  IRStyleContext,
  IRDomain,
  PlatformTarget,
  IRNodeType
} from './types';

export * from './types';

export const schemas = {
  canvas: canvasSchema,
  node: nodeSchema,
  constraintSet: constraintSetSchema,
  document: documentSchema
};

export function generateUUID(): string {
  // Uses Node's standard crypto.randomUUID
  return crypto.randomUUID();
}

export function createIRCanvas(params: Partial<IRCanvas> & { platform: PlatformTarget }): IRCanvas {
  return {
    width: params.width ?? 'auto',
    height: params.height ?? 'auto',
    platform: params.platform,
    fps: params.fps,
    duration_ms: params.duration_ms,
    sample_rate: params.sample_rate,
    unit: params.unit,
    dpi: params.dpi,
    color_space: params.color_space
  };
}

export function createIRNode(params: Partial<IRNode> & { type: IRNodeType }): IRNode {
  return {
    id: params.id ?? generateUUID(),
    type: params.type,
    position: params.position ?? { x: 0, y: 0 },
    size: params.size ?? { width: 'auto', height: 'auto' },
    rotation: params.rotation ?? 0,
    scale: params.scale ?? { x: 1, y: 1 },
    transform_origin: params.transform_origin,
    opacity: params.opacity ?? 1.0,
    visible: params.visible ?? true,
    locked: params.locked ?? false,
    z_index: params.z_index,
    blend_mode: params.blend_mode,
    stacking_context: params.stacking_context,
    style_ref: params.style_ref,
    style_override: params.style_override,
    properties: params.properties ?? {},
    children: params.children,
    component_ref: params.component_ref,
    renderer: params.renderer,
    brand_tokens: params.brand_tokens,
    x_debug_trace: params.x_debug_trace
  };
}

export function createIRConstraintSet(params: Partial<IRConstraintSet> = {}): IRConstraintSet {
  return {
    brand_profile_id: params.brand_profile_id,
    wcag_level: params.wcag_level,
    c2pa_required: params.c2pa_required,
    max_file_size_kb: params.max_file_size_kb,
    max_objects: params.max_objects,
    semantic_rules: params.semantic_rules ?? [],
    layout_constraints: params.layout_constraints ?? []
  };
}

export function createIRStyleContext(params: Partial<IRStyleContext> = {}): IRStyleContext {
  return {
    theme_tokens: params.theme_tokens ?? {
      colors: {},
      typography: {
        families: {},
        sizes: {},
        weights: {},
        line_heights: {},
        spacings: {}
      },
      spacing: {},
      radii: {},
      shadows: {},
      easings: {},
      durations: {}
    },
    component_styles: params.component_styles ?? {},
    object_overrides: params.object_overrides ?? {},
    resolved: params.resolved
  };
}

export function createIRDocument(params: {
  domain: IRDomain;
  session_id: string;
  canvas: IRCanvas;
  ir_version?: string;
  created_by?: 'human' | 'ai_agent' | 'fork' | 'import';
  parent_ir_id?: string;
  component_id?: string;
  style_context?: Partial<IRStyleContext>;
  objects?: IRNode[];
  constraints?: Partial<IRConstraintSet>;
}): IRDocument {
  return {
    meta: {
      schema_version: '2.0',
      ir_version: params.ir_version ?? '1.0.0',
      ir_id: generateUUID(),
      created_at: new Date().toISOString(),
      created_by: params.created_by ?? 'human',
      domain: params.domain,
      session_id: params.session_id,
      parent_ir_id: params.parent_ir_id,
      component_id: params.component_id
    },
    canvas: params.canvas,
    style_context: createIRStyleContext(params.style_context),
    objects: params.objects ?? [],
    constraints: createIRConstraintSet(params.constraints)
  };
}
