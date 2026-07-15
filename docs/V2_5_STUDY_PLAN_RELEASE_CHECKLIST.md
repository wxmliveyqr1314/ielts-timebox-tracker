# v2.5 Study Plan Release Checklist

## Automated Gates

- [ ] `git diff --check origin/main...HEAD`
- [ ] `npm test -- --run`
- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] GitHub Actions Quality check is green
- [ ] Settings displays `v2.5.0` and the deployed commit hash

## Study Plan Acceptance

- [ ] Bottom navigation shows the Study tab.
- [ ] Study opens a read-only Study Plan page.
- [ ] The page shows total tasks, focused tasks, and reward-eligible tasks.
- [ ] Tasks are grouped by learning area.
- [ ] Task cards show description, instruction, and done criteria when metadata exists.
- [ ] Metadata badges identify required, control, ignored, reward, formal, and credit behavior.
- [ ] Study Plan does not edit records, reward settings, wallpaper, or cloud data.

## Compatibility

- [ ] Daily planning still generates v2.4 quality tasks.
- [ ] History, Stats, Settings, rewards, cloud sync, wallpaper, and PWA navigation remain available.
- [ ] No secrets, temporary files, screenshots, QA scripts, `.env` files, exported data, `DESIGN.md`, or `read_projects.cjs` are committed.
