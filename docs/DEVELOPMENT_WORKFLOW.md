# Development Workflow

This project uses a risk-based workflow. Small changes should stay fast; full verification is reserved for changes that can realistically break the app.

## Working Rhythm

1. Group related small changes into one topic branch.
2. Do not create a GitHub PR for every tiny edit.
3. During development, run the smallest useful check for the files touched.
4. Before merging a feature or release wrap, run the full required gate for that risk level.
5. Keep `DESIGN.md`, `read_projects.cjs`, local screenshots, `.env` files, exported user data, and temporary QA scripts out of commits.

## Verification Levels

### Level 0: Documentation, comments, copy, checklists

Examples:
- README or handoff updates
- release checklist changes
- non-code planning docs
- wording-only copy changes that do not affect TypeScript

Default checks:
- `git diff --check`

Optional checks:
- none, unless the doc references generated output or a package version.

Do not run full tests by default.

### Level 1: Metadata, version, configuration without runtime logic

Examples:
- `package.json` version bump
- `package-lock.json` sync
- app version display metadata
- static manifest text

Default checks:
- `git diff --check`
- `npm run build`

Optional checks:
- `npm run typecheck` when TypeScript files are touched.

Full `npm test` is not required unless runtime code changed.

### Level 2: UI-only changes

Examples:
- Tailwind layout tweaks
- text wrapping fixes
- visual polish
- component presentation changes without data mutation

Default checks:
- `git diff --check`
- related component test, if one exists
- `npm run typecheck`

Optional checks:
- `npm run build` before pushing a PR.

Run Playwright only when the change affects navigation, scrolling, responsive overflow, wallpaper rendering, PWA shell, or installability.

### Level 3: Pure logic changes

Examples:
- reward point calculation
- stats helpers
- planning helper functions
- data health validators
- date parsing

Default checks:
- `git diff --check`
- focused unit tests for the changed module
- `npm run typecheck`

Before PR:
- `npm test -- --run`
- `npm run build`

### Level 4: Data, storage, sync, auth, status, or planner behavior

Examples:
- LocalStorage or JSON import/export
- Supabase sync
- tombstones and deletion
- cloud wallpaper persistence
- Daily plan generation
- status calculation
- reward persistence
- task registry migration behavior

Default checks:
- `git diff --check`
- focused regression tests for the affected behavior
- `npm run typecheck`
- `npm run build`

Before PR:
- `npm test -- --run`
- targeted manual browser verification when user-facing state is involved

Run Playwright when the change affects cross-page navigation, PWA/offline behavior, wallpaper rendering, or local/cloud persistence flows.

### Level 5: Release candidate or broad refactor

Examples:
- multiple product areas changed together
- routing/navigation changes
- PWA changes
- dependency upgrades
- production release wrap after major features

Required checks:
- `git diff --check`
- `npm test -- --run`
- `npm run typecheck`
- `npm run build`
- `npm run test:e2e` when PWA, navigation, offline, wallpaper, or install behavior is in scope.

## Commit and PR Cadence

Use fewer, more meaningful PRs.

Good PR units:
- one feature slice
- one bug fix with tests
- one release wrap
- one documentation/design package

Avoid PRs for:
- one typo
- one checklist line
- one minor copy change
- a version bump before the feature is otherwise ready

Small related changes can stay local until there is a coherent branch worth reviewing.

## Suggested Branch Naming

- `docs/...` for design or planning documents
- `feature/...` for user-facing behavior
- `fix/...` for bugs
- `chore/...` for release wraps, version bumps, or tooling

## Default Decision Rule

If the change cannot affect runtime behavior, do not pay the full test cost.

If the change can affect user data, sync, generated tasks, status, rewards, or installability, verify more heavily.

When uncertain, choose the next higher verification level, but do not automatically jump to Level 5.
