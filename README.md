# IR Visual Design & Multimedia DSL

## Deskripsi Singkat
IR (Intermediate Representation) adalah kontrak formal untuk visual design, multimedia, dan interaksi lintas domain (web, print, video, dsb). IR menjadi sumber kebenaran tunggal untuk semua surface, dengan arsitektur multi-level (HIR, MIR, LIR) dan pipeline kompilasi yang terstruktur.

## Fitur Utama
- Mendukung 11 domain: visual, video, audio, print, interactive, dsb.
- Style system & brand token cascade (object > component > theme)
- Constraint & semantic validation (WCAG, brand, dsb.)
- Timeline & time-based media (video, motion)
- Data binding & interaksi (state machine, event)
- Output: Web (HTML/CSS/JS), Print (PDF), Video (FFmpeg), dsb.

## Arsitektur IR
```
DSL Source (Natural Language / Code / Canvas Action)
             ↓
HIR — High-level IR (Semantic / Intent Level)
             ↓
MIR — Mid-level IR (Resolved / Normalized)
             ↓
LIR — Low-level IR (Platform-Specific)
             ↓
Backends: Web · Print · Video · Mobile · Audio
```

## Status Implementasi
Lihat [ir-implementation-plan.md](ir-implementation-plan.md) untuk roadmap detail.
- Fase 1: Foundation & Core Schema (on progress)
- Fase 2: Style System & Brand Tokens
- Fase 3: Constraint & Semantic Validation
- Fase 4: Renderer Pipeline (Web)
- ...

## Struktur Monorepo
```
/packages
  ├── ir-schema         # JSON Schema & TypeScript types
  ├── ir-compiler       # Compilation pipeline & validator
  └── ir-renderer-web   # Web renderer (HTML/CSS/JS)
```

## Cara Memulai
1. Pastikan Node.js & pnpm/yarn/npm terinstall
2. Masuk ke folder `packages/ir-schema` dan install dependency
   ```bash
   cd packages/ir-schema
   npm install
   ```
3. Jalankan test (akan tersedia setelah implementasi schema)
   ```bash
   npm test
   ```

## Contoh IRDocument (Minimal)
```json
{
  "meta": {
    "schema_version": "2.0",
    "ir_id": "uuid-v4",
    "domain": "visual",
    "created_at": "2026-05-23T00:00:00Z"
  },
  "canvas": {
    "width": 1080,
    "height": 1920,
    "platform": "web"
  },
  "style_context": {
    "theme_tokens": { "colors": { "primary": "#FF5733" } },
    "component_styles": {},
    "object_overrides": {}
  },
  "objects": [],
  "constraints": { "semantic_rules": [], "layout_constraints": [] }
}
```

## Kontrak Stabilitas & Keputusan Kritis
- Field STABLE tidak boleh breaking tanpa major version bump
- Cascade order: object > component > theme (tidak bisa diubah)
- Lihat [ir-specification.md](ir-specification.md) untuk detail

## Kontribusi
- Ikuti style guide & test sebelum PR
- Tambah domain/fitur baru sesuai roadmap & diskusi

## Lisensi
(Cantumkan lisensi di sini)

---

> Dokumentasi lengkap: [ir-specification.md](ir-specification.md)
> Roadmap & fase: [ir-implementation-plan.md](ir-implementation-plan.md)