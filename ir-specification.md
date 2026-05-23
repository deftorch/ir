
# IR Specification — Visual Design & Multimedia System DSL
### Synthesized from: Domain Analysis · IR Strategy Discussion · Genesis Design Document

---


## Philosophy & Core Principles

IR is not just "what to render". IR is a **formal contract** that defines everything the system can represent — content, capabilities, constraints, relationships, time, interaction, and change history.

**Five foundational principles:**

1. **IR as the Single Source of Truth** — all surfaces read and write to the same IR. No synchronization needed because consistency is a structural property.
2. **Code over Pixels** — IR is code that produces visuals. Every output can be inspected, modified, versioned, and forked.
3. **Multi-Level, One Contract** — HIR, MIR, LIR are transformation layers of a single contract. The HIR schema is the ground truth.
4. **Graceful Degradation over Silent Failure** — every failure path is defined. Invalid IR never reaches the renderer.
5. **Domain-Aware, Platform-Agnostic** — IR knows the domain (visual, video, audio, print) but not how to render. The renderer holds platform knowledge.

---


## Three-Level IR Architecture

```
DSL Source (Natural Language / Code / Canvas Action)
             ↓
┌────────────────────────────────────────────────────┐
│  HIR — High-level IR (Semantic / Intent Level)     │
│  • Media-agnostic                                   │
│  • Style-agnostic                                   │
│  • Declarative: "WHAT", not "HOW"                  │
│  • Validated by AJV before entering MIR             │
└──────────────────────┬─────────────────────────────┘
                       ↓  [Compilation Passes]
┌────────────────────────────────────────────────────┐
│  MIR — Mid-level IR (Resolved / Normalized)        │
│  • Style cascade resolved                           │
│  • Brand constraints applied                        │
│  • Platform constraints applied                     │
│  • Layout computed                                  │
│  • Media format selected                            │
│  • Temporal sync contracts resolved                 │
└──────────────────────┬─────────────────────────────┘
                       ↓  [Renderer Dispatch]
┌────────────────────────────────────────────────────┐
│  LIR — Low-level IR (Platform-Specific)            │
│  • Web: DOM instructions + CSS                      │
│  • Print: PostScript / PDF draw commands            │
│  • Video: FFmpeg filter graph                       │
│  • Mobile: Skia / Core Graphics calls               │
│  • Motion: Keyframe arrays + easing curves          │
└──────────────────────┬─────────────────────────────┘
                       ↓
         Backends: Web · Print · Video · Mobile · Audio
```

---


## HIR — Complete Schema Specification


### 1. IRDocument — Root

```typescript
interface IRDocument {

  // ── METADATA ─────────────────────────────────────────────────
  meta: {
    schema_version  : "2.0";          // STABLE — frozen
    ir_version      : string;         // document semver
    ir_id           : string;         // immutable UUID
    created_at      : string;         // ISO 8601
    created_by      : "human" | "ai_agent" | "fork" | "import";
    domain          : IRDomain;
    session_id      : string;
    parent_ir_id?   : string;         // for fork and branching
    component_id?   : string;         // if this is an IR component library
  };

  // ── CANVAS ───────────────────────────────────────────────────
  canvas: IRCanvas;

  // ── STYLE SYSTEM ─────────────────────────────────────────────
  // Style cascade — new, not in Genesis
  style_context: IRStyleContext;

  // ── SCENE TREE ───────────────────────────────────────────────
  objects: IRNode[];

  // ── CONSTRAINTS ──────────────────────────────────────────────
  constraints: IRConstraintSet;

  // ── TEMPORAL MODEL ───────────────────────────────────────────
  // Only for domain: video, audio, motion
  timeline?: IRTimeline;

  // ── RUNTIME BINDINGS ─────────────────────────────────────────
  // For data-driven content (Genesis Data app)
  data_bindings?: IRDataBinding[];

  // ── INTERACTION MODEL ─────────────────────────────────────────
  // For interactive content
  interaction_model?: IRInteractionModel;

  // ── CROSS-IR REFERENCES ──────────────────────────────────────
  // Component library references
  dependencies?: IRDependencyGraph;

  // ── PHYSICAL OUTPUT ──────────────────────────────────────────
  // Only for domain: print, signage, packaging
  physical?: IRPhysicalSpec;

  // ── EXPERIMENTAL ─────────────────────────────────────────────
  x_debug?          : IRDebugAnnotations;
  x_visual_constraints?: IRVisualConstraintExtension;
}

type IRDomain =
  | "visual"          // UI, web, social media, branding
  | "image_edit"      // photo editing, compositing
  | "video"           // video editing, motion
  | "audio"           // audio design, podcast
  | "motion"          // animation, Lottie, micro-interaction
  | "print"           // print — CMYK, bleed, DPI
  | "signage"         // environmental, large format
  | "packaging"       // packaging — 3D unfold
  | "data_viz"        // infographics, chart, dashboard
  | "interactive"     // game UI, interactive infographic
  | "3d";             // 3D scene, spatial
```

