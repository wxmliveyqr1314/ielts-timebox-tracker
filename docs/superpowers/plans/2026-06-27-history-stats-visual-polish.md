# v1.8 History and Stats Visual Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a quiet, mobile-first History and Stats workbench with consistent wallpaper translucency, stronger scanning hierarchy, accessible controls, and no changes to existing calculations or persistence behavior.

**Architecture:** Keep `HistoryPage` and `StatsPage` connected to the existing `appData` and statistics utilities. Add one small presentation-only utility for display labels, add focused Testing Library page tests, and refactor JSX/CSS classes without changing `stats.ts`, `status.ts`, `sleepControl.ts`, localStorage, Supabase, or sync code.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Lucide React, Vitest, Testing Library, Playwright CLI, Vite.

---

## File Map

- Create `src/utils/display.ts`: presentation-only Focus Mode and duration labels.
- Create `src/utils/display.test.ts`: pure utility tests.
- Create `src/pages/HistoryPage.test.tsx`: History rendering and interaction regression tests.
- Modify `src/pages/HistoryPage.tsx`: History hierarchy, semantic expand control, rows, empty state, and malformed close symbol.
- Create `src/pages/StatsPage.test.tsx`: Stats rendering and empty-state regression tests.
- Modify `src/pages/StatsPage.tsx`: metric cards, status distribution, module bars, sleep rows, and visible copy.
- Modify `src/index.css`: narrowly scoped wallpaper surface variants only if page JSX cannot express them cleanly.
- Modify `package.json` and `package-lock.json`: bump version to `1.8.0` after behavior and visual checks pass.
- Create `docs/V1_8_VISUAL_TEST_CHECKLIST.md`: record real viewport and wallpaper validation.

Do not modify `src/utils/stats.ts`, `src/utils/status.ts`, `src/utils/sleepControl.ts`, `src/hooks/useAppData.ts`, `src/utils/cloudSync.ts`, or any Supabase file.

## Important Encoding Guard

PowerShell may display valid UTF-8 Chinese text as mojibake. Do not rewrite source strings based only on terminal output. Verify with `rg` and a real browser. The current source intentionally contains valid strings such as `学习统计` and `绿色或黄色都算不断线。目标是持续推进，而不是每天完美。`; the v1.8 UI may replace them with the approved English copy, but must not introduce corrupted byte sequences.

### Task 1: Prepare the feature branch and establish the baseline

**Files:** None

- [ ] **Step 1: Create the isolated feature branch**

```powershell
git switch main
git pull origin main
git switch -c feature/v1.8-history-stats-visual-polish
```

Expected: branch starts from the merge commit containing the approved v1.8 design and plan.

- [ ] **Step 2: Verify the baseline**

```powershell
git diff --check
npm test
npx tsc --noEmit
npm run build
```

Expected: all existing tests pass, TypeScript passes, build succeeds, and `git diff --check` has no output.

- [ ] **Step 3: Confirm protected files are untouched**

```powershell
git status --short
```

Expected: local `DESIGN.md` and `read_projects.cjs` may remain untracked; do not add or delete them.

### Task 2: Add presentation-only display helpers with TDD

**Files:**
- Create: `src/utils/display.ts`
- Test: `src/utils/display.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import { formatFocusMode, formatMinutes } from "./display";

describe("display helpers", () => {
  it.each([
    ["listening_focus", "Dictation"],
    ["reading_focus", "Reading"],
    ["speaking_focus", "Speaking"],
    ["recovery", "Recovery"],
  ])("formats %s", (value, expected) => {
    expect(formatFocusMode(value)).toBe(expected);
  });

  it("formats unknown values without exposing underscores", () => {
    expect(formatFocusMode("custom_mode")).toBe("Custom mode");
  });

  it.each([
    [0, "0m"],
    [59, "59m"],
    [60, "1h"],
    [125, "2h 5m"],
  ])("formats %i minutes", (value, expected) => {
    expect(formatMinutes(value)).toBe(expected);
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

```powershell
npx vitest run src/utils/display.test.ts
```

Expected: FAIL because `display.ts` does not exist.

- [ ] **Step 3: Implement the helpers**

```ts
const FOCUS_MODE_LABELS: Record<string, string> = {
  listening_focus: "Dictation",
  reading_focus: "Reading",
  speaking_focus: "Speaking",
  recovery: "Recovery",
};

