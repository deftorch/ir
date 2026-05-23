# AGENTS & TEAM STRUCTURE

This document describes the roles, responsibilities, and collaboration structure for the IR Visual Design & Multimedia DSL project.

## Team & Agent Structure

### Core IR Team
- **IR Schema & Compiler**: Designs the IR schema, validation logic, and compilation pipeline.
- **Renderer — Web**: Develops the web renderer (HTML/CSS/JS output).
- **Renderer — Video/Audio**: Develops the video and audio renderers (FFmpeg, audio processing, etc).

### Feature Teams
- **Style System**: Develops the style cascade, design tokens, and brand token logic.
- **Constraint & Validation**: Implements semantic validation, WCAG checks, and brand constraints.
- **Data & Interaction**: Handles data binding, state machines, and interactive content.
- **Physical Output**: Implements print, signage, and packaging output features.

### Platform & Infrastructure
- **Serialization & Storage**: Manages wire formats, serialization, and storage strategies.
- **Observability & Tooling**: Develops debugging, logging, and CI tooling.
- **DSL Grammar & Testing**: Maintains the DSL grammar, regression tests, and grammar versioning.

### Automation & AI Agents
- **Code Generation**: Automated tools for schema/type generation, code scaffolding, and migration.
- **Testing & CI/CD**: Automated test runners, linters, and continuous integration pipelines.
- **Schema Migration**: Agents for automatic schema migration and validation.
- **Documentation Bots**: Tools for keeping documentation up to date and consistent.

## Collaboration & Responsibility Flow
- Each team/agent is responsible for their domain, but must ensure compatibility with the IR stability contract.
- All changes to STABLE fields or critical contracts require review and consensus.
- Unit tests and validation must be implemented before integration into the main pipeline.
- Automation agents (CI, codegen, migration) are integrated into the development workflow for reliability and speed.

## References
- [ir-implementation-plan.md](ir-implementation-plan.md) — Implementation phases and team breakdown
- [ir-specification.md](ir-specification.md) — Full IR schema and contract details

---

For questions or contributions, please refer to the main README or open an issue in the repository.