### 2. IRCanvas — Definisi Ruang

```typescript
interface IRCanvas {
  // Dimensi
  width    : number | "auto";
  height   : number | "auto";

  // Platform target — menentukan constraint rendering
  platform : PlatformTarget;

  // Video / motion properties
  fps?         : number;
  duration_ms? : number;
  sample_rate? : number;   // untuk audio domain

  // Physical output properties (jika domain print/signage)
  unit?        : "px" | "mm" | "cm" | "in" | "pt";
  dpi?         : number;
  color_space? : "sRGB" | "CMYK" | "P3" | "Rec2020";
}

type PlatformTarget =
  // Digital
  | "web"
  | "ios_native" | "android_native" | "flutter"
  // Social
  | "instagram_feed" | "instagram_story" | "instagram_reel"
  | "tiktok" | "youtube_thumbnail" | "youtube_shorts"
  | "linkedin" | "twitter_post" | "pinterest"
  // Print
  | "print_a4" | "print_a3" | "print_a5"
  | "print_letter" | "print_tabloid"
  // Large format
  | "billboard_horizontal" | "billboard_vertical"
  | "rollup_banner" | "xbanner"
  // Packaging
  | "packaging_box" | "packaging_pouch" | "packaging_label"
  // Presentation
  | "presentation_16_9" | "presentation_4_3"
  // Custom
  | { type: "custom"; width: number; height: number; unit: string };
```

### 3. IRStyleContext — Style Cascade System

Ini adalah penambahan kritis yang tidak ada di Genesis. Menyelesaikan masalah
di mana perubahan brand token harus patch ribuan object secara individual.

```typescript
interface IRStyleContext {
  // Level 1 — paling umum, di-override oleh level di bawahnya
  theme_tokens: DesignTokenMap;

  // Level 2 — style per komponen/grup
  component_styles: Record<string, StyleOverride>;

  // Level 3 — style per object (sudah ada di Genesis, tapi sekarang
  // eksplisit sebagai bagian dari cascade)
  object_overrides: Record<string, StyleOverride>;

  // Aturan cascade: object > component > theme
  // Perubahan di theme_tokens → otomatis semua object yang
  // tidak punya override akan mengikuti
}

interface DesignTokenMap {
  // Color tokens
  colors: Record<string, ColorValue>;

  // Typography tokens
  typography: {
    families : Record<string, string>;
    sizes    : Record<string, number>;
    weights  : Record<string, number>;
    line_heights: Record<string, number>;
    spacings : Record<string, number>;
  };

  // Spacing tokens
  spacing  : Record<string, number>;

  // Border radius tokens
  radii    : Record<string, number>;

  // Shadow tokens
  shadows  : Record<string, ShadowDef>;

  // Motion tokens
  easings  : Record<string, EasingDef>;
  durations: Record<string, number>;

  // Custom tokens (extensible)
  [key: string]: unknown;
}

// ColorValue mendukung 4 format (dari Genesis + extended)
type ColorValue =
  | string              // "#FF5733"
  | "brand://primary"   // brand token reference
  | "theme://colors.primary" // theme token reference
  | { r: number; g: number; b: number; a: number }  // RGBA object
  | { c: number; m: number; y: number; k: number }; // CMYK untuk print
```

