# Implementation Plan — IR Visual Design & Multimedia DSL
> Berdasarkan: ir-specification.md (schema_version: 2.0)

---

## Prinsip Implementasi

- **Incremental, bukan Big Bang** — setiap fase menghasilkan sistem yang bisa berjalan end-to-end
- **Domain pertama = `visual` + platform `web`** — paling banyak use case, paling mudah divalidasi
- **Stability contract dijaga sejak hari pertama** — field STABLE tidak boleh berubah API-nya
- **Test dulu, integrasi kemudian** — setiap interface punya unit test sebelum disambung ke pipeline

---

## Overview Fase

```
FASE 1  ██████░░░░░░░░░░░░░░  Foundation & Core Schema
FASE 2  ░░░░░░██████░░░░░░░░  Style System & Brand Tokens
FASE 3  ░░░░░░░░░░░░██████░░  Constraint & Semantic Validation
FASE 4  ░░░░░░░░░░░░░░░░████  Renderer Pipeline (Web)
   ↓ [MVP bisa di-ship setelah Fase 4]
FASE 5  Timeline & Time-Based Media
FASE 6  Data Binding & Interactive
FASE 7  Physical Output (Print, Packaging)
FASE 8  Domain Expansion & Serialization
FASE 9  Observability, Tooling & DSL Grammar
```

---

## Fase 1 — Foundation & Core Schema
**Durasi estimasi: 3–4 minggu**
**Output: HIR dapat dibuat, divalidasi, dan disimpan**

### 1.1 Setup Infrastruktur
- [ ] Definisikan monorepo structure (`packages/ir-schema`, `packages/ir-compiler`, `packages/ir-renderer-web`, dst.)
- [ ] Setup AJV (JSON Schema validator) sebagai dependency utama
- [ ] Setup TypeScript strict mode — semua interface dari spec langsung jadi tipe TypeScript
- [ ] Setup test framework (Vitest atau Jest)

### 1.2 HIR Core Schema
Implementasikan interface berikut (urutan prioritas):

```
IRDocument       → root, metadata, ir_id (UUID), domain, session_id
IRCanvas         → width, height, platform (mulai dari "web" saja)
IRNode           → id, type, position, size, rotation, opacity, visible
IRNodeType       → subset awal: text, image, shape, group, frame
IRConstraintSet  → kosong dulu, akan diisi di Fase 3
```

- [ ] Tulis JSON Schema (`.json`) untuk setiap interface di atas
- [ ] Buat AJV validator + unit test untuk schema valid dan schema invalid
- [ ] Buat factory functions: `createIRDocument()`, `createIRNode()`, dll.
- [ ] Tentukan `ir_id` generation strategy (UUID v4)

### 1.3 Compilation Pass 1 — Parse & Validate
- [ ] Input: raw JSON (dari user / AI agent)
- [ ] Output: validated `IRDocument` object atau `IRError`
- [ ] Implementasikan Self-Refine Loop (max 3x retry jika schema invalid)
- [ ] Definisikan `IRError` type: `{ code, message, path, severity }`
- [ ] Tulis test: valid IR lolos, IR cacat ditolak dengan error yang jelas

### 1.4 Storage Layer
- [ ] Tentukan format penyimpanan internal: **JSON** (sesuai spec)
- [ ] Implementasikan `saveIR(doc)` dan `loadIR(ir_id)`
- [ ] Dukung `parent_ir_id` untuk fork/branching sederhana

**Deliverable Fase 1:** Bisa membuat, memvalidasi, menyimpan, dan memuat IRDocument dengan node-node visual dasar.

---

## Fase 2 — Style System & Brand Tokens
**Durasi estimasi: 3 minggu**
**Output: Style cascade berfungsi, perubahan theme token otomatis propagate**

### 2.1 IRStyleContext
- [ ] Implementasikan `DesignTokenMap`: colors, typography, spacing, radii, shadows, easings
- [ ] Implementasikan `ColorValue` — 4 format: hex string, brand://, theme://, RGBA object, CMYK (untuk nanti)
- [ ] Buat `component_styles` dan `object_overrides` sebagai map

### 2.2 Cascade Resolution
Urutan: **object_overrides > component_styles > theme_tokens**

