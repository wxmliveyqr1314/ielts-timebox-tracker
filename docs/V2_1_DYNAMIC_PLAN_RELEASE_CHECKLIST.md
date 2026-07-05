# v2.1 Dynamic Daily Planning Release Checklist

## Automated gates

- [ ] `git diff --check origin/main...HEAD` has no output.
- [ ] `npm test` passes all unit and component tests.
- [ ] `npm run typecheck` exits with zero errors.
- [ ] `npm run build` emits the production PWA bundle.
- [ ] `npm run test:e2e` passes all Chromium scenarios, including `dynamic-daily-plan.spec.ts`.
- [ ] GitHub Actions Quality check is green on the pull request.
- [ ] Settings displays `v2.1.0` and the deployed commit hash.

## Dynamic plan acceptance

- [ ] Workday + no workout defaults to 270 focused minutes; workout changes it to 210.
- [ ] Rest day + no workout defaults to 330 focused minutes; workout changes it to 270.
- [ ] Manual focused minutes override the default and remain within `0..480`.
- [ ] Dictation Low/Normal/High totals are 120/175/200 minutes.
- [ ] Reading Low/Normal/High totals are 135/190/220 minutes.
- [ ] Speaking Low/Normal/High totals are 90/130/150 minutes.
- [ ] Recovery Low/Normal/High totals are 45/60/60 minutes.
- [ ] Momo, dictation, and reading completed-earlier values reduce only their matching task groups.
- [ ] Passive listening displays a 60-minute reference but does not alter focused capacity or status.
- [ ] A Normal Dictation Workday with Momo 20, dictation 30, reading 10, and passive 75 shows standard 175, credit 50, and tonight focused 125.
- [ ] Capacity trimming removes optional or lower-priority work before higher-priority required work and keeps wrap-up where capacity permits.

## Regeneration and shared data

- [ ] Editing plan inputs shows a difference preview before any task replacement.
- [ ] Canceling the preview leaves the current record unchanged.
- [ ] Confirming regeneration preserves actual minutes, completion, and notes.
- [ ] Removed tasks with real progress appear under `Earlier progress` without becoming new requirements.
- [ ] Reloading preserves the generated snapshot and regenerated task state.
- [ ] History displays Day Context, completed-earlier total, focused summary, capacity trim, and passive reference.
- [ ] Stats counts completed-earlier Momo, dictation, reading, and passive minutes exactly once.
- [ ] A legacy record without `planSnapshot` still renders and retains its legacy status result.
- [ ] Data Health reports malformed present snapshots but does not flag a missing snapshot on legacy data.

## Data safety and compatibility

- [ ] JSON export is downloaded before destructive manual testing.
- [ ] JSON import restores records, plan snapshots, and sync metadata after confirmation.
- [ ] Manual cloud `Sync now` uploads and downloads v2.1 records without automatic background synchronization.
- [ ] Deleting a v2.1 record creates the existing tombstone and the next manual sync removes it remotely.
- [ ] Daily, History, Stats, Settings, wallpaper, and PWA offline behavior remain available for old records.
- [ ] No `.env`, credentials, exported user data, screenshots, traces, reports, or temporary QA scripts are committed.

## Real-device visual checks

- [ ] Install or refresh the production PWA on a real phone and confirm the v2.1 build identifier.
- [ ] Generate and regenerate a plan at phone width with wallpaper disabled; confirm no horizontal overflow.
- [ ] Repeat with wallpaper enabled; cards remain readable and the background remains fixed.
- [ ] Verify Daily at approximately 390 px, tablet at 768 px, and desktop at 1440 px.
- [ ] Confirm task titles, summary values, completed-earlier rows, inputs, and dialogs do not overlap the bottom navigation.
- [ ] Open the previously visited app offline; local records and cached wallpaper remain readable, while cloud actions remain disabled.