### 4. IRNode — Node Tree

```typescript
interface IRNode {
  id        : string;
  type      : IRNodeType;

  // Transform
  position  : { x: number; y: number; z?: number };
  size      : { width: number | "auto"; height: number | "auto" };
  rotation  : number;         // degrees
  scale     : { x: number; y: number };
  transform_origin?: { x: number; y: number };

  // Visibility
  opacity   : number;         // 0.0–1.0
  visible   : boolean;
  locked    : boolean;

  // Stacking — formal z-ordering
  z_index?  : number;
  blend_mode?: BlendMode;
  stacking_context?: boolean;

  // Style — referensi ke cascade system
  style_ref?: string;         // ID dari component_styles
  // Override langsung (level 3 dari cascade)
  style_override?: StyleOverride;

  // Properties spesifik per type (tagged union via JSON Schema if/then)
  properties: NodeProperties;

  // Children (untuk group, frame, component)
  children? : IRNode[];

  // Component reference (cross-IR)
  component_ref?: IRComponentRef;

  // Renderer override (dari Genesis)
  renderer? : string;

  // Brand tokens yang dipakai (dari Genesis)
  brand_tokens?: string[];

  // Debug annotation — diisi saat compile
  x_debug_trace?: NodeDebugTrace;
}

type IRNodeType =
  // Primitif visual
  | "text" | "image" | "shape" | "path" | "group" | "frame"
  // Media
  | "video_clip" | "audio_track" | "animation" | "lottie"
  // Advanced visual
  | "particle_system" | "shader_effect" | "gradient"
  | "blur_effect" | "shadow_effect"
  // Data viz
  | "chart" | "data_table" | "map" | "gauge"
  // 3D
  | "mesh_3d" | "light_3d" | "camera_3d" | "scene_3d"
  // Interaksi
  | "button" | "slider" | "toggle" | "hotspot" | "form_field"
  // Layout
  | "flex_container" | "grid_container" | "masonry_container"
  // Tool-generated (dari Tool Creation Agent)
  | string;
```

### 5. IRConstraintSet — Sistem Constraint

```typescript
interface IRConstraintSet {
  // Brand compliance (dari Genesis)
  brand_profile_id? : string;

  // Accessibility
  wcag_level?       : "A" | "AA" | "AAA";

  // Content authenticity (EU AI Act)
  c2pa_required?    : boolean;

  // Output limits
  max_file_size_kb? : number;
  max_objects?      : number;

  // Semantic constraints — BARU, tidak ada di Genesis awal
  // Validasi relational antar objects (melampaui JSON Schema)
  semantic_rules    : IRSemanticRule[];

  // Layout constraints
  layout_constraints: IRLayoutConstraint[];
}

interface IRSemanticRule {
  id        : string;
  scope     : "object" | "parent_child" | "siblings" | "document";
  condition : string;   // DSL expression
  // Contoh: "text.fill.contrast_with(parent.fill) >= 4.5"
  // Contoh: "image.width / image.height == canvas.aspect_ratio"
  violation : "error" | "warning" | "info";
  message   : string;
  auto_fix? : string;   // DSL expression untuk auto-fix
}

interface IRLayoutConstraint {
  id      : string;
  type    : "pin" | "align" | "distribute" | "aspect_ratio" | "min_size";
  targets : string[];   // object IDs
  params  : Record<string, unknown>;
}
```

### 6. IRTimeline — Model Temporal untuk Time-Based Media

Ini adalah penambahan major. Genesis punya Video IR tapi belum ada formal
synchronization contract antar track.