export function formatFocusMode(value: string): string {
  const known = FOCUS_MODE_LABELS[value];
  if (known) return known;

  const normalized = value.replace(/_/g, " ").trim();
  if (!normalized) return "Unknown";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function formatMinutes(value: number): string {
  const minutes = Math.max(0, Math.floor(value || 0));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${remainder}m`;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h ${remainder}m`;
}
```

- [ ] **Step 4: Run focused tests**

```powershell
npx vitest run src/utils/display.test.ts
```

Expected: all display helper tests pass.

- [ ] **Step 5: Commit**

```powershell
git add src/utils/display.ts src/utils/display.test.ts
git commit -m "test: add history stats display helpers"
```

### Task 3: Lock History behavior with rendering tests

**Files:**
- Create: `src/pages/HistoryPage.test.tsx`
- Reference: `src/pages/HistoryPage.tsx`

- [ ] **Step 1: Create a typed History fixture and tests**

Use a complete `DailyRecord` fixture with four dates and statuses `green`, `yellow`, `red`, and `pending`. Each record must include the required timestamps, day type, energy level, sleep-control fields, workday bonus, and tasks. Include one task with the long title `A deliberately long task title that must not hide the minutes input on a narrow screen`.

```tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HistoryPage } from "./HistoryPage";
import { DailyRecord, DayStatus } from "../types";

afterEach(cleanup);

function makeRecord(date: string, status: DayStatus): DailyRecord {
  return {
    date,
    weekday: "Friday",
    startTime: "19:00",
    dayType: "listening_focus",
    energyLevel: "normal",
    exercised: false,
    status,
    stoppedAfter2230: true,
    noCompensatoryStayingUp: true,
    tomorrowFirstStep: "Open the listening notes and review one sentence",
    notes: "",
    bedtime: "22:20",
    workdayBonus: {
      momoMinutes: 0,
      passiveListeningMinutes: 0,
      dictationMinutes: 0,
      readingMinutes: 0,
    },
    tasks: [{
      id: `${date}-task`,
      title: "A deliberately long task title that must not hide the minutes input on a narrow screen",
      category: "dictation_new",
      plannedMinutes: 30,
      actualMinutes: 20,
      completed: true,
      isCore: true,
      isEveningTask: true,
      notes: "",
    }],
    createdAt: `${date}T00:00:00.000Z`,
    updatedAt: `${date}T12:00:00.000Z`,
  };
}

function renderHistory(records: Record<string, DailyRecord>) {
  const appData = {
    data: { records },
    updateRecord: vi.fn(),
    deleteRecord: vi.fn(),
  };
  render(<HistoryPage appData={appData} />);
  return appData;
}

