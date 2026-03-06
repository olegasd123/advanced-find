# AI Model Rules

This file is for AI models and coding agents.

## Main Rule: Config vs Domain Types

- Keep `src/libs/config/app-config.ts` only for JSON config schema.
- Do not put business/domain models in `app-config.ts`.
- Put shared domain models in `src/libs/types/`.

## Domain Type Placement

- Put shared domain models in `src/libs/types/`.
- Use domain-specific files in that directory.
- Keep type files focused and grouped by domain context.

## Import Rules

- Import domain types from `src/libs/types/*`.
- Import config schema types from `src/libs/config/app-config.ts` only when reading config shape.
- Do not create new domain type definitions inside utility files.
- Re-exports can stay for compatibility, but new code should use `src/libs/types/*` directly.

## PR Checklist for AI Models

- Added/updated shared domain types under `src/libs/types/`.
- No new domain types added to `app-config.ts`.
- Updated imports to use `src/libs/types/*` where needed.
- Updated docs when this rule changes.
