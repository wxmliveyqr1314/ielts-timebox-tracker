# v2.5.1 Maintenance Plan

Date: 2026-11-26

## Problems and behavior

- Speaking completed before plan generation reduces eligible tasks but is missing from module totals and speaking activity. Count `workdayBonus.speakingMinutes` once alongside task actuals, including excess bonus minutes. Missing legacy values remain zero. History and Stats must share the same totals; label History's combined time as Formal rather than Evening.
- History, Stats, and recent reward points describe seven days but currently select seven records. Use the user's local today and the preceding six calendar dates, including both boundaries and excluding future, invalid, and older dates. Keep all historical rows, lifetime rewards, stretch totals, and streak rules available. Use explicit reference dates in tests.
- Login errors lack useful recovery guidance. Distinguish rate limiting, email delivery restrictions, expired codes, invalid configuration, and unavailable services. A network failure can suggest checking whether Supabase is paused, but must not claim pausing is confirmed. Handle rejected authentication promises and always release the loading state.
- Browser coverage predates Study. Cover all five tabs, the read-only task library, mobile overflow with wallpaper, and offline Study access.

## Data and scope

This patch introduces no persistent fields or migrations. It changes derived reporting and authentication error handling only. Existing daily status, task generation, per-day reward scoring, LocalStorage keys, manual record synchronization, and wallpaper ownership remain unchanged. No production credentials or user exports are used in tests.

## Implementation and validation

1. Add regression tests for sparse calendar windows, exact date boundaries, legacy dates, speaking-only bonus days, bonus plus actual minutes, History/Stats reporting, and rejected authentication calls.
2. Fix the shared statistics and recent-reward helpers, wire History and Stats, and improve authentication feedback.
3. Extend existing Playwright coverage with deterministic dates, Study navigation, mobile wallpaper layout, and offline access.
4. Run focused tests, the full unit/component suite, TypeScript, production build, PWA icon checks, and the browser suite. Review the final diff and prepare v2.5.1 metadata and handoff.
5. Commit on a focused branch, push, open a PR, and inspect Quality and deployment checks before merging through the repository's PR flow.

## Release evidence

- Local full unit/component suite: 33 files, 269 tests passed. The subsequent Study badge-key fix also passed its four focused component tests with no duplicate-key warnings.
- TypeScript: `npm run typecheck` passed.
- PWA assets: `npm run icons:check` verified six PNG icons.
- Production build: `npm run build` passed and emitted the manifest and service worker.
- Browser suite: `npm run test:e2e` passed all 12 Chromium tests, including Study, wallpaper layout, offline access, and a long absence.
- `git diff --check` passed. Remote Quality checks and Vercel deployment status are tracked on the release PR and resulting commit.
- Production login and manual sync were reported basically normal by the owner after resuming the paused Supabase project; this is not an automated cloud/auth acceptance test. Native mobile install checks remain manual.