describe("HistoryPage", () => {
  it("renders all status counts including pending", () => {
    renderHistory({
      a: makeRecord("2026-06-27", "green"),
      b: makeRecord("2026-06-26", "yellow"),
      c: makeRecord("2026-06-25", "red"),
      d: makeRecord("2026-06-24", "pending"),
    });
    expect(screen.getAllByText("Green").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Yellow").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Red").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Pending").length).toBeGreaterThan(0);
  });

  it("renders a calm empty state", () => {
    renderHistory({});
    expect(screen.getByText(/completed days will appear here/i)).toBeTruthy();
  });

  it("uses a semantic expand button and preserves editing controls", () => {
    renderHistory({ a: makeRecord("2026-06-27", "green") });
    fireEvent.click(screen.getByRole("button", { name: /expand jun 27, 2026/i }));
    expect(screen.getByDisplayValue("20")).toBeTruthy();
    expect(screen.getByPlaceholderText(/task notes/i)).toBeTruthy();
  });

  it("shows a readable focus mode label", () => {
    renderHistory({ a: makeRecord("2026-06-27", "green") });
    expect(screen.getByText("Dictation")).toBeTruthy();
    expect(screen.queryByText("listening_focus")).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test and confirm the new expectations fail**

```powershell
npx vitest run src/pages/HistoryPage.test.tsx
```

Expected: failures for the new empty-state copy, semantic expand button, pending summary, and display label.

- [ ] **Step 3: Commit the failing test checkpoint**

```powershell
git add src/pages/HistoryPage.test.tsx
git commit -m "test: define history visual behavior"
```

### Task 4: Implement the History workbench

**Files:**
- Modify: `src/pages/HistoryPage.tsx`
- Use: `src/utils/display.ts`

- [ ] **Step 1: Add pending count and display helpers**

Import `X`, `Clock3`, and `formatFocusMode`. Add:

```ts
const pendingDays = last7Days.filter((record) => record.status === "pending").length;
```

Replace raw `record.dayType.replace(...)` output with `formatFocusMode(record.dayType)`.

- [ ] **Step 2: Replace the summary with one segmented surface**

Create a local presentation component:

```tsx
function SummarySegment({ label, value, tone }: {
  label: string;
  value: number;
  tone: "slate" | "green" | "yellow" | "red";
}) {
  const tones = {
    slate: "text-slate-600",
    green: "text-emerald-600",
    yellow: "text-amber-600",
    red: "text-rose-600",
  };
  return (
    <div className="min-w-0 px-2 py-2 text-center border-r border-slate-200/70 last:border-r-0">
      <div className={`text-lg font-bold tabular-nums ${tones[tone]}`}>{value}</div>
      <div className="text-[10px] font-semibold text-slate-500">{label}</div>
    </div>
  );
}
```

Render the header and summary inside one `wallpaper-surface rounded-lg` panel, using five stable grid columns for Days, Green, Yellow, Red, and Pending. Do not nest additional cards inside this surface.

- [ ] **Step 3: Make every record header a semantic button**

Replace the clickable record-header `div` with:

```tsx
<button
  type="button"
  className="w-full p-4 text-left hover:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
  onClick={() => toggleExpand(record.date)}
  aria-expanded={isExpanded}
  aria-label={`${isExpanded ? "Collapse" : "Expand"} ${formatDateStr(record.date)}`}
>
  {/* Preserve the date, metrics, status badge, and chevron content. */}
</button>
```

Add a four-pixel semantic status edge to the repeated record card. Keep the status badge text visible.

- [ ] **Step 4: Flatten expanded task styling**

Keep `RecordDetail` and every update handler unchanged. Change task containers from floating cards to rows:

```tsx
<div className="py-3 border-b border-slate-200/70 last:border-b-0 space-y-2">
```

Use `break-words leading-snug` for task titles and keep the minute input in a stable `w-14 shrink-0` column. Inputs remain white or `bg-white/80` for readability.

- [ ] **Step 5: Repair feedback and empty state**

Use a Lucide `X` icon button with `aria-label="Dismiss message"`. Render the empty state as:

```tsx
<div className="py-14 text-center">
  <Calendar className="w-5 h-5 mx-auto text-slate-400 mb-3" />
  <p className="text-sm font-semibold text-slate-600">No history yet</p>
  <p className="text-xs text-slate-500 mt-1">Completed days will appear here.</p>
</div>
```

- [ ] **Step 6: Run History and regression tests**

```powershell
npx vitest run src/pages/HistoryPage.test.tsx
npm test
npx tsc --noEmit
```

Expected: all tests and type checking pass.

- [ ] **Step 7: Commit**

```powershell
git add src/pages/HistoryPage.tsx src/pages/HistoryPage.test.tsx
git commit -m "style: polish history workbench"
```

### Task 5: Lock Stats behavior with rendering tests

**Files:**
- Create: `src/pages/StatsPage.test.tsx`
- Reference: `src/pages/StatsPage.tsx`

- [ ] **Step 1: Write Stats rendering tests**

Reuse a complete `DailyRecord` fixture and render `StatsPage` with a green, yellow, red, and pending record. The fixture tasks must cover the valid `momo`, `dictation_new`, `reading_scan`, `speaking_shadowing`, and `passive_listening` categories.

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { StatsPage } from "./StatsPage";
import { DailyRecord } from "../types";

afterEach(cleanup);

function makeStatsRecord(
  date: string,
  status: DailyRecord["status"],
): DailyRecord {
  const task = (
    id: string,
    category: DailyRecord["tasks"][number]["category"],
    actualMinutes: number,
  ): DailyRecord["tasks"][number] => ({
    id: `${date}-${id}`,
    title: id,
    category,
    plannedMinutes: actualMinutes,
    actualMinutes,
    completed: actualMinutes > 0,
    isCore: category !== "passive_listening",
    isEveningTask: category !== "passive_listening",
    notes: "",
  });

  return {
    date,
    weekday: "Friday",
    startTime: "19:00",
    dayType: "listening_focus",
    energyLevel: "normal",
    exercised: false,
    status,
    stoppedAfter2230: true,
    noCompensatoryStayingUp: true,
    tomorrowFirstStep: "Review one sentence",
    notes: "",
    bedtime: "22:20",
    workdayBonus: {
      momoMinutes: 0,
      passiveListeningMinutes: 0,
      dictationMinutes: 0,
      readingMinutes: 0,
    },
    tasks: [
      task("Momo", "momo", 20),
      task("Dictation", "dictation_new", 30),
      task("Reading", "reading_scan", 20),
      task("Speaking", "speaking_shadowing", 10),
      task("Passive listening", "passive_listening", 15),
    ],
    createdAt: `${date}T00:00:00.000Z`,
    updatedAt: `${date}T12:00:00.000Z`,
  };
}

function makeStatsRecords(): Record<string, DailyRecord> {
  return {
    "2026-06-27": makeStatsRecord("2026-06-27", "green"),
    "2026-06-26": makeStatsRecord("2026-06-26", "yellow"),
    "2026-06-25": makeStatsRecord("2026-06-25", "red"),
    "2026-06-24": makeStatsRecord("2026-06-24", "pending"),
  };
}

describe("StatsPage", () => {
  it("renders the approved heading and core sections", () => {
    const records: Record<string, DailyRecord> = makeStatsRecords();
    render(<StatsPage appData={{ data: { records } }} />);
    expect(screen.getByRole("heading", { name: "Stats" })).toBeTruthy();
    expect(screen.getByText("Current streak")).toBeTruthy();
    expect(screen.getByText("Status distribution")).toBeTruthy();
    expect(screen.getByText("Time by module")).toBeTruthy();
    expect(screen.getByText("Sleep control")).toBeTruthy();
  });

  it("shows explicit counts for every status", () => {
    render(<StatsPage appData={{ data: { records: makeStatsRecords() } }} />);
    for (const label of ["Green", "Yellow", "Red", "Pending"]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it("renders a neutral empty state without invalid percentages", () => {
    const { container } = render(<StatsPage appData={{ data: { records: {} } }} />);
    expect(screen.getByText(/complete a day to see your trends/i)).toBeTruthy();
    expect(container.innerHTML).not.toContain("NaN");
    expect(container.innerHTML).not.toContain("Infinity");
  });

  it("renders the approved supporting message", () => {
    render(<StatsPage appData={{ data: { records: {} } }} />);
    expect(screen.getByText(/steady progress, not daily perfection/i)).toBeTruthy();
  });
});
```

The fixture deliberately uses deterministic dates and complete required fields rather than mocking `stats.ts`; the test exercises the real utility functions.

- [ ] **Step 2: Run the test and verify it fails**

```powershell
npx vitest run src/pages/StatsPage.test.tsx
```

Expected: failures for the new English headings, empty state, and revised distribution structure.

- [ ] **Step 3: Commit the failing test checkpoint**

```powershell
git add src/pages/StatsPage.test.tsx
git commit -m "test: define stats visual behavior"
```

### Task 6: Implement the Stats workbench

**Files:**
- Modify: `src/pages/StatsPage.tsx`
- Use: `src/utils/display.ts`

- [ ] **Step 1: Add a zero-record branch and approved page copy**

Render the `Stats` heading and seven-day context for every state. When `allRecords.length === 0`, show:

```tsx
<div className="wallpaper-surface rounded-lg border border-slate-200 p-6 text-center">
  <Activity className="w-5 h-5 mx-auto text-slate-400 mb-3" />
  <p className="text-sm font-semibold text-slate-700">No stats yet</p>
  <p className="text-xs text-slate-500 mt-1">Complete a day to see your trends.</p>
</div>
```

The supporting message remains visible below the empty state.

- [ ] **Step 2: Replace gradient metric cards**

Create a local presentation component:

```tsx
function MetricCard({ label, value, detail, icon, accent }: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  accent: "orange" | "indigo" | "emerald";
}) {
  const accents = {
    orange: "text-orange-600 bg-orange-50/80",
    indigo: "text-indigo-600 bg-indigo-50/80",
    emerald: "text-emerald-600 bg-emerald-50/80",
  };
  return (
    <div className="wallpaper-surface rounded-lg border border-slate-200 p-4 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-600">{label}</span>
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${accents[accent]}`}>{icon}</span>
      </div>
      <div className="mt-3 text-2xl font-bold text-slate-900 tabular-nums">{value}</div>
      <div className="mt-1 text-[11px] text-slate-500">{detail}</div>
    </div>
  );
}
```

Use `formatMinutes(moduleMins.totalFormal)` for the study value. Use a two-column mobile grid with the Current streak card spanning both columns, and three columns at `sm` width.

- [ ] **Step 3: Implement segmented status distribution**

Calculate `recentCount` from the four status counts. Only render bar segments when `recentCount > 0`:

```tsx
const statusItems = [
  { label: "Green", value: statusCounts.green, color: "bg-emerald-500" },
  { label: "Yellow", value: statusCounts.yellow, color: "bg-amber-500" },
  { label: "Red", value: statusCounts.red, color: "bg-rose-500" },
  { label: "Pending", value: statusCounts.pending, color: "bg-slate-400" },
];
```

Each segment width is `(item.value / recentCount) * 100`. Below the bar, render all four labels and explicit counts. Never render `NaN%`.

- [ ] **Step 4: Refine module and sleep sections**

Retain `StatBar` values and real `stats.ts` output. Change section wrappers to `wallpaper-surface rounded-lg`. Use stable `h-2` tracks and tabular numbers. Render sleep statistics as three border-separated rows rather than nested cards; labels remain `Stopped on time`, `Late new task`, and `Compensatory stay up`.

- [ ] **Step 5: Apply the approved footer copy**

```tsx
<p className="px-4 text-center text-xs leading-relaxed text-slate-500">
  Green and yellow both keep the streak alive. The goal is steady progress, not daily perfection.
</p>
```

- [ ] **Step 6: Run Stats and regression tests**

```powershell
npx vitest run src/pages/StatsPage.test.tsx
npm test
npx tsc --noEmit
```

Expected: all tests and type checking pass. Do not change any expected value in existing `stats.ts` tests.

- [ ] **Step 7: Commit**

```powershell
git add src/pages/StatsPage.tsx src/pages/StatsPage.test.tsx
git commit -m "style: polish stats workbench"
```

### Task 7: Complete responsive, wallpaper, and release validation

**Files:**
- Modify only if required: `src/index.css`
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `docs/V1_8_VISUAL_TEST_CHECKLIST.md`

- [ ] **Step 1: Scan for structural and encoding regressions**

```powershell
rg -n "bg-gradient|rounded-2xl|脳|�" src/pages/HistoryPage.tsx src/pages/StatsPage.tsx
rg -n "学习统计|绿色或黄色" src/pages/StatsPage.tsx
```

Expected: no gradients, oversized record/section radii, malformed close symbols, or replacement characters. Valid Chinese source may remain only if intentionally retained; browser-visible v1.8 copy must match the approved English design.

- [ ] **Step 2: Bump the release version**

Change `package.json` version to `1.8.0`, then synchronize the lockfile without changing dependency versions:

```powershell
npm install --package-lock-only
```

Expected: only version metadata changes in `package.json` and `package-lock.json`.

- [ ] **Step 3: Create the manual validation checklist**

```markdown
# v1.8 History and Stats Visual Test Checklist

## Viewports
- [ ] 390 x 844
- [ ] 768 x 1024
- [ ] 1440 x 900

## History
- [ ] Green, yellow, red, and pending are readable with text labels.
- [ ] Long task title wraps without covering the minutes input.
- [ ] Expand/collapse works by keyboard and pointer.
- [ ] Editing controls and delete confirmation still work.
- [ ] Empty state is calm and correctly centered.

## Stats
- [ ] Core metric cards do not overlap.
- [ ] Status bar never renders NaN or Infinity.
- [ ] Module and sleep rows remain aligned.
- [ ] Empty state and footer message are readable.

## Wallpaper
- [ ] Repeat History and Stats checks with wallpaper enabled.
- [ ] Repeat History and Stats checks with wallpaper disabled.
- [ ] Foreground scrolls while wallpaper remains fixed.
- [ ] No horizontal overflow or bottom-nav obstruction.
```

- [ ] **Step 4: Run real Playwright CLI validation**

Do not install `@playwright/test`, Puppeteer, or generate mock screenshots. Use the available CLI:

```powershell
npm run dev -- --host 127.0.0.1 --port 4174
npx --yes --package @playwright/cli playwright-cli -s=v18 open http://127.0.0.1:4174
npx --yes --package @playwright/cli playwright-cli -s=v18 resize 390 844
npx --yes --package @playwright/cli playwright-cli -s=v18 screenshot --filename output/playwright/v1.8/history-mobile.png
npx --yes --package @playwright/cli playwright-cli -s=v18 resize 768 1024
npx --yes --package @playwright/cli playwright-cli -s=v18 screenshot --filename output/playwright/v1.8/stats-tablet.png
npx --yes --package @playwright/cli playwright-cli -s=v18 resize 1440 900
npx --yes --package @playwright/cli playwright-cli -s=v18 screenshot --filename output/playwright/v1.8/stats-desktop.png
```

Use a deterministic localStorage fixture or JSON import so History and Stats contain green, yellow, red, pending, long-title, and empty-state cases. Repeat screenshots with the existing local wallpaper cache enabled. Screenshots must come from the running app. Keep screenshot artifacts local unless the user explicitly requests committing them.

- [ ] **Step 5: Run final quality gates**

```powershell
git diff --check origin/main...HEAD
npm test
npx tsc --noEmit
npm run build
git status --short
git diff --stat origin/main...HEAD
git diff --name-only origin/main...HEAD
```

Expected:

- all tests pass;
- TypeScript and build pass;
- `git diff --check` has no output;
- no protected data, storage, sync, Supabase, status, sleep-control, or statistics utility file appears in the changed-file list;
- only `DESIGN.md` and `read_projects.cjs` may remain untracked.

- [ ] **Step 6: Commit release and validation files**

```powershell
git add package.json package-lock.json docs/V1_8_VISUAL_TEST_CHECKLIST.md src/index.css
git commit -m "chore: finalize v1.8 visual validation"
```

If `src/index.css` did not require a change, omit it from the `git add` command.

- [ ] **Step 7: Push for Codex review**

```powershell
git push -u origin feature/v1.8-history-stats-visual-polish
```

Do not create a PR. Report the branch, commit hashes, exact changed-file list, test count, type-check result, build result, `git diff --check` result, browser screenshot paths, and any remaining warning.

## Final Review Boundaries

Codex must reject the branch if any of the following occurs:

- statistics or status calculations change;
- History editing or deletion behavior changes;
- localStorage, cloud sync, wallpaper storage, or Supabase files change;
- generated images are presented as browser screenshots;
- `git diff --check` reports whitespace errors;
- valid UTF-8 text is replaced because of terminal mojibake;
- `DESIGN.md` or `read_projects.cjs` is committed;
- mobile horizontal overflow, text overlap, or bottom navigation obstruction remains.
