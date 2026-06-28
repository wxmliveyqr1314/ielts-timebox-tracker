# v1.9 Release Hardening Design

## Objective

Prepare IELTS TimeBox Tracker for reliable ongoing releases by automating its existing quality gates, adding a small real-browser smoke suite, reducing the production entry-bundle warning, and documenting a repeatable release process.

This release is stabilization work. It must not change study planning, status calculation, cloud merge behavior, wallpaper ownership rules, storage schemas, or page design.

## Selected Approach

Use a balanced release-hardening approach:

- GitHub Actions validates every pull request and push to `main`.
- Vitest remains the primary behavioral test suite.
- Playwright covers only critical browser integration paths that unit tests cannot prove.
- Vite splits stable third-party dependencies into predictable chunks.
- One local command runs the same non-browser checks used in CI.
- A concise release checklist records the final production verification.

This provides meaningful protection without introducing monitoring services, broad end-to-end coverage, or operational complexity that is unnecessary for a single-user application.

## Scope

### Included

1. Add package scripts for type checking, browser smoke tests, and the combined local quality gate.
2. Add a GitHub Actions workflow for install, unit tests, type checking, build, and browser smoke tests.
3. Add Playwright configuration and a focused smoke suite.
4. Add deterministic test fixtures that write only to the browser context used by Playwright.
5. Add conservative Vite chunking for large stable dependencies.
6. Add a v1.9 release checklist.
7. Update the handoff document and application version to `1.9.0` after all checks pass.

### Excluded

- New product features or screens.
- Visual redesign.
- Automatic cloud synchronization or realtime subscriptions.
- Supabase schema, RLS, authentication, or storage policy changes.
- Error-monitoring or analytics services.
- Changes to `DailyRecord`, `AppState`, status rules, streak rules, or tombstone semantics.
- Pixel-perfect screenshot baselines, which would be brittle across browser versions.

## Continuous Integration

Create `.github/workflows/quality.yml` for pull requests and pushes to `main`.

The workflow will:

1. Check out the repository.
2. Install the repository's supported Node.js version with npm caching.
3. Run `npm ci`.
4. Run `npm test`.
5. Run `npm run typecheck`.
6. Run `npm run build`.
7. Install the Playwright Chromium runtime.
8. Run `npm run test:e2e`.
9. Upload the Playwright report only when the browser suite fails.

No Supabase secrets are required. Tests must use missing-configuration behavior or mocked/local browser state and must never access production cloud data.

## Browser Smoke Suite

Playwright will run against a Vite preview server and use Chromium only. The suite stays intentionally small and verifies:

1. The application opens without an uncaught page error.
2. Bottom navigation reaches Daily, History, Stats, and Settings.
3. Deterministic local `DailyRecord` fixtures appear in History and Stats.
4. History can expand one record and expose its existing editing controls.
5. Stats renders finite values and the four status categories.
6. Settings renders version information and the expected cloud configuration state.
7. A locally seeded wallpaper cache activates the wallpaper layer without horizontal overflow at a mobile viewport.

Fixtures must be installed before the first application load. They use `ielts_timebox_state_v2`, `ielts_timebox_wallpaper_meta_v1`, and the wallpaper IndexedDB database only inside Playwright's isolated browser context. Each test starts with a fresh context.

The suite must assert application state and visible semantics, not only create screenshots. Screenshots and traces are failure artifacts, not committed source files.

## Build Chunking

Configure `build.rollupOptions.output.manualChunks` in `vite.config.ts` with a small number of stable groups:

- React runtime: `react`, `react-dom`.
- Supabase client and its transitive runtime.
- UI/support libraries such as `lucide-react`, `date-fns`, and `motion` when Rollup can separate them cleanly.

The goal is to remove the single-entry chunk warning and improve cacheability. The implementation must not split every dependency into its own chunk, introduce circular-chunk warnings, or change runtime behavior.

Acceptance is based on a successful production build with no chunk larger than Vite's current warning threshold, unless a documented technical reason makes one remaining warning preferable to unsafe chunking.

## Package Commands

Add these scripts while preserving existing commands:

- `typecheck`: `tsc --noEmit`
- `test:e2e`: run the Playwright smoke project
- `check`: run unit tests, type checking, and the production build in sequence

Keep `lint` temporarily as a compatibility alias unless the implementation confirms nothing external relies on it. This release does not add ESLint.

## Failure Handling

- Unit, type, build, or browser failures fail CI immediately.
- Playwright captures trace and screenshot artifacts only on failure.
- Browser tests fail on uncaught page errors and unexpected console errors.
- Expected missing-Supabase warnings must be explicitly filtered by exact message, not by suppressing all console output.
- No test may silently continue after fixture injection fails.

## Release Documentation

Create `docs/V1_9_RELEASE_CHECKLIST.md` with verifiable items for:

- clean Git diff;
- unit tests, type checking, build, and Playwright smoke suite;
- GitHub Actions success;
- Vercel deployment readiness;
- displayed version and commit hash;
- Daily, History, Stats, Settings, wallpaper, and manual sync sanity checks;
- confirmation that no real `.env` values or QA artifacts are committed.

Update `docs/PROJECT_HANDOFF.md` only after the implementation is complete so it describes the actual scripts, CI workflow, browser coverage, and known residual risks.

## Security And Data Safety

- GitHub Actions receives no production credentials.
- Browser fixtures remain local to an isolated test profile.
- `.env` files, service-role keys, screenshots, Playwright reports, traces, and temporary QA scripts must not be committed.
- Existing LocalStorage corruption protection and Supabase Row Level Security assumptions remain unchanged.

## Acceptance Criteria

v1.9 is complete when:

1. `npm ci`, `npm test`, `npm run typecheck`, `npm run build`, and `npm run test:e2e` pass from a clean checkout.
2. GitHub Actions runs the same gates successfully on the pull request.
3. Browser tests prove navigation, deterministic History/Stats data, and local wallpaper activation.
4. Production build output has no unexplained chunk-size warning.
5. No production credentials or temporary QA artifacts appear in the Git diff.
6. The release checklist and handoff document match the implemented behavior.
7. The application displays `v1.9.0` after deployment.

## Residual Risks

- The browser suite does not exercise real Supabase email delivery, authentication rate limits, or production RLS policies.
- Vercel and Supabase outages remain external dependencies.
- A Chromium-only smoke suite does not guarantee identical rendering in every mobile browser.
- Manual cloud conflict testing remains a release checklist item because reproducing multiple real devices in CI would add disproportionate complexity.
