
# Implementation Plan — IR Visual Design & Multimedia DSL
> Based on: ir-specification.md (schema_version: 2.0)

---


## Implementation Principles

- **Incremental, not Big Bang** — each phase delivers an end-to-end working system
- **First domain = `visual` + `web` platform** — most use cases, easiest to validate
- **Stability contract enforced from day one** — STABLE fields must not change their API
- **Test first, integrate later** — every interface must have unit tests before being connected to the pipeline

---


## Phase Overview


```
PHASE 1  ██████░░░░░░░░░░░░░░  Foundation & Core Schema
PHASE 2  ░░░░░░██████░░░░░░░░  Style System & Brand Tokens
PHASE 3  ░░░░░░░░░░░░██████░░  Constraint & Semantic Validation
PHASE 4  ░░░░░░░░░░░░░░░░████  Renderer Pipeline (Web)
  ↓ [MVP can be shipped after Phase 4]
PHASE 5  Timeline & Time-Based Media
PHASE 6  Data Binding & Interactive
PHASE 7  Physical Output (Print, Packaging)
PHASE 8  Domain Expansion & Serialization
PHASE 9  Observability, Tooling & DSL Grammar
```

---


## Phase 1 — Foundation & Core Schema
**Estimated duration: 3–4 weeks**
**Output: HIR can be created, validated, and stored**


### 1.1 Infrastructure Setup
- [ ] Define monorepo structure (`packages/ir-schema`, `packages/ir-compiler`, `packages/ir-renderer-web`, etc.)
- [ ] Setup AJV (JSON Schema validator) as a core dependency
- [ ] Setup TypeScript strict mode — all interfaces from the spec become TypeScript types
- [ ] Setup test framework (Vitest or Jest)


### 1.2 HIR Core Schema
Implement the following interfaces (in order of priority):

```
IRDocument       → root, metadata, ir_id (UUID), domain, session_id
IRCanvas         → width, height, platform (start with "web" only)
IRNode           → id, type, position, size, rotation, opacity, visible
IRNodeType       → initial subset: text, image, shape, group, frame
IRConstraintSet  → leave empty for now, will be filled in Phase 3
```

- [ ] Write JSON Schema (`.json`) for each interface above
- [ ] Create AJV validator + unit tests for valid and invalid schemas
- [ ] Create factory functions: `createIRDocument()`, `createIRNode()`, etc.
- [ ] Decide on `ir_id` generation strategy (UUID v4)


### 1.3 Compilation Pass 1 — Parse & Validate
- [ ] Input: raw JSON (from user / AI agent)
- [ ] Output: validated `IRDocument` object or `IRError`
- [ ] Implement Self-Refine Loop (max 3x retry if schema is invalid)
- [ ] Define `IRError` type: `{ code, message, path, severity }`
- [ ] Write tests: valid IR passes, invalid IR is rejected with clear error


### 1.4 Storage Layer
- [ ] Decide on internal storage format: **JSON** (as per spec)
- [ ] Implement `saveIR(doc)` and `loadIR(ir_id)`
- [ ] Support `parent_ir_id` for simple fork/branching

**Phase 1 Deliverable:** Able to create, validate, save, and load IRDocument with basic visual nodes.

---


## Phase 2 — Style System & Brand Tokens
**Estimated duration: 3 weeks**
**Output: Style cascade works, theme token changes propagate automatically**


### 2.1 IRStyleContext
- [ ] Implement `DesignTokenMap`: colors, typography, spacing, radii, shadows, easings
- [ ] Implement `ColorValue` — 4 formats: hex string, brand://, theme://, RGBA object, CMYK (for later)
- [ ] Create `component_styles` and `object_overrides` as maps


### 2.2 Cascade Resolution
Order: **object_overrides > component_styles > theme_tokens**

- [ ] Implement function `resolveStyle(nodeId, styleContext)` → `ResolvedStyle`
- [ ] Important: resolution produces a **new copy** (`IRStyleContext.resolved`), not a mutation of the original
- [ ] Write tests: lower-level overrides always win over higher-level


