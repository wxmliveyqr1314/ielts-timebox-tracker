# IELTS TimeBox Tracker Project Handoff

## Current Release

- Version: v2.3.0
- Frontend: React 19, Vite 6, TypeScript 5.8, Tailwind CSS 4, vite-plugin-pwa (PWA Shell)
- Storage: LocalStorage primary, IndexedDB wallpaper cache, manual Supabase synchronization
- Hosting: Vercel

The app is an installable Progressive Web App (PWA), not a native APK/IPA.

## Product Areas

- Dynamic Daily planning, optional stretch tasks, and Focus Mode recommendation
- History editing and safe deletion
- Stats and streak reporting
- Supabase authentication and manual cloud synchronization
- Local-first cloud wallpaper
- Data health and JSON backup tools
- Reward points and one active local-first reward goal
- Offline PWA shell with local-first features (cloud actions disabled while offline)

## Dynamic Daily Planning (v2.1 / v2.2)

Daily setup now produces an explainable, capacity-aware plan from Day Context, workout state, Energy Level, Focus Mode, optional focused minutes, and real study completed before generation. Every new plan persists a versioned `planSnapshot`; legacy records without a snapshot continue to render and calculate status through the legacy path.

## v2.2 Optional Stretch Plan

v2.2 adds an optional stretch layer after the required v2.1 baseline plan.

- Baseline tasks still decide Green / Yellow / Red.
- Stretch tasks use unused focused capacity and are marked optional.
- Stretch can be generated as Same Focus or Balanced.
- Stretch completion is counted in stats.
- Incomplete stretch has no penalty.
- Reward points are implemented in v2.3.

## v2.3 Reward Points

v2.3 adds a lightweight derived reward-points layer. It does not change daily status, planning, cloud sync, or deletion behavior.

- Green baseline days earn 1 point.
- Yellow baseline days earn 0.5 points.
- Red and Pending earn 0 baseline points.
- Optional stretch can add up to 0.2 bonus points when enabled and completed.
- Settings can save or clear one active local-first reward goal.
- Stats shows total points, recent 7-day points, average points per completed day, and active goal progress.
- Data Health validates malformed reward settings so Settings and Stats do not white-screen.

Reward goal settings are local-first in v2.3 and are preserved by LocalStorage and JSON export/import. Manual Supabase daily-record sync does not sync reward goal settings yet. Points are derived from records, so deleting or editing records changes points automatically.

### Module ownership

- `src/planning/taskRegistry.ts`: immutable task definitions, categories, credit group, capacity behavior, status role, minimums, and increments.
- `src/planning/focusProfiles.ts`: versioned Low/Normal/High task composition for Dictation, Reading, Speaking, and Recovery.
- `src/planning/planEngine.ts`: pure input normalization, matching credit, capacity trimming, deterministic task creation, and summary generation.
- `src/planning/planProgress.ts`: regeneration preview, stable task matching, and preservation of actual minutes, completion, notes, and removed real progress.
- `src/utils/status.ts`: dispatches records with a snapshot to dynamic status calculation and records without one to the legacy calculation.
- `src/utils/stats.ts`: counts completed-earlier Momo, dictation, reading, and passive minutes exactly once alongside generated-task actual minutes.
- `src/utils/dataHealth.ts`: validates optional plan snapshots read-only and never rewrites user data.
- `src/rewards/rewardPoints.ts`: pure reward scoring, goal validation, and reward summary helpers.

### Capacity defaults

| Day context | Workout | Focused capacity |
| --- | --- | ---: |
| Workday | No | 270 minutes |
| Workday | Yes | 210 minutes |
| Rest day | No | 330 minutes |
| Rest day | Yes | 270 minutes |

A manual value overrides the default and is clamped to `0..480` minutes.

### Focus-mode totals

| Focus mode | Low | Normal | High |
| --- | ---: | ---: | ---: |
| Dictation | 120 | 175 | 200 |
| Reading | 135 | 190 | 220 |
| Speaking | 90 | 130 | 150 |
| Recovery | 45 | 60 | 60 |

Passive listening is a separate 60-minute reference. It can exceed 60 minutes, does not consume focused capacity, does not reduce focused tasks, and does not affect Green/Yellow/Red.

### Completed-earlier credit and regeneration

- Momo, dictation, and reading minutes reduce only their matching generated group, one minute for one minute.
- Passive minutes reduce only the displayed listening reference.
- Excess and nonmatching minutes still count as real module study but never replace another category.
- Matching credit is applied before priority-based capacity trimming.
- Regeneration always shows a preview and requires confirmation.
- Stable `entryId` and `definitionId` metadata preserve task progress. Removed tasks with real progress move to `Earlier progress` and do not remain requirements.

### Adding a future task

1. Add one immutable definition to `TASK_REGISTRY` with a stable ID, category, capacity kind, status role, minimum, and increment.
2. Reference that definition from the appropriate versioned entries in `focusProfiles.ts`, using a stable `entryId`, planned minutes, priority, and optional credit order.
3. Add registry/profile tests and exact plan-engine totals.
4. Extend `TaskCategory` and reporting tests only when the task introduces a genuinely new reporting category.

Normal task additions must not add title-string branches to `planEngine.ts`.

## Quality Commands

- `npm test`: Vitest unit and component tests
- `npm run typecheck`: TypeScript validation
- `npm run icons:generate`: Deterministic generation of PWA icons using Sharp
- `npm run icons:check`: Validation of PWA icon dimensions
- `npm run build`: production Vite build (emits manifest and service worker)
- `npm run test:e2e`: Chromium browser smoke tests and PWA offline Playwright coverage
- `npm run check`: unit tests, type checking, and production build

## Continuous Integration

`.github/workflows/quality.yml` runs unit tests, type checking, production build, and Playwright smoke tests for pull requests and pushes to main. It uses no production Supabase credentials.

## Data Safety Boundaries

- LocalStorage remains the primary local data source.
- Cloud synchronization is manual only.
- `vite-plugin-pwa` precaches only the application shell and static assets.
- Supabase API traffic is not runtime-cached.
- Daily-record deletion uses tombstones.
- Wallpaper blobs are isolated in IndexedDB and cloud paths are user-owned.
- Never commit `.env` files, service-role keys, Playwright artifacts, or exported user data.

## Residual Risks

- Real email delivery, authentication rate limits, production RLS, and multi-device conflicts require manual verification.
- The browser smoke suite uses Chromium only.
- Supabase Free projects may pause after inactivity.
- Real-device installation remains a manual release check.
- Reward goal settings are local-only until future settings sync; v2.3 supports one active goal and has no redeem/archive timeline yet.
- Dynamic planning intentionally excludes AI-generated plans, calendar/workweek inference, cross-category substitution, automatic regeneration, passive-listening enforcement, and recalculation of old historical statuses.

## Development Workflow

1. Create a feature branch from current main.
2. Implement with focused tests and commits.
3. Run `npm run check` and `npm run test:e2e`.
4. Push and open a pull request.
5. Require the GitHub Actions Quality check to pass.
6. Review the real diff and deploy through Vercel.
7. Verify the displayed version and commit hash.