```typescript
interface IRTimeline {
  total_duration_ms  : number;
  time_unit          : "ms" | "frames" | "beats";
  bpm?               : number;   // untuk beat-based sync (audio/motion)

  // Track layers — bisa campur video, audio, animasi
  layers: IRTimelineLayer[];

  // Synchronization contracts — BARU
  sync_contracts: IRSyncContract[];

  // Global keyframes (untuk semua layer)
  global_markers: IRTimeMarker[];
}

interface IRTimelineLayer {
  layer_id    : string;
  layer_type  : "video" | "audio" | "animation" | "effect" | "text";
  object_ref  : string;         // ID IRNode
  start_ms    : number;
  end_ms      : number;
  keyframes   : IRKeyframe[];
  transitions : IRTransition[];
  effects     : IREffect[];
  muted?      : boolean;
  solo?       : boolean;
  volume?     : number;         // 0.0–1.0 untuk audio layer
}

// Synchronization Contract — menyelesaikan gap di Genesis
interface IRSyncContract {
  id              : string;
  primary_track   : string;    // track yang jadi master reference
  secondary_tracks: string[];  // track yang mengikuti primary

  anchor_type: "absolute"       // sync ke timeline absolute
             | "relative_to"    // offset dari primary
             | "beat_sync"      // sync ke BPM
             | "event_trigger"; // sync ke event di primary track

  // Apa yang terjadi kalau renderer terlambat?
  underrun_policy: "pause_all"    // pause semua track
                 | "drop_frame"   // skip frame, jangan pause audio
                 | "stretch";     // stretch secondary untuk catch-up

  drift_tolerance_ms: number;    // berapa ms desync masih diterima
}

interface IRKeyframe {
  time_ms   : number;
  property  : string;           // path ke property, e.g. "opacity"
  value     : unknown;
  easing    : EasingType | EasingDef;
}

type EasingType =
  | "linear" | "ease" | "ease_in" | "ease_out" | "ease_in_out"
  | "spring" | "bounce" | "step_start" | "step_end";

interface EasingDef {
  type    : "cubic_bezier" | "spring" | "steps";
  params  : number[];
}
```

### 7. IRDataBinding — Runtime Data untuk Data-Driven Content

```typescript
interface IRDataBinding {
  id           : string;
  target_path  : string;    // path ke property di IRNode tree
  // Contoh: "objects[id=chart-001].properties.data_points"

  source: {
    type    : "static"       // nilai tidak berubah (default)
            | "api_endpoint" // fetch dari URL
            | "mcp_tool"     // panggil MCP tool
            | "user_input"   // input dari user saat runtime
            | "formula";     // computed dari binding lain

    ref     : string;        // URL, tool name, input ID, atau formula
    refresh : "once" | "interval" | "on_event" | "reactive";
    refresh_interval_ms?: number;
    event_trigger?: string;
  };

  // Transform pipeline — dijalankan sebelum binding ke target
  transforms: Array<{
    op    : "filter" | "sort" | "aggregate" | "format" | "map";
    params: Record<string, unknown>;
  }>;

  // Fallback jika source unavailable
  fallback_value?: unknown;
  error_behavior : "use_fallback" | "hide_object" | "show_error";
}
```

### 8. IRInteractionModel — State Machine untuk Interactive Content

```typescript
interface IRInteractionModel {
  // Global state store
  store: Record<string, unknown>;

  // State machines per interactive object
  machines: IRStateMachine[];

  // Global event handlers
  global_handlers: IREventHandler[];
}

interface IRStateMachine {
  object_id : string;

  // Semua state yang mungkin
  states: Record<string, IRStateProperties>;

  // State awal
  initial_state: string;

  // Transitions antar state
  transitions: IRStateTransition[];
}

interface IRStateProperties {
  // Style override ketika di state ini
  style: StyleOverride;
  // Property yang berubah
  properties?: Partial<NodeProperties>;
}

interface IRStateTransition {
  from      : string;         // state name atau "*" untuk any
  to        : string;         // state name
  trigger   : InteractionTrigger;
  condition?: string;         // DSL expression, e.g. "store.count > 0"
  animation?: IRTransition;   // animasi selama transisi

  // Side effects
  actions: IRAction[];
}

type InteractionTrigger =
  | { type: "click" }
  | { type: "hover_enter" | "hover_leave" }
  | { type: "focus" | "blur" }
  | { type: "drag_start" | "drag_end" }
  | { type: "swipe"; direction: "left" | "right" | "up" | "down" }
  | { type: "key_press"; key: string }
  | { type: "timer"; delay_ms: number }
  | { type: "data_change"; binding_id: string }
  | { type: "custom"; event_name: string };

interface IRAction {
  type    : "mutate_store"    // ubah nilai di global store
          | "navigate"        // navigasi antar frame/halaman
          | "play_animation"  // trigger animasi
          | "call_binding"    // refresh data binding
          | "emit_event"      // emit event ke parent
          | "call_mcp";       // panggil MCP tool
  payload : unknown;
}
```