### 2.3 Token Reference Resolution
- [ ] Parser for `brand://primary` → lookup in `brand_profile`
- [ ] Parser for `theme://colors.primary` → lookup in `theme_tokens`
- [ ] Error handling: token not found → warning, use fallback


### 2.4 Compilation Pass 2 — Style Resolution
- [ ] Integrate into pipeline after Pass 1
- [ ] Input: validated `IRDocument`
- [ ] Output: `IRDocument` + `style_context.resolved` (immutable)

**Phase 2 Deliverable:** Change one token in `theme_tokens` → all nodes without overrides update automatically.

---


## Phase 3 — Constraint & Semantic Validation
**Estimated duration: 3–4 weeks**
**Output: WCAG check, brand constraint, and semantic rules working**


### 3.1 IRConstraintSet — Basics
- [ ] `wcag_level`: implement contrast ratio checker (WCAG 2.1 formula)
- [ ] `max_file_size_kb` and `max_objects`: simple validation
- [ ] `brand_profile_id`: lookup and validate brand constraints Level 1–3 first


### 3.2 IRSemanticRule DSL
This is the most complex part of Phase 3.

- [ ] Define grammar for DSL expressions (example: `"text.fill.contrast_with(parent.fill) >= 4.5"`)
- [ ] Create a simple parser (can start with a safe `eval`-based evaluator or custom parser)
- [ ] Support scopes: `"object"`, `"parent_child"`, `"siblings"`, `"document"`
- [ ] Implement `auto_fix` DSL expression
- [ ] **Important:** Once DSL syntax is deployed, it cannot be changed (Decision #07 in spec)


### 3.3 Compilation Pass 3 — Semantic Validation
- [ ] Run all `IRSemanticRule` from `constraints.semantic_rules`
- [ ] HARD violation (`error`) → block render, return explanation
- [ ] SOFT violation (`warning`, `info`) → log, continue rendering
- [ ] Try `auto_fix` if available, log the result


### 3.4 IRLayoutConstraint — Basics
- [ ] Implement constraints: `pin`, `align`, `distribute`, `aspect_ratio`, `min_size`
- [ ] Store as input for Pass 4

**Phase 3 Deliverable:** IR with low contrast text is rejected or auto-fixed before reaching the renderer.

---


## Phase 4 — Renderer Pipeline (Web)
**Estimated duration: 4 weeks**
**Output: IRDocument → HTML/CSS/JS that can be rendered in the browser**


### 4.1 Compilation Pass 4 — Layout Computation
- [ ] Resolve `"auto"` width/height based on content and parent
- [ ] Compute absolute positions for `flex_container`, `grid_container`, `masonry_container`
- [ ] Apply `IRLayoutConstraint` collected in Phase 3


### 4.2 Pass 6 — Renderer Routing
- [ ] Create `RendererRegistry`: map from `IRNodeType` to renderer function
- [ ] Create `CompositionPlan`: determine which can be parallel, which sequential


### 4.3 Pass 7 — LIR Generation (Web)
LIR for web = DOM instructions + CSS

- [ ] `text` node → `<p>` / `<span>` + CSS typography
- [ ] `image` node → `<img>` / `<picture>` + CSS sizing
- [ ] `shape` node → SVG or `<div>` + CSS border-radius
- [ ] `group` / `frame` → `<div>` with CSS position
- [ ] Blend mode → CSS `mix-blend-mode`
- [ ] z_index → CSS `z-index` + stacking context


### 4.4 Compositor
- [ ] Combine all LIR layers → single HTML output
- [ ] Apply C2PA watermark metadata (if `constraints.c2pa_required`)
- [ ] Generate `trace_id` for each render

**Phase 4 Deliverable = MVP 🎉**
At this point, the system can: receive IR → validate → resolve style → check constraints → compute layout → render to web.

---


## Phase 5 — Timeline & Time-Based Media
**Estimated duration: 4–5 weeks**
**Target domain: `video`, `audio`, `motion`**


### 5.1 IRTimeline
- [ ] Implement `IRTimelineLayer`: video, audio, animation, effect, text
- [ ] `IRKeyframe` with all `EasingType`
- [ ] `IRTransition` between keyframes
- [ ] `global_markers` as reference points


### 5.2 IRSyncContract — High Priority
- [ ] Define semantics for `pause_all`, `drop_frame`, `stretch` formally **before video domain goes live** (Decision #03)
- [ ] `drift_tolerance_ms`: implement desync checking
- [ ] `beat_sync`: calculate frame position based on BPM
- [ ] `event_trigger`: sync based on event in primary track


### 5.3 Compilation Pass 5 — Media & Temporal Resolution
- [ ] Resolve `IRSyncContract` between layers
- [ ] Validate: no conflicting overlapping tracks
- [ ] Choose media format per target platform (mp4 for web, etc.)


### 5.4 LIR Generation (Video)
- [ ] Output: FFmpeg filter graph
- [ ] Alternative: Web Animations API for lightweight motion


**Phase 5 Deliverable:** Animation and video clips can be rendered with guaranteed track synchronization.

---


## Phase 6 — Data Binding & Interactive Content
**Estimated duration: 4 weeks**
**Target domain: `data_viz`, `interactive`**


### 6.1 IRDataBinding
- [ ] `static`: direct binding, no fetch needed
- [ ] `api_endpoint`: fetch + cache + retry
- [ ] `mcp_tool`: call MCP tool, handle response
- [ ] `user_input`: bind to user input event
- [ ] `formula`: computed from other bindings (beware of circular dependency)
- [ ] Transform pipeline: `filter`, `sort`, `aggregate`, `format`, `map`
- [ ] **Define `reactive` semantics formally** (debounce/throttle?) **before data_viz goes live** (Decision #06)


### 6.2 IRInteractionModel — State Machine
- [ ] `IRStateMachine` per object: states, initial_state, transitions
- [ ] All `InteractionTrigger`: click, hover, focus, drag, swipe, key_press, timer, data_change, custom
- [ ] `IRAction`: mutate_store, navigate, play_animation, call_binding, emit_event, call_mcp
- [ ] Global store management (immutable update pattern)
- [ ] `condition` DSL: evaluate expressions like `"store.count > 0"`


**Phase 6 Deliverable:** Dashboard with live data from API, and interactive elements with proper state machines.

---


## Phase 7 — Physical Output
**Estimated duration: 3 weeks**
**Target domain: `print`, `signage`, `packaging`**


### 7.1 IRPhysicalSpec
- [ ] Physical dimensions with units mm/cm/in/pt
- [ ] Bleed area, safe zone, margin
- [ ] Color profile: CMYK, PantoneU, PantoneC, PantoneM
- [ ] Substrate options
- [ ] **Set default unit per domain now** (print = mm, screen = px) — cannot be changed after templates exist (Decision #08)


### 7.2 Production Marks
- [ ] Fold lines, cut lines, perforation, score lines for packaging
- [ ] Spot UV, emboss, foil, varnish areas


### 7.3 LIR Generation (Print)
- [ ] Output: PostScript / PDF draw commands
- [ ] Pantone override mapping: `{ "brand://primary": "Pantone 485 C" }`
- [ ] Packaging 3D unfold support (can be done separately)


**Phase 7 Deliverable:** Export file ready to send to print, complete with correct bleed and color profile.

---


## Phase 8 — Domain Expansion & Serialization
**Estimated duration: 3–4 weeks**


### 8.1 Additional Domains
- [ ] `image_edit`: compositing, layer blend modes
- [ ] `3d`: IRNode types `mesh_3d`, `light_3d`, `camera_3d`, `scene_3d`
- [ ] Additional renderers for each domain:
  - Mobile: Skia / Core Graphics
  - Lottie: keyframe array + easing curves


### 8.2 Binary Serialization — Wire Format
As per the table in the spec:

| Domain | Format | Catatan |
|---|---|---|

| visual | JSON + Brotli | default, human-readable |
| image_edit | CBOR | typed arrays for pixel data |
| video | CBOR + custom | frame data = typed array |
| audio | custom binary | Float32Array |
| print | JSON + Brotli | for PDF workflow |
| 3d | FlatBuffers | zero-copy mesh loading |
| interactive | JSON + Brotli | state machine remains readable |


- [ ] Implement serializer/deserializer per domain
- [ ] Internal storage remains JSON
- [ ] Router: select format based on `domain` at export


### 8.3 IRDependencyGraph
- [ ] Cross-IR component reference
- [ ] Isolation policy: `pinned`, `latest_patch`, `latest_minor`, `latest`
- [ ] **Default must be `pinned`** — must not be changed to `latest` as default (Decision #05)
- [ ] Version resolution + conflict detection

---


## Phase 9 — Observability, Tooling & DSL Grammar
**Estimated duration: 3 weeks**


### 9.1 IRDebugAnnotations
- [ ] `compiled_at`, `compilation_ms`
- [ ] `pass_durations` per compilation pass
- [ ] Per-node: `style_resolution_trace`, `renderer_decision_trace`, `constraint_check_trace`
- [ ] **Active only in development/debug session** — not stored in production


### 9.2 Op-Log & Observability
- [ ] Each render produces a `trace_id`
- [ ] Log every compilation pass + duration
- [ ] RLVR reward signals (for AI training loop)


### 9.3 DSL Grammar Versioning
- [ ] `DSLGrammarVersion`: version, domains_covered, semantic_scope, changelog
- [ ] `regression_prompts`: array of test cases with `must_have` / `must_not_have` / `value_range`
- [ ] CI: run regression test every time DSL grammar changes


### 9.4 IR Schema Migration
- [ ] Automatic migration when `schema_version` changes
- [ ] **STABLE fields must not break without a major version bump:**
  - `meta.schema_version`, `meta.ir_id`, `meta.domain`
  - `canvas.width`, `canvas.height`, `canvas.platform`
  - `objects[*].id`, `objects[*].type`, `objects[*].position`
  - `constraints.brand_profile_id`, `constraints.wcag_level`

---


## Summary of Critical Decisions (Must Be Finalized Before Launch)

| # | Decision | When Must Be Finalized |
|---|---|---|
| 01 | IRDomain enum freeze | Before Phase 1 ends |
| 02 | Style cascade order (object > component > theme) | Before Phase 2 ends |
| 03 | IRSyncContract `underrun_policy` semantics | Before video domain goes live (Phase 5) |
| 04 | ColorValue format list — supported formats | Before Phase 2 ends |
| 05 | IRComponentRef isolation default = `"pinned"` | Before Phase 8 |
| 06 | `reactive` refresh_policy semantics (debounce/throttle) | Before data_viz domain goes live (Phase 6) |
| 07 | IRSemanticRule DSL expression syntax | Before Phase 3 ends |
| 08 | IRPhysicalSpec unit default per domain | Before print domain goes live (Phase 7) |

---


## Recommended Team Structure

```
Core IR Team
├── IR Schema & Compiler      (Pass 1–5)
├── Renderer — Web            (Pass 6–7, LIR Web)
└── Renderer — Video/Audio    (LIR FFmpeg)

Feature Teams
├── Style System              (Phase 2)
├── Constraint & Validation   (Phase 3)
├── Data & Interaction        (Phase 6)
└── Physical Output           (Phase 7)

Platform
├── Serialization & Storage
├── Observability & Tooling   (Phase 9)
└── DSL Grammar & Testing
```

---


*This document is based on ir-specification.md — schema_version 2.0*
*Total phases: 9 | Total domains: 11 | Non-reversible decisions: 8*
