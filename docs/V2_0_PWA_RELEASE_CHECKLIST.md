# v2.0 PWA Release Checklist

- [ ] `npm run icons:check` verifies all committed icon dimensions.
- [ ] `npm test` passes all unit and component tests.
- [ ] `npm run typecheck` exits with zero errors.
- [ ] `npm run build` emits `manifest.webmanifest` and `sw.js`.
- [ ] `npm run test:e2e` passes existing smoke and PWA offline tests.
- [ ] Built service worker has no Supabase runtime-caching route.
- [ ] GitHub Actions Quality check is green.
- [ ] Android or desktop Chromium offers installation.
- [ ] iPhone Safari Add to Home Screen displays the TimeBox icon and label.
- [ ] Installed app opens standalone without the normal browser address bar.
- [ ] Previously visited app reopens offline with local records and cached wallpaper.
- [ ] Offline cloud controls are disabled and reconnecting does not auto-sync.
- [ ] Settings displays `v2.0.0` and the deployed commit hash.
- [ ] No `.env`, credentials, reports, screenshots, or temporary QA scripts are committed.
