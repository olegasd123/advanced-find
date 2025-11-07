# Developer Code Style & Rules

This document defines the shared coding standards for the advanced-find project.

## Guiding Principles
- Favor clarity over cleverness; prioritize maintainability and explicitness so future contributors can reason about the code quickly.
- Prefer composition over inheritance; keep components and utilities small, single-purpose, and reusable.
- Keep business logic near domain boundaries (e.g., repositories, hooks) so UI components remain declarative.
- Adopt a “fail fast” mindset: validate assumptions early, surface unexpected states via `invariant`/`assert`, and log actionable details.
- Every new feature should include tests or reasoning explaining why tests are not applicable.

## TypeScript & React
- Write TypeScript everywhere; never fall back to `any` unless you document why and add a follow-up task to remove it.
- Prefer TypeScript `interface` declarations for describing object shapes; use `type` when unions or mapped types are needed.
- Use discriminated unions and branded types for domain concepts instead of raw primitives whenever feasible.
- Co-locate component-specific types next to the component; share cross-cutting types under `src/types`.
- Components must be function components with hooks; avoid legacy class components.
- Declare all components, hooks, and utilities as arrow functions to keep signatures uniform and enable easy binding.
- Keep hooks pure: the first line of a hook should be another hook call or synchronous logic, not side effects.
- Derive UI state from props or repositories; avoid duplicating data that can be computed on the fly.
- Memoize derived values (`useMemo`, `useCallback`) when the dependency list is stable and re-computation is expensive; otherwise, keep things simple.

## Styling & Layout
- Use the design tokens defined in the asset configuration (see `assets/app-config.json`) rather than hard-coded color values.
- Prefer CSS modules or scoped styles; avoid global overrides unless editing the base theme.
- Respect responsive breakpoints documented in design specs; components must collapse gracefully on smaller viewports.

## Data Layer & Hooks
- Repositories under `src/libs/repositories` are the single source of truth for data access; UI layers must not call `fetch` directly.
- Use hooks under `src/hooks` to encapsulate data fetching and caching concerns (e.g., `useCrmRepository`); components should consume already-shaped data.
- Handle loading, empty, and error states explicitly; never leave consumers guessing how to respond.
- When mocking repositories (e.g., for storybooks or tests) ensure mock data lives under `mock-data` and mirrors real schema keys.

## File, Import, and Naming Conventions
- Use PascalCase for components, camelCase for functions/variables, SCREAMING_SNAKE_CASE only for runtime constants.
- Follow kebab-case for directories and filenames (`folder-name/file-name.ext`) so paths remain consistent across platforms.
- One component per file; auxiliary helpers live next to their consumer with a `.helpers.ts` suffix.
- Keep public exports at the bottom of the file; export types separately using `export type`.
- Use absolute imports rooted at `src` to avoid brittle `../../` paths.

## Testing & Quality Gates
- Co-locate unit tests next to the source file using the `.test.ts(x)` naming convention.
- Integration tests that span multiple modules belong under `src/tests` with descriptive folder names.
- Favor Vite test utilities or Testing Library; front-end logic should assert user-visible behavior, not implementation details.
- Run the lint and test suites before raising a PR; fix warnings rather than suppressing them. If suppression is unavoidable, comment with context and tracking issue.

## Documentation & Comments
- Keep README-level docs in `docs/`; inline code comments should describe *why* something exists, not *what* it does.
- Update existing docs when touching a feature—they are part of the deliverable.
- Complex workflows (e.g., deployment scripts) need step-by-step instructions in `docs/` to remain reproducible.

## Third-Party Controls Policy
- The contents of `src/components/controls/catalyst` are provided by an external vendor; treat them as read-only. Do **not** modify, refactor, or lint-fix these files.
- When custom behavior or styling is needed, create wrappers or new components under `src/components/controls` that compose the catalyst controls rather than editing them in place.
- Document any new control variants in this folder and keep API differences minimal so upstream updates remain easy to integrate.

## Pull Request Checklist
- [ ] Code follows the conventions above and includes adequate typing.
- [ ] Tests (unit/integration) exist or rationale provided when omitted.
- [ ] Documentation is updated when behavior changes.
- [ ] No direct changes were made inside `src/components/controls/catalyst`; custom controls live in `src/components/controls`.
