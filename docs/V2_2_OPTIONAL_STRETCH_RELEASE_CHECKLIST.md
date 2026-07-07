# v2.2 Optional Stretch Release Checklist

## Automated gates

- [ ] `git diff --check origin/main...HEAD` has no whitespace errors.
- [ ] `npm test -- --run` passes all unit and component tests.
- [ ] `npm run typecheck` exits with zero errors.
- [ ] `npm run build` emits the production bundle.
- [ ] `npm run test:e2e` passes all Playwright scenarios.
- [ ] GitHub Actions Quality check is green on the pull request.
- [ ] Settings displays `v2.2.0` and the deployed commit hash.

## Optional stretch acceptance

- [ ] Generate a Dictation Normal workday plan with no workout.
- [ ] Confirm baseline target remains unchanged.
- [ ] Confirm focused capacity and unused capacity are understandable.
- [ ] Enable Same Focus stretch and confirm stretch tasks appear separately.
- [ ] Confirm incomplete stretch tasks do not prevent Green when baseline is complete.
- [ ] Enable Balanced stretch and confirm cross-module tasks appear.
- [ ] Edit a stretch task actual time and confirm History preserves it.
- [ ] Confirm Stats shows stretch minutes.
- [ ] Confirm Data Health remains Healthy.
- [ ] Run manual cloud sync and confirm no sync error.
- [ ] Check mobile width around 390px for no horizontal overflow.

## Safety checks

- [ ] Export a local JSON backup before destructive manual testing.
- [ ] Confirm stretch tasks are not required for status calculation.
- [ ] Confirm passive listening remains a reference and does not consume focused capacity.
- [ ] Confirm legacy records without `planSnapshot.stretch` still render.
- [ ] Confirm no `.env`, credentials, exported user data, screenshots, traces, reports, or temporary QA scripts are committed.
