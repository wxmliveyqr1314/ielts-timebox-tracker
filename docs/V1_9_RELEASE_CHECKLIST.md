# v1.9 Release Checklist

- [ ] `git diff --check origin/main...HEAD` has no output.
- [ ] `npm ci` succeeds from the committed lockfile.
- [ ] `npm test` passes all unit tests.
- [ ] `npm run typecheck` exits with zero errors.
- [ ] `npm run build` succeeds without unexplained chunk warnings.
- [ ] `npm run test:e2e` passes the Chromium smoke suite.
- [ ] GitHub Actions Quality check is green on the pull request.
- [ ] Daily, History, Stats, and Settings open in the deployed build.
- [ ] Local wallpaper activation works at 390 px without horizontal overflow.
- [ ] Manual cloud sync still requires an explicit user action.
- [ ] Settings displays `v1.9.0` and the deployed commit hash.
- [ ] No `.env`, credentials, screenshots, traces, reports, or temporary QA scripts are committed.
