export type IRDomain =
  | 'visual' // UI, web, social media, branding
  | 'image_edit' // photo editing, compositing
  | 'video' // video editing, motion
  | 'audio' // audio design, podcast
  | 'motion' // animation, Lottie, micro-interaction
  | 'print' // print — CMYK, bleed, DPI
  | 'signage' // environmental, large format
  | 'packaging' // packaging — 3D unfold
  | 'data_viz' // infographics, chart, dashboard
  | 'interactive' // game UI, interactive infographic
  | '3d'; // 3D scene, spatial

export type PlatformTarget =
  // Digital
  | 'web'
  | 'ios_native'
  | 'android_native'
  | 'flutter'
  // Social
  | 'instagram_feed'
  | 'instagram_story'
  | 'instagram_reel'
  | 'tiktok'
  | 'youtube_thumbnail'
  | 'youtube_shorts'
  | 'linkedin'
  | 'twitter_post'
  | 'pinterest'
  // Print
  | 'print_a4'
  | 'print_a3'
  | 'print_a5'
  | 'print_letter'
  | 'print_tabloid'
  // Large format
  | 'billboard_horizontal'
  | 'billboard_vertical'
  | 'rollup_banner'
  | 'xbanner'
  // Packaging
  | 'packaging_box'
  | 'packaging_pouch'
  | 'packaging_label'
  // Presentation
  | 'presentation_16_9'
  | 'presentation_4_3'
  // Custom
  | { type: 'custom'; width: number; height: number; unit: string };

export interface IRCanvas {
  width: number | 'auto';
  height: number | 'auto';
  platform: PlatformTarget;
  fps?: number;
  duration_ms?: number;
  sample_rate?: number;
  unit?: 'px' | 'mm' | 'cm' | 'in' | 'pt';
  dpi?: number;
  color_space?: 'sRGB' | 'CMYK' | 'P3' | 'Rec2020';
}

export type IRNodeType =
  | 'text'
  | 'image'
  | 'shape'
  | 'path'
  | 'group'
  | 'frame'
  | 'video_clip'
  | 'audio_track'
  | 'animation'
  | 'lottie'
  | 'particle_system'
  | 'shader_effect'
  | 'gradient'
  | 'blur_effect'
  | 'shadow_effect'
  | 'chart'
  | 'data_table'
  | 'map'
  | 'gauge'
  | 'mesh_3d'
  | 'light_3d'
  | 'camera_3d'
  | 'scene_3d'
  | 'button'
  | 'slider'
  | 'toggle'
  | 'hotspot'
  | 'form_field'
  | 'flex_container'
  | 'grid_container'
  | 'masonry_container'
  | string;

export interface StyleOverride {
  [key: string]: any;
}

export interface NodeProperties {
  [key: string]: any;
}

export interface IRComponentRef {
  ir_id: string;
  component_id: string;
  version: string;
  prop_overrides?: Record<string, any>;
  style_overrides?: StyleOverride;
}

export interface NodeDebugTrace {
  [key: string]: any;
}

export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity';

export interface IRNode {
  id: string;
  type: IRNodeType;
  position: { x: number; y: number; z?: number };
  size: { width: number | 'auto'; height: number | 'auto' };
  rotation: number;
  scale: { x: number; y: number };
  transform_origin?: { x: number; y: number };
  opacity: number;
  visible: boolean;
  locked: boolean;
  z_index?: number;
  blend_mode?: BlendMode;
  stacking_context?: boolean;
  style_ref?: string;
  style_override?: StyleOverride;
  properties: NodeProperties;
  children?: IRNode[];
  component_ref?: IRComponentRef;
  renderer?: string;
  brand_tokens?: string[];
  x_debug_trace?: NodeDebugTrace;
}

export interface IRSemanticRule {
  id: string;
  scope: 'object' | 'parent_child' | 'siblings' | 'document';
  condition: string;
  violation: 'error' | 'warning' | 'info';
  message: string;
  auto_fix?: string;
}

export interface IRLayoutConstraint {
  id: string;
  type: 'pin' | 'align' | 'distribute' | 'aspect_ratio' | 'min_size';
  targets: string[];
  params: Record<string, any>;
}

export interface IRConstraintSet {
  brand_profile_id?: string;
  wcag_level?: 'A' | 'AA' | 'AAA';
  c2pa_required?: boolean;
  max_file_size_kb?: number;
  max_objects?: number;
  semantic_rules: IRSemanticRule[];
  layout_constraints: IRLayoutConstraint[];
}

export interface ShadowDef {
  [key: string]: any;
}

export interface EasingDef {
  type: 'cubic_bezier' | 'spring' | 'steps';
  params: number[];
}

export type ColorValue =
  | string
  | 'brand://primary'
  | 'theme://colors.primary'
  | { r: number; g: number; b: number; a: number }
  | { c: number; m: number; y: number; k: number };

export interface DesignTokenMap {
  colors: Record<string, ColorValue>;
  typography: {
    families: Record<string, string>;
    sizes: Record<string, number>;
    weights: Record<string, number>;
    line_heights: Record<string, number>;
    spacings: Record<string, number>;
  };
  spacing: Record<string, number>;
  radii: Record<string, number>;
  shadows: Record<string, ShadowDef>;
  easings: Record<string, EasingDef>;
  durations: Record<string, number>;
  [key: string]: any;
}

export interface IRStyleContext {
  theme_tokens: DesignTokenMap;
  component_styles: Record<string, StyleOverride>;
  object_overrides: Record<string, StyleOverride>;
}

export interface IRError {
  code: string;
  message: string;
  path: string;
  severity: 'error' | 'warning' | 'info';
}

export interface IRDocument {
  meta: {
    schema_version: '2.0';
    ir_version: string;
    ir_id: string;
    created_at: string;
    created_by: 'human' | 'ai_agent' | 'fork' | 'import';
    domain: IRDomain;
    session_id: string;
    parent_ir_id?: string;
    component_id?: string;
  };
  canvas: IRCanvas;
  style_context: IRStyleContext;
  objects: IRNode[];
  constraints: IRConstraintSet;
  timeline?: any;
  data_bindings?: any[];
  interaction_model?: any;
  dependencies?: any;
  physical?: any;
  x_debug?: any;
  x_visual_constraints?: any;
}
