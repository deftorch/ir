# IR Visual Design & Multimedia DSL

## Project Overview

IR (Intermediate Representation) is a formal contract for visual design, multimedia, and cross-domain interaction (web, print, video, etc). IR serves as the single source of truth for all surfaces, with a multi-level architecture (HIR, MIR, LIR) and a structured compilation pipeline.

## Key Features

- Supports 11 domains: visual, video, audio, print, interactive, and more
- Style system & brand token cascade (object > component > theme)
- Constraint & semantic validation (WCAG, brand, etc.)
- Timeline & time-based media (video, motion)
- Data binding & interaction (state machine, event)
- Output: Web (HTML/CSS/JS), Print (PDF), Video (FFmpeg), and more

## IR Architecture

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

## Implementation Status

See [ir-implementation-plan.md](ir-implementation-plan.md) for the detailed roadmap.

- Phase 1: Foundation & Core Schema (in progress)
- Phase 2: Style System & Brand Tokens
- Phase 3: Constraint & Semantic Validation
- Phase 4: Renderer Pipeline (Web)
- ...

## Monorepo Structure

```
/packages
  ├── ir-schema         # JSON Schema & TypeScript types
  ├── ir-compiler       # Compilation pipeline & validator
  └── ir-renderer-web   # Web renderer (HTML/CSS/JS)
```

## Getting Started

1. Ensure Node.js & pnpm/yarn/npm are installed
2. Enter the `packages/ir-schema` folder and install dependencies
   ```bash
   cd packages/ir-schema
   npm install
   ```
3. Run tests (available after schema implementation)
   ```bash
   npm test
   ```

## Example IRDocument (Minimal)

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

## Stability Contract & Critical Decisions

- STABLE fields cannot be breaking-changed without a major version bump
- Cascade order: object > component > theme (cannot be changed)
- See [ir-specification.md](ir-specification.md) for details

## Contribution

- Follow the style guide & run tests before PR
- Add new domains/features according to the roadmap & discussion

## License

(Add license here)

---

> Full documentation: [ir-specification.md](ir-specification.md)
> Roadmap & phases: [ir-implementation-plan.md](ir-implementation-plan.md)