### 9. IRDependencyGraph — Cross-IR References

Menyelesaikan problem redundansi ketika satu komponen dipakai di banyak IR.

```typescript
interface IRDependencyGraph {
  // Dependencies dokumen ini
  depends_on: IRDependency[];

  // Component exports (jika dokumen ini adalah component library)
  exports?: IRComponentExport[];
}

interface IRDependency {
  ir_id    : string;
  version  : string;        // semver — pinned untuk reproducibility
  reason   : "component_ref" | "brand_profile" | "shared_asset"
           | "data_source" | "style_library";

  // Isolation policy
  isolation: "pinned"       // tidak pernah auto-update
           | "latest_patch" // auto-update patch (x.x.PATCH)
           | "latest_minor" // auto-update minor (x.MINOR.x)
           | "latest";      // selalu latest (hanya untuk development)
}

// Reference ke component dari IR lain
interface IRComponentRef {
  ir_id    : string;        // IR document yang punya component
  component_id: string;     // export name dari IR tersebut
  version  : string;

  // Override subset property — composition, bukan inheritance
  prop_overrides?: Partial<NodeProperties>;
  style_overrides?: StyleOverride;
}
```

### 10. IRPhysicalSpec — Output untuk Media Fisik

Menutup gap untuk print, signage, dan packaging yang ada di visual design
domain tapi belum ada di Genesis.

```typescript
interface IRPhysicalSpec {
  // Dimensi fisik
  dimensions: {
    width : number;
    height: number;
    depth?: number;    // untuk packaging 3D
    unit  : "mm" | "cm" | "in" | "pt";
  };

  // Area cetak
  bleed_mm    : number;    // area lebih untuk cetak (biasanya 3mm)
  safe_zone_mm: number;    // minimum dari tepi untuk konten penting
  margin_mm   : number;    // margin dalam dokumen

  // Output specification
  dpi         : number;    // 300 untuk print, 150 untuk large format
  color_profile: "sRGB" | "CMYK" | "PantoneU" | "PantoneC" | "PantoneM";
  substrate   : "coated" | "uncoated" | "canvas" | "vinyl" | "kraft"
             | "recycled" | "metallic";

  // Production marks
  production_marks: {
    fold_lines     : IRLine[];    // untuk packaging
    cut_lines      : IRLine[];    // untuk die-cut
    perforation    : IRLine[];
    score_lines    : IRLine[];
  };

  // Special finishing
  finishing: {
    spot_uv_areas  : IRArea[];   // area UV coating
    emboss_areas   : IRArea[];   // area emboss/deboss
    foil_areas     : IRArea[];   // area foil stamping
    varnish_areas  : IRArea[];
  };

  // Pantone color mapping (digital → fisik)
  pantone_overrides: Record<string, string>;
  // Key: token atau hex color, Value: Pantone code
  // Contoh: { "brand://primary": "Pantone 485 C" }
}
```

---

## IR Stability Contract

