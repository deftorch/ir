# Contributing to IR Visual Design & Multimedia DSL

Thank you for contributing! This document provides guidelines and instructions to help you set up the project and make successful contributions.

## Getting Started

1. **Prerequisites**: Ensure you have Node.js (v20+ or v24+) installed.
2. **Setup Workspaces**: Install dependencies and link local packages:
   ```bash
   npm install
   ```
3. **Build Packages**: Compile TypeScript files:
   ```bash
   npm run build
   ```
4. **Run Tests**: Verify everything works:
   ```bash
   npm run test
   ```

## Development Workflow

### Branch Naming Conventions

Please use descriptive branch names prefixed with the type of change:

- `feat/description-of-feature` (for new features)
- `fix/description-of-bug` (for bug fixes)
- `chore/description-of-chore` (for configurations, dependency updates, etc.)
- `docs/description-of-docs` (for documentation changes)

### Coding Standards

- **Style**: Code formatting is enforced using **Prettier**. Run `npm run format` to auto-format your changes.
- **Linting**: Static code analysis is managed by **ESLint**. Run `npm run lint` to check for code quality and type issues.
- **TypeScript**: Enable strict mode checks for all new packages and configurations.

### Commit Messages

We follow the **Conventional Commits** specification:

- `feat: add layout computation compiler pass`
- `fix: correct UUID regex check in test cases`
- `chore: update dependencies`
- `docs: update specification for video synchronization`

### Pull Request Process

1. Ensure all tests pass: `npm run test`.
2. Format and lint your code: `npm run format` and `npm run lint`.
3. Submit a Pull Request targeting the `main` branch.
4. Fill out the PR template completely.
5. Your PR will trigger GitHub Actions CI tests; ensure they build successfully before requesting review.
