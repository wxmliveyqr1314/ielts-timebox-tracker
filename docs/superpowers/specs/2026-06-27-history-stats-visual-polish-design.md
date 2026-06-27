# v1.8 History and Stats Visual Polish Design

## Status

Approved for implementation planning on 2026-06-27.

## Objective

Bring the History and Stats pages up to the visual quality of Daily and Settings while preserving all existing calculations, editing behavior, deletion semantics, local-first storage, and manual cloud sync behavior.

The product direction is a quiet data workbench: compact, easy to scan, stable over repeated daily use, and readable with or without a wallpaper.

## Scope

### Included

- Refine History page hierarchy, record scanning, expanded details, empty state, and delete feedback.
- Refine Stats page hierarchy, core metrics, status distribution, module minutes, sleep-control summary, and empty states.
- Standardize translucent wallpaper surfaces and non-wallpaper fallback surfaces.
- Repair corrupted visible strings and malformed close symbols in the touched pages.
- Add focused rendering tests for the changed presentation behavior.
- Perform real browser validation at mobile, tablet, and desktop viewports.
- Bump the application version to 1.8.0 after implementation is complete.

### Excluded

- Changes to statistics formulas or category matching.
- Changes to streak, status, recovery-day, or sleep-control rules.
- Changes to History editing, tombstones, localStorage, Supabase, or sync algorithms.
- Automatic cloud synchronization or realtime subscriptions.
- New charting dependencies.
- Redesign of Daily, Settings, global navigation, authentication, or wallpaper storage.

## Design Principles

1. **Scanning before decoration.** Dates, status, and core metrics must be understandable at a glance.
2. **Color is semantic.** Green, amber, and rose communicate status; they are not large decorative backgrounds.
3. **One structural layer.** Avoid cards nested inside cards. Use separators and rows inside expanded records and statistical sections.
4. **Wallpaper is supporting context.** Content remains readable without hiding the wallpaper entirely.
5. **Mobile is the primary constraint.** Layout decisions must work at 390 px before wider breakpoints are considered.
6. **Behavior remains stable.** Presentation changes must not alter calculations or persisted data.

## History Page

### Header and Seven-Day Summary

- Introduce a compact heading row with `History` as the primary title and `Last 7 days` as supporting context.
- Replace the current collection of visually separate summary tiles with one segmented summary surface.
- Display total recorded days plus green, yellow, red, and pending counts.
- Every segment includes a text label and value so meaning does not depend on color alone.
- Pending remains neutral slate and must never be presented as a failure.

### Record List

- Keep one repeated record card per date.
- Add a narrow status-colored edge or marker to improve vertical scanning.
- First row: formatted date, weekday, status label, and expand/collapse icon.
- Second row: readable Focus Mode label, energy level, and key minute metrics.
- Optional tomorrow-first-step text appears as a restrained third line and truncates safely.
- Replace raw enum labels such as `listening_focus` with the established user-facing names: Dictation, Reading, Speaking, and Recovery.
- Long labels must use `min-w-0`, wrapping, or truncation without pushing the status control off-screen.

### Expanded Record

- Preserve all existing editing controls and update functions.
- Render tasks as separated rows inside the expanded record instead of nested floating cards.
- Keep completion, actual minutes, and notes fully editable.
- Sleep-control tasks continue to show `--` instead of an actual-minutes input.
- Daily details use clear labels and consistent full-width controls.
- Sleep-control toggles remain synchronized through the existing helper functions.
- Delete Record stays at the bottom, visually secondary, with the current two-step confirmation and cloud-sync explanation.

### Feedback and Empty State

- Replace the malformed delete-message close character with a Lucide `X` icon and accessible label.
- Empty History shows a compact, calm state explaining that completed days will appear here.
- Do not add instructional marketing copy or illustrations.

## Stats Page

### Page Header

- Use `Stats` as the primary heading with a concise seven-day context label.
- Repair all mojibake and corrupted visible strings in the file.
- Use English copy consistently with the rest of the application.

### Core Metrics

- Preserve the three existing metrics: current streak, seven-day formal study time, and seven-day speaking execution.
- Present them as repeated metric cards with neutral surfaces and restrained orange, indigo, and emerald accents.
- Remove large colored gradients.
- Use compact typography appropriate for a dashboard; values are prominent but must not resize the layout.
- On narrow screens, use a stable two-column arrangement where practical, with the primary streak metric allowed to span the full width if needed.