```
STATUS     │ DEFINISI                                │ CHANGE POLICY
───────────┼─────────────────────────────────────────┼──────────────────────────
STABLE     │ Field yang sudah di-deploy ke produksi  │ Breaking: major version
           │ dan digunakan oleh data real            │ Non-breaking: minor bump
───────────┼─────────────────────────────────────────┼──────────────────────────
BETA       │ Diimplementasi tapi belum dikunci        │ 90-day deprecation notice
───────────┼─────────────────────────────────────────┼──────────────────────────
x_*        │ Experimental — bisa berubah kapan saja  │ Tidak ada jaminan
───────────┼─────────────────────────────────────────┼──────────────────────────
DEPRECATED │ Dijadwalkan removal                     │ Masih berfungsi + warning

Field STABLE yang tidak bisa berubah tanpa major version bump:
  meta.schema_version, meta.ir_id, meta.domain
  canvas.width, canvas.height, canvas.platform
  objects[*].id, objects[*].type, objects[*].position
  constraints.brand_profile_id, constraints.wcag_level
```

---

## Compilation Pass Pipeline

```
INPUT: Natural Language / Canvas Action / Code Edit / MCP Call
  ↓
PASS 1: Parse & Validate
  • XGrammar constrained decoding → IR JSON
  • AJV schema validation (Tier 1 — deterministik)
  • Self-Refine Loop jika invalid (max 3x)
  • Error: IR invalid → failure handler
  ↓
PASS 2: Style Resolution
  • Expand brand:// tokens → nilai konkret
  • Resolve theme:// tokens dari IRStyleContext
  • Apply cascade: object > component > theme
  • Hasilkan: IRStyleContext.resolved (bukan mutasi original)
  ↓
PASS 3: Semantic Validation
  • Evaluasi IRSemanticRule (relational constraints)
  • WCAG contrast ratio check
  • Brand constraint Level 1-5
  • Auto-fix jika ada IRSemanticRule.auto_fix
  • Error: HARD violation → block render, return explanation
  ↓
PASS 4: Layout Computation
  • Hitung posisi absolute untuk flex/grid/masonry containers
  • Resolve "auto" width/height
  • Apply IRLayoutConstraint
  • Physical: apply bleed/safe zone untuk print domain
  ↓
PASS 5: Media & Temporal Resolution
  • Select format per media type + platform target
  • Resolve IRSyncContract antar timeline tracks
  • Validate temporal coherence (no overlapping conflicting tracks)
  • Resolve data bindings (fetch jika type != "static")
  ↓
PASS 6: Renderer Routing
  • Match setiap IRNode ke renderer terbaik dari registry
  • Create CompositionPlan (paralel vs sequential)
  • Assign LIR generation strategy per renderer group
  ↓
PASS 7: LIR Generation & Compose
  • Paralel: renderer independent berjalan bersamaan
  • Sequential: renderer dengan dependency
  • Compositor: gabungkan semua layer → final output
  • Post: C2PA watermark, cache, Op-Log
  ↓
OUTPUT: Rendered output + trace_id + RLVR reward signals
```

---

## IR Observability — Debug Layer

```typescript
// Diisi saat compile time, tidak disimpan di produksi
// Hanya aktif di development / debug session

interface IRDebugAnnotations {
  compiled_at    : string;
  compilation_ms : number;

  // Per-node trace
  nodes: Record<string, NodeDebugTrace>;

  // Pass durations
  pass_durations : Record<string, number>;
}

interface NodeDebugTrace {
  object_id: string;

  // Dari mana nilai setiap property berasal (Style Cascade)
  style_resolution_trace: Array<{
    property    : string;
    final_value : unknown;
    source      : "direct" | "style_override" | "component_style"
                | "theme_token" | "brand_token" | "constraint_override";
    source_ref  : string;
  }>;

  // Mengapa renderer X dipilih
  renderer_decision_trace: {
    candidates_evaluated : string[];
    selected             : string;
    selection_reason     : string;
  };

  // Hasil evaluasi setiap semantic rule
  constraint_check_trace: Array<{
    rule_id       : string;
    passed        : boolean;
    evaluated_to  : unknown;
    auto_fixed    : boolean;
  }>;
}
```

---

## IR Binary Serialization — Wire Format per Domain

JSON tidak selalu optimal untuk semua domain:

