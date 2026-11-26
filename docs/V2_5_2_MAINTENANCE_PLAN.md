# v2.5.2 History Sync and Current Streak

Date: 2026-11-26

## Problems and intended behavior

1. Editing History's general notes, tomorrow's first step, or bedtime can retain the old `updatedAt`, so manual synchronization skips the changed record. Make the shared local `updateRecord` path assign a fresh timestamp for every local edit. The timestamp must be strictly later than the previous record even for same-millisecond edits or a backward device clock. Preserve `createdAt`, untouched fields, and unrelated records. Import and cloud replacement retain their original timestamps.
2. Current streak starts from the latest stored date, allowing an old streak to appear current after a long absence. Anchor it to the user's local today. If today has no record, allow yesterday's streak to remain active while today is unfinished. A missing day or Red stops the streak; Pending remains transparent, adding no day and not breaking adjacent recorded days. Future records do not start or extend the current streak. Lifetime longest streak remains unchanged.

## Data compatibility and scope

No new fields, migrations, data deletion, or cloud tables are required. LocalStorage remains primary and cloud synchronization stays manual with the existing timestamp conflict policy. Status meaning, task planning, rewards, Data Health contracts, wallpaper, and historical record rendering remain compatible. Old edits made before this patch cannot be reliably identified; editing an affected field again will create a new syncable timestamp.

## Implementation and verification

- Add regression tests that edit each affected field through `useAppData`, verify upload against the previous cloud copy, and restore the edited value on another device through the existing merge helper.
- Cover repeated edits at one timestamp, backward device time, and unchanged imported/cloud timestamps.
- Cover current streak ending today/yesterday, old and future records, missing days, Red, transparent Pending, legacy dates, duplicate dates, and a calendar-year boundary. Verify the longest streak remains available.
- Use the existing browser suite to verify current/best streak after an absence and persistence of History edits across reloads and navigation.
- Run focused tests, full unit/component tests, TypeScript, production build, icon verification, and Chromium tests. Review the diff, release v2.5.2 through a focused PR, and verify CI plus the production build identifier.

## Verification evidence

- Focused tests: 60 passed across local update, cloud merge, streak, Stats, and History coverage.
- Full unit/component suite: 33 files, 280 tests passed.
- `npm run typecheck`, `npm run icons:check` (six PNGs), and `npm run build` passed; the build emitted the manifest and service worker.
- `npm run test:e2e`: all 13 Chromium tests passed, including History edit persistence and current/best streak after an absence.
- `git diff --check` passed. Remote CI and deployment gates are tracked on the PR and resulting production commit.
- Cross-device tests use fixture data and the existing merge/upload-payload helper, without sending real email or writing production cloud data.
