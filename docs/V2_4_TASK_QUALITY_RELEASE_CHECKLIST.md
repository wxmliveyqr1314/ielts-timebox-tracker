# v2.4 Task Quality Release Checklist

## Automated gates

- [ ] `git diff --check origin/main...HEAD` has no whitespace errors.
- [ ] `npm test -- --run` passes all unit and component tests.
- [ ] `npm run typecheck` exits with zero errors.
- [ ] `npm run build` emits the production bundle.
- [ ] `npm run test:e2e` passes Playwright smoke tests.
- [ ] GitHub Actions Quality check is green on the pull request.
- [ ] Settings displays `v2.4.0` and the deployed commit hash.

## Task quality acceptance

- [ ] Daily Setup includes Speaking Bonus minutes.
- [ ] Speaking Bonus reduces only eligible speaking-shadowing tasks.
- [ ] Dictation, Reading, Speaking, and Recovery generated plans no longer create ambiguous new `mixed-review` tasks.
- [ ] Daily generated task cards show a short task description when metadata exists.
- [ ] Daily generated task cards show a clear done criterion when metadata exists.
- [ ] Legacy tasks without metadata still render normally.
- [ ] Legacy `mixed-review` records remain readable and healthy.

## Data safety and compatibility

- [ ] Data Health remains Healthy for existing valid records.
- [ ] Data Health reports invalid `speakingMinutes` instead of crashing.
- [ ] Data Health warns on unknown task definition IDs without rewriting data.
- [ ] Status, rewards, history, manual cloud sync, JSON export/import, wallpaper, and PWA offline behavior remain available.
- [ ] No `.env`, credentials, exported user data, screenshots, traces, reports, or temporary QA scripts are committed.