```
DOMAIN         │ PRIMARY FORMAT │ REASON                        │ FALLBACK
───────────────┼────────────────┼───────────────────────────────┼──────────
visual         │ JSON + Brotli  │ human-readable, debug-friendly│ CBOR
image_edit     │ CBOR           │ typed arrays untuk pixel data │ JSON
video          │ CBOR + custom  │ frame data = typed array      │ JSON
audio          │ custom binary  │ waveform = Float32Array       │ CBOR
print          │ JSON + Brotli  │ production workflow di PDF    │ CBOR
3d             │ FlatBuffers    │ zero-copy mesh loading        │ CBOR
interactive    │ JSON + Brotli  │ state machine = readable      │ CBOR

Serialization decision di-route berdasarkan domain saat export.
Internal storage selalu JSON untuk inspectability.
```

---

## IR DSL Grammar Versioning

Melengkapi IR Schema Migration (yang sudah ada di Genesis) dengan
versioning untuk DSL semantic itu sendiri:

```typescript
interface DSLGrammarVersion {
  version        : string;    // semver
  domains_covered: IRDomain[];
  semantic_scope : string[];  // konsep yang di-cover

  // Apa yang berubah dari versi sebelumnya
  changelog: string;

  // Regression test: intent yang sama harus menghasilkan
  // IR yang semantically equivalent antar versi
  regression_prompts: Array<{
    intent         : string;
    expected_props : string[];   // property yang harus ada di output
    version_added  : string;
    invariant      : "must_have" | "must_not_have" | "value_range";
  }>;
}
```

---

## Matriks Domain Coverage

```
DOMAIN         │ Canvas  │ Style   │ Timeline│ Physical│ Interaction
───────────────┼─────────┼─────────┼─────────┼─────────┼────────────
visual         │ ✅      │ ✅      │ —       │ —       │ optional
image_edit     │ ✅      │ limited │ —       │ —       │ —
video          │ ✅      │ ✅      │ ✅      │ —       │ —
audio          │ —       │ —       │ ✅      │ —       │ —
motion         │ ✅      │ ✅      │ ✅      │ —       │ optional
print          │ ✅      │ ✅      │ —       │ ✅      │ —
signage        │ ✅      │ ✅      │ optional│ ✅      │ —
packaging      │ ✅      │ ✅      │ —       │ ✅      │ —
data_viz       │ ✅      │ ✅      │ optional│ optional│ optional
interactive    │ ✅      │ ✅      │ optional│ —       │ ✅
3d             │ ✅      │ ✅      │ optional│ —       │ optional
```

---

## Keputusan yang Tidak Bisa Diulang (IR-Specific)

```
01. IRDomain enum — menambahkan domain baru tidak breaking,
    menghapus atau rename breaking. Domain list di-freeze per major version.

02. IRStyleContext cascade order — object > component > theme.
    Mengubah urutan setelah ada data akan membuat semua style
    yang sudah ada berperilaku berbeda.

03. IRSyncContract underrun_policy semantics — begitu video domain
    live, makna "pause_all" tidak bisa berubah karena user sudah
    membangun expectation dari behavior tersebut.

04. ColorValue format list — format yang sudah didukung tidak bisa
    dihapus. Menambah format baru harus backward compatible.

05. IRComponentRef isolation default — "pinned" sebagai default
    memastikan reproducibility. Mengubah default ke "latest" akan
    merusak semua project yang mengandalkan pinned behavior.

06. Data binding refresh_policy semantics — "reactive" harus didefinisikan
    secara formal (debounce? throttle?) sebelum domain data_viz live.

07. IRSemanticRule DSL expression syntax — setelah ada semantic rules
    yang di-deploy, mengubah syntax expression akan invalidate semua
    rules yang sudah ada.

08. Physical IRPhysicalSpec.unit — satuan default per domain
    (print = mm, screen = px) tidak bisa berubah tanpa breaking
    semua template yang sudah ada.
```

---

*Spesifikasi ini adalah sintesis dari:*
*Domain Analysis (Visual Design & Multimedia) · IR Strategy Discussion ·*
*Genesis Design Document v1.0 · Gap Analysis & Additional Considerations*
*Total domain: 11 · Total IR layer: 3 · Total compilation pass: 7*
*Total keputusan tidak bisa diulang (IR-specific): 8*
