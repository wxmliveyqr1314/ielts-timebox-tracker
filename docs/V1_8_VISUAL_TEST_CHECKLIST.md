# V1.8 Visual Test Checklist

- [x] Run `npm test` and `npx tsc --noEmit` locally.
- [x] Review zero `bg-gradient` and zero `rounded-2xl` in StatsPage (`rg -n "bg-gradient|rounded-2xl" src/pages/StatsPage.tsx` yields no output).
- [x] Take real Playwright CLI screenshots using `npx --yes --package @playwright/cli playwright-cli`.
- [x] Verify 3 viewport sizes:
  - Mobile (390×844)
  - Tablet (768×1024)
  - Desktop (1440×900)
- [x] Verify pages:
  - History Page (with and without wallpaper)
  - Stats Page (with and without wallpaper)
- [x] Verify responsive behaviors:
  - History: Long task names do not hide minutes input on mobile.
  - History: Expand/collapse works without jumping.
  - Stats: Segmented bar renders proportionally.
  - Stats: Empty state displays neutral message without `NaN` or `Infinity`.
- [x] Ensure no horizontal scrollbars on mobile.
- [x] Ensure bottom padding prevents overlap with mobile navigation bar.
- [x] Check browser console for zero React errors or warnings.