- [ ] Implementasikan fungsi `resolveStyle(nodeId, styleContext)` → `ResolvedStyle`
- [ ] Penting: resolusi menghasilkan **salinan baru** (`IRStyleContext.resolved`), bukan mutasi original
- [ ] Tulis test: override di level bawah selalu menang atas level atas

### 2.3 Token Reference Resolution
- [ ] Parser untuk `brand://primary` → lookup ke `brand_profile`
- [ ] Parser untuk `theme://colors.primary` → lookup ke `theme_tokens`
- [ ] Error handling: token tidak ditemukan → warning, gunakan fallback

### 2.4 Compilation Pass 2 — Style Resolution
- [ ] Integrasikan ke pipeline setelah Pass 1
- [ ] Input: validated `IRDocument`
- [ ] Output: `IRDocument` + `style_context.resolved` (immutable)

**Deliverable Fase 2:** Ganti satu token di `theme_tokens` → semua node yang tidak punya override langsung berubah.

---

## Fase 3 — Constraint & Semantic Validation
**Durasi estimasi: 3–4 minggu**
**Output: WCAG check, brand constraint, dan semantic rules berjalan**

### 3.1 IRConstraintSet — Dasar
- [ ] `wcag_level`: implementasikan contrast ratio checker (formula WCAG 2.1)
- [ ] `max_file_size_kb` dan `max_objects`: validasi sederhana
- [ ] `brand_profile_id`: lookup dan validasi brand constraints Level 1–3 dulu

### 3.2 IRSemanticRule DSL
Ini bagian paling kompleks di Fase 3.