### Status Distribution

- Replace four isolated status tiles with a compact distribution section.
- Include a segmented horizontal bar when at least one recent record exists.
- Also display explicit green, yellow, red, and pending counts beneath or beside the bar.
- For zero recent records, show a neutral empty state instead of an empty colored bar.

### Module Minutes

- Retain the existing progress-bar presentation and all current module values.
- Use the largest observed module value or the existing stable targets only for visual width; do not change the numbers shown.
- Keep labels, icons, values, and progress tracks aligned at every viewport.
- Zero values remain visible and understandable.

### Sleep Control

- Present stopped-on-time, late-new-task, and compensatory-staying-up as three comparison rows.
- Use emerald only for successful control and rose only for actual failures.
- Pending records remain excluded according to the existing statistics utility.
- The section must not imply that missing data is a failure.

### Footer Message

- Replace the corrupted quote with: `Green and yellow both keep the streak alive. The goal is steady progress, not daily perfection.`
- Render it as restrained supporting text, not a decorative card.

## Visual System

### Surfaces

- Standard cards use an 8 px radius, fine border, and restrained shadow.
- Repeated record and metric cards may use the existing wallpaper surface utility.
- Avoid page-section cards nested inside another card.
- No decorative gradients, floating color blobs, or oversized hero typography.

### Wallpaper Mode

- Retain the current fixed content-area wallpaper implementation.
- Use translucent light surfaces at approximately the existing 65% opacity with backdrop blur.
- Text and input controls retain sufficient contrast over bright and dark wallpapers.
- Status colors remain identifiable without becoming translucent color washes.

### Standard Mode

- Without a wallpaper, use the existing white and slate workbench palette.
- The pages must look complete without relying on wallpaper imagery.

### Typography and Icons

- Use Lucide icons only.
- Use compact headings, normal letter spacing, and readable line heights.
- Uppercase micro-labels are limited to short metadata labels.
- Controls use familiar icons with accessible labels where text is omitted.

## Component Boundaries

Small presentational helpers may be extracted when they reduce duplication, for example:

- `StatusSummary`
- `StatusBadge`
- `MetricCard`
- `StatBar`
- Focus Mode display-name formatter
- Minute-duration formatter

These helpers remain presentation-only. They must not import storage, Supabase, or mutate records.

The existing History update handlers and all functions in `stats.ts`, `status.ts`, and `sleepControl.ts` remain the behavioral source of truth.

## Accessibility and Responsive Rules

- Status always includes text, not color alone.
- Icon-only buttons receive an accessible name.
- Interactive rows remain keyboard-operable; use a real button for expand/collapse rather than relying only on a clickable `div`.
- Inputs and buttons retain comfortable touch targets.
- No horizontal overflow at 390 px.
- Long dates, task titles, notes, and result labels wrap or truncate deliberately.
- Bottom content includes enough padding to remain visible above the fixed navigation.

## Testing

### Automated

- History renders green, yellow, red, and pending labels correctly.
- History empty state renders when there are no records.
- History expand/collapse retains editing controls.
- Long task names do not remove or obscure the minutes control.
- Stats renders correct values supplied by the existing utility functions.
- Stats zero-record state renders without invalid percentages or misleading failures.
- Corrupted visible strings are absent from rendered output.
- Existing utility tests remain unchanged and passing.

### Real Browser Validation

Run the application and capture actual screenshots, not generated mockups, at:

- 390 x 844
- 768 x 1024
- 1440 x 900

Validate each page with wallpaper enabled and disabled. Check:

- no horizontal overflow;
- wallpaper remains fixed while foreground content scrolls;
- text contrast remains readable;
- expanded History controls fit the viewport;
- Stats labels and values do not overlap;
- bottom navigation does not obscure content;
- no new console errors.

## Acceptance Criteria

1. History and Stats visually match the quality and restraint of Daily and Settings.
2. All visible mojibake and malformed symbols in the touched pages are removed.
3. Existing record editing, deletion, status, streak, module, sleep, and speaking behavior remains unchanged.
4. Wallpaper and non-wallpaper modes are both readable and visually coherent.
5. Automated tests, TypeScript, production build, and `git diff --check` pass.
6. Real browser screenshots exist for all three required viewports.
7. Settings displays version 1.8.0 in the production build.