- [ ] Definisikan grammar DSL expression (contoh: `"text.fill.contrast_with(parent.fill) >= 4.5"`)
- [ ] Buat parser sederhana (bisa mulai dengan evaluator berbasis safe `eval` atau parser custom)
- [ ] Dukung scope: `"object"`, `"parent_child"`, `"siblings"`, `"document"`
- [ ] Implementasikan `auto_fix` DSL expression
- [ ] **Penting:** Setelah DSL syntax di-deploy, tidak bisa berubah (Keputusan #07 di spec)

### 3.3 Compilation Pass 3 — Semantic Validation
- [ ] Jalankan semua `IRSemanticRule` dari `constraints.semantic_rules`
- [ ] HARD violation (`error`) → block render, kembalikan penjelasan
- [ ] SOFT violation (`warning`, `info`) → log, lanjut render
- [ ] Coba `auto_fix` jika ada, log hasilnya

### 3.4 IRLayoutConstraint — Dasar
- [ ] Implementasikan constraint `pin`, `align`, `distribute`, `aspect_ratio`, `min_size`
- [ ] Simpan sebagai input untuk Pass 4

**Deliverable Fase 3:** IR dengan teks kontras rendah ditolak atau di-auto-fix sebelum sampai ke renderer.

---

## Fase 4 — Renderer Pipeline (Web)
**Durasi estimasi: 4 minggu**
**Output: IRDocument → HTML/CSS/JS yang bisa dirender di browser**

### 4.1 Compilation Pass 4 — Layout Computation
- [ ] Resolusi `"auto"` width/height berdasarkan content dan parent
- [ ] Komputasi posisi absolute untuk `flex_container`, `grid_container`, `masonry_container`
- [ ] Terapkan `IRLayoutConstraint` yang sudah dikumpulkan di Fase 3

### 4.2 Pass 6 — Renderer Routing
- [ ] Buat `RendererRegistry`: map dari `IRNodeType` ke renderer function
- [ ] Buat `CompositionPlan`: tentukan mana yang bisa parallel, mana sequential

### 4.3 Pass 7 — LIR Generation (Web)
LIR untuk web = DOM instructions + CSS

- [ ] `text` node → `<p>` / `<span>` + CSS typography
- [ ] `image` node → `<img>` / `<picture>` + CSS sizing
- [ ] `shape` node → SVG atau `<div>` + CSS border-radius
- [ ] `group` / `frame` → `<div>` dengan CSS position
- [ ] Blend mode → CSS `mix-blend-mode`
- [ ] z_index → CSS `z-index` + stacking context

### 4.4 Compositor
- [ ] Gabungkan semua layer LIR → satu output HTML
- [ ] Terapkan C2PA watermark metadata (jika `constraints.c2pa_required`)
- [ ] Generate `trace_id` untuk setiap render

**Deliverable Fase 4 = MVP 🎉**
Pada titik ini sistem bisa: menerima IR → validasi → resolve style → cek constraint → compute layout → render ke web.

---

## Fase 5 — Timeline & Time-Based Media
**Durasi estimasi: 4–5 minggu**
**Target domain: `video`, `audio`, `motion`**

### 5.1 IRTimeline
- [ ] Implementasikan `IRTimelineLayer`: video, audio, animation, effect, text
- [ ] `IRKeyframe` dengan semua `EasingType`
- [ ] `IRTransition` antar keyframe
- [ ] `global_markers` sebagai reference points

### 5.2 IRSyncContract — Prioritas Tinggi
- [ ] Definisikan semantik `pause_all`, `drop_frame`, `stretch` secara formal **sebelum domain video live** (Keputusan #03)
- [ ] `drift_tolerance_ms`: implementasikan pengecekan desync
- [ ] `beat_sync`: kalkulasi posisi frame berdasarkan BPM
- [ ] `event_trigger`: sync berdasarkan event di primary track

### 5.3 Compilation Pass 5 — Media & Temporal Resolution
- [ ] Resolve `IRSyncContract` antar layers
- [ ] Validasi: tidak ada conflicting overlapping tracks
- [ ] Pilih format media per platform target (mp4 untuk web, dll.)

### 5.4 LIR Generation (Video)
- [ ] Output: FFmpeg filter graph
- [ ] Alternatif: Web Animations API untuk motion ringan

**Deliverable Fase 5:** Animasi dan video clip bisa di-render dengan sinkronisasi antar track yang terjamin.

---

## Fase 6 — Data Binding & Interactive Content
**Durasi estimasi: 4 minggu**
**Target domain: `data_viz`, `interactive`**

### 6.1 IRDataBinding
- [ ] `static`: langsung binding, tidak perlu fetch
- [ ] `api_endpoint`: fetch + cache + retry
- [ ] `mcp_tool`: panggil MCP tool, handle response
- [ ] `user_input`: bind ke input event dari user
- [ ] `formula`: computed dari binding lain (hati-hati circular dependency)
- [ ] Transform pipeline: `filter`, `sort`, `aggregate`, `format`, `map`
- [ ] **Tentukan semantik `reactive` secara formal** (debounce/throttle?) **sebelum data_viz live** (Keputusan #06)

### 6.2 IRInteractionModel — State Machine
- [ ] `IRStateMachine` per object: states, initial_state, transitions
- [ ] Semua `InteractionTrigger`: click, hover, focus, drag, swipe, key_press, timer, data_change, custom
- [ ] `IRAction`: mutate_store, navigate, play_animation, call_binding, emit_event, call_mcp
- [ ] Global store management (immutable update pattern)
- [ ] `condition` DSL: evaluasi expression seperti `"store.count > 0"`

**Deliverable Fase 6:** Dashboard dengan data live dari API, dan elemen interaktif dengan state machine yang proper.

---

## Fase 7 — Physical Output
**Durasi estimasi: 3 minggu**
**Target domain: `print`, `signage`, `packaging`**

### 7.1 IRPhysicalSpec
- [ ] Dimensi fisik dengan unit mm/cm/in/pt
- [ ] Bleed area, safe zone, margin
- [ ] Color profile: CMYK, PantoneU, PantoneC, PantoneM
- [ ] Substrate options
- [ ] **Set satuan default per domain sekarang** (print = mm, screen = px) — tidak bisa diubah setelah ada template (Keputusan #08)

### 7.2 Production Marks
- [ ] Fold lines, cut lines, perforation, score lines untuk packaging
- [ ] Spot UV, emboss, foil, varnish areas

### 7.3 LIR Generation (Print)
- [ ] Output: PostScript / PDF draw commands
- [ ] Pantone override mapping: `{ "brand://primary": "Pantone 485 C" }`
- [ ] Packaging 3D unfold support (bisa dikerjakan terpisah)

**Deliverable Fase 7:** Export file siap kirim ke percetakan, lengkap dengan bleed dan color profile yang benar.

---

## Fase 8 — Domain Expansion & Serialization
**Durasi estimasi: 3–4 minggu**

### 8.1 Domain Tambahan
- [ ] `image_edit`: compositing, layer blend modes
- [ ] `3d`: IRNode types `mesh_3d`, `light_3d`, `camera_3d`, `scene_3d`
- [ ] Tambahan renderer untuk setiap domain:
  - Mobile: Skia / Core Graphics
  - Lottie: keyframe array + easing curves

### 8.2 Binary Serialization — Wire Format
Sesuai tabel di spec:

| Domain | Format | Catatan |
|---|---|---|
| visual | JSON + Brotli | default, human-readable |
| image_edit | CBOR | typed arrays untuk pixel data |
| video | CBOR + custom | frame data = typed array |
| audio | custom binary | Float32Array |
| print | JSON + Brotli | untuk PDF workflow |
| 3d | FlatBuffers | zero-copy mesh loading |
| interactive | JSON + Brotli | state machine tetap readable |

- [ ] Implementasikan serializer/deserializer per domain
- [ ] Internal storage tetap JSON
- [ ] Router: pilih format berdasarkan `domain` saat export

### 8.3 IRDependencyGraph
- [ ] Cross-IR component reference
- [ ] Isolation policy: `pinned`, `latest_patch`, `latest_minor`, `latest`
- [ ] **Default harus `pinned`** — tidak boleh diubah jadi `latest` sebagai default (Keputusan #05)
- [ ] Version resolution + conflict detection

---

## Fase 9 — Observability, Tooling & DSL Grammar
**Durasi estimasi: 3 minggu**

### 9.1 IRDebugAnnotations
- [ ] `compiled_at`, `compilation_ms`
- [ ] `pass_durations` per compilation pass
- [ ] Per-node: `style_resolution_trace`, `renderer_decision_trace`, `constraint_check_trace`
- [ ] **Hanya aktif di development/debug session** — tidak disimpan di produksi

### 9.2 Op-Log & Observability
- [ ] Setiap render menghasilkan `trace_id`
- [ ] Log setiap compilation pass + durasi
- [ ] RLVR reward signals (untuk AI training loop)

### 9.3 DSL Grammar Versioning
- [ ] `DSLGrammarVersion`: version, domains_covered, semantic_scope, changelog
- [ ] `regression_prompts`: array of test cases dengan `must_have` / `must_not_have` / `value_range`
- [ ] CI: jalankan regression test setiap DSL grammar berubah

### 9.4 IR Schema Migration
- [ ] Migrasi otomatis saat `schema_version` berubah
- [ ] **STABLE fields tidak boleh breaking tanpa major version bump:**
  - `meta.schema_version`, `meta.ir_id`, `meta.domain`
  - `canvas.width`, `canvas.height`, `canvas.platform`
  - `objects[*].id`, `objects[*].type`, `objects[*].position`
  - `constraints.brand_profile_id`, `constraints.wcag_level`

---

## Ringkasan Keputusan Kritis (Harus Diselesaikan Sebelum Launch)

| # | Keputusan | Kapan Harus Final |
|---|---|---|
| 01 | IRDomain enum freeze | Sebelum Fase 1 selesai |
| 02 | Style cascade order (object > component > theme) | Sebelum Fase 2 selesai |
| 03 | IRSyncContract `underrun_policy` semantics | Sebelum domain video live (Fase 5) |
| 04 | ColorValue format list — format yang didukung | Sebelum Fase 2 selesai |
| 05 | IRComponentRef isolation default = `"pinned"` | Sebelum Fase 8 |
| 06 | `reactive` refresh_policy semantics (debounce/throttle) | Sebelum domain data_viz live (Fase 6) |
| 07 | IRSemanticRule DSL expression syntax | Sebelum Fase 3 selesai |
| 08 | IRPhysicalSpec unit default per domain | Sebelum domain print live (Fase 7) |

---

## Struktur Tim yang Direkomendasikan

```
Core IR Team
├── IR Schema & Compiler      (Pass 1–5)
├── Renderer — Web            (Pass 6–7, LIR Web)
└── Renderer — Video/Audio    (LIR FFmpeg)

Feature Teams
├── Style System              (Fase 2)
├── Constraint & Validation   (Fase 3)
├── Data & Interaction        (Fase 6)
└── Physical Output           (Fase 7)

Platform
├── Serialization & Storage
├── Observability & Tooling   (Fase 9)
└── DSL Grammar & Testing
```

---

*Dokumen ini dibuat berdasarkan ir-specification.md — schema_version 2.0*
*Total fase: 9 | Total domain: 11 | Keputusan tidak bisa diulang: 8*
