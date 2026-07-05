# v2.1 Dynamic Daily Planning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an explainable dynamic Daily planner that converts daily conditions and completed-earlier study into a capacity-aware plan while preserving real progress and historical compatibility.

**Architecture:** A pure planning engine consumes versioned registry/profile data and returns tasks plus a persisted plan snapshot. A separate progress module previews and safely merges regenerated plans. Daily, status, History, and Stats consume the same snapshot and credit data without changing LocalStorage or Supabase transport boundaries.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Tailwind CSS 4, Vitest 4, Testing Library, Playwright, LocalStorage, existing manual Supabase JSON sync.

---

## Guardrails

- Execute on `feature/v2.1-dynamic-daily-planning` created from current `origin/main` after the documentation PR is merged.
- Do not modify cloud merge semantics, tombstones, authentication, wallpaper, PWA caching, or Supabase schema.
- Do not auto-detect alternating work weeks.
- Do not add AI, automatic sync, automatic regeneration, or cross-category credit.
- Preserve legacy records and their existing status path.
- Never mutate input records, task arrays, registry objects, or plan results.
- Keep passive listening outside focused capacity and status.
- Keep Recovery at or below 60 minutes.
- Preserve real task progress and notes across regeneration.
- Do not stage `DESIGN.md`, `read_projects.cjs`, screenshots, `.env`, or test artifacts.
- Use TDD for every planning/status/data helper and component behavior.

## File Map

- Modify `src/types/index.ts`: optional v2.1 record fields and planning contracts.
- Create `src/planning/taskRegistry.ts`: stable task definitions.
- Create `src/planning/focusProfiles.ts`: versioned Low/Normal/High mode profiles.
- Create `src/planning/planEngine.ts` and test: pure planning pipeline.
- Create `src/planning/planProgress.ts` and test: preview and progress-safe regeneration.
- Delete `src/utils/tasks.ts` after all callers move to the engine.
- Modify `src/utils/status.ts` and create/extend tests: legacy and dynamic status dispatch.
- Modify `src/utils/stats.ts` and tests: count every completed-earlier category once.
- Create `src/components/daily/PlanSummary.tsx`: plan arithmetic and explanations.
- Create `src/components/daily/PlanSections.tsx`: Completed Earlier, core, parallel, carried progress, and controls.
- Create `src/components/daily/RegenerationPreview.tsx`: explicit plan difference confirmation.
- Modify `src/pages/DailyPage.tsx` and add component tests: new inputs and engine integration.
- Modify `src/pages/HistoryPage.tsx` and tests: snapshot display and historical regeneration warning.
- Modify `src/utils/dataHealth.ts` and tests: optional snapshot validation.
- Create `e2e/dynamic-daily-plan.spec.ts`: critical user flow and responsive checks.
- Modify `package.json`: bump version to `2.1.0` only in the release task.
- Create `docs/V2_1_DYNAMIC_PLAN_RELEASE_CHECKLIST.md` and update `docs/PROJECT_HANDOFF.md`.

---

### Task 1: Prepare The Feature Branch And Planning Contracts

**Files:**
- Modify: `src/types/index.ts`
- Create: `src/planning/planTypes.test.ts`

- [ ] **Step 1: Create the branch from current main**

```powershell
git switch main
git pull origin main
git switch -c feature/v2.1-dynamic-daily-planning
git status --short
```

Expected: the feature branch is active; only known local untracked files remain.

- [ ] **Step 2: Write a compile-time/runtime contract test**

Create `src/planning/planTypes.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type {
  DailyPlanInput,
  DailyPlanSnapshot,
  DailyRecord,
  TaskCheckItem,
} from "../types";

describe("v2.1 planning contracts", () => {
  it("keeps new DailyRecord planning fields optional for legacy data", () => {
    const legacy = {
      date: "2026-07-05",
      weekday: "Sunday",
      exercised: false,
      startTime: "18:00",
      energyLevel: "normal",
      dayType: "listening_focus",
      workdayBonus: { passiveListeningMinutes: 0 },
      tasks: [],
      stoppedAfter2230: false,
      noCompensatoryStayingUp: false,
      tomorrowFirstStep: "",
      status: "pending",
      createdAt: "2026-07-05T00:00:00.000Z",
      updatedAt: "2026-07-05T00:00:00.000Z",
    } satisfies DailyRecord;
    expect(legacy.date).toBe("2026-07-05");
  });

  it("represents a versioned dynamic plan without browser state", () => {
    const input: DailyPlanInput = {
      exercised: false,
      energyLevel: "normal",
      dayType: "listening_focus",
      dayContext: "workday",
      workdayBonus: {
        passiveListeningMinutes: 75,
        momoMinutes: 20,
        dictationMinutes: 30,
        readingMinutes: 0,
      },
    };
    const snapshot: DailyPlanSnapshot = {
      engineVersion: 1,
      generatedAt: "2026-07-05T10:00:00.000Z",
      input,
      credits: [],
      summary: {
        standardCoreMinutes: 175,
        energyAdjustedCoreMinutes: 175,
        appliedCoreCreditMinutes: 50,
        extraCompletedMinutes: 15,
        capacityMinutes: 270,
        capacityTrimmedMinutes: 0,
        eveningCoreTargetMinutes: 125,
        passiveReferenceMinutes: 60,
        passiveReferenceRemainingMinutes: 0,
      },
      adjustmentCodes: [],
    };
    expect(snapshot.engineVersion).toBe(1);
  });

  it("allows stable optional task metadata", () => {
    const task = {
      id: "plan:dictation:new",
      title: "New dictation",
      category: "dictation_new",
      plannedMinutes: 50,
      actualMinutes: 0,
      completed: false,
      isCore: true,
      isEveningTask: true,
      definitionId: "dictation-new",
      entryId: "dictation:new",
      creditGroup: "dictation",
      capacityKind: "focused",
      statusRole: "required",
    } satisfies TaskCheckItem;
    expect(task.entryId).toBe("dictation:new");
  });
});
```

- [ ] **Step 3: Run the contract test and verify failure**

```powershell
npx vitest run src/planning/planTypes.test.ts
```

Expected: FAIL because the new planning types do not exist.

- [ ] **Step 4: Add the planning contracts**

Add to `src/types/index.ts` exactly the `DayContext`, `CreditGroup`, `CapacityKind`, `StatusRole`, `PlanAdjustmentCode`, `DailyPlanInput`, `PlanCredit`, `PlanSummary`, `DailyPlanSnapshot`, and `DailyPlanResult` contracts defined in the design. Add the optional metadata fields to `TaskCheckItem`, optional snapshot fields to `DailyRecord`, and extend `startTime` with `17:00`.

Use this adjustment union so UI copy is exhaustive:

```ts
export type PlanAdjustmentCode =
  | "low_energy"
  | "high_energy"
  | "workout_start"
  | "workday_credit"
  | "rest_day"
  | "manual_capacity"
  | "capacity_trimmed"
  | "passive_reference_met"
  | "recovery_no_increase";
```

- [ ] **Step 5: Re-run test and typecheck**

```powershell
npx vitest run src/planning/planTypes.test.ts
npm run typecheck
```

Expected: PASS and zero TypeScript errors.

- [ ] **Step 6: Commit**

```powershell
git add src/types/index.ts src/planning/planTypes.test.ts
git commit -m "feat: add dynamic planning contracts"
```

---

### Task 2: Add The Extensible Registry And Versioned Profiles

**Files:**
- Create: `src/planning/taskRegistry.ts`
- Create: `src/planning/focusProfiles.ts`
- Create: `src/planning/focusProfiles.test.ts`

- [ ] **Step 1: Write profile integrity tests**

Create tests that assert exact totals and registry references:

```ts
import { describe, expect, it } from "vitest";
import { FOCUS_PROFILES, getProfileVariant } from "./focusProfiles";
import { TASK_REGISTRY } from "./taskRegistry";

describe("focus profiles", () => {
  it.each([
    ["listening_focus", "low", 120],
    ["listening_focus", "normal", 175],
    ["listening_focus", "high", 200],
    ["reading_focus", "low", 135],
    ["reading_focus", "normal", 190],
    ["reading_focus", "high", 220],
    ["speaking_focus", "low", 90],
    ["speaking_focus", "normal", 130],
    ["speaking_focus", "high", 150],
    ["recovery", "low", 45],
    ["recovery", "normal", 60],
    ["recovery", "high", 60],
  ] as const)("%s %s totals %i focused minutes", (mode, energy, expected) => {
    const total = getProfileVariant(mode, energy).entries.reduce(
      (sum, entry) => sum + entry.plannedMinutes,
      0,
    );
    expect(total).toBe(expected);
  });

  it("references only registered task definitions and unique entry IDs", () => {
    for (const profile of Object.values(FOCUS_PROFILES)) {
      for (const variant of Object.values(profile.variants)) {
        const ids = variant.entries.map((entry) => entry.entryId);
        expect(new Set(ids).size).toBe(ids.length);
        variant.entries.forEach((entry) => {
          expect(TASK_REGISTRY[entry.definitionId]).toBeDefined();
        });
      }
    }
  });
});
```

- [ ] **Step 2: Verify the test fails**

```powershell
npx vitest run src/planning/focusProfiles.test.ts
```

Expected: FAIL because registry/profile modules do not exist.

- [ ] **Step 3: Implement registry and profiles**

Implement `TaskDefinition` and `ProfileEntry` as immutable records. Use deterministic IDs and the exact totals from the design. Required definitions include Momo, each current dictation/reading/speaking subtype, mixed review, wrap-up, passive listening, both sleep controls, and one separate stretch definition for each non-Recovery focus.

Export frozen data and these accessors:

```ts
export function getTaskDefinition(id: string): TaskDefinition;
export function getProfileVariant(dayType: DayType, energy: EnergyLevel): FocusProfileVariant;
```

Recovery High must return the same 60-minute entry set as Recovery Normal.

- [ ] **Step 4: Run profile tests**

```powershell
npx vitest run src/planning/focusProfiles.test.ts
```

Expected: 12 total cases plus registry integrity pass.

- [ ] **Step 5: Commit**

```powershell
git add src/planning/taskRegistry.ts src/planning/focusProfiles.ts src/planning/focusProfiles.test.ts
git commit -m "feat: add versioned task registry and focus profiles"
```

---

### Task 3: Implement The Pure Plan Engine

**Files:**
- Create: `src/planning/planEngine.ts`
- Create: `src/planning/planEngine.test.ts`

- [ ] **Step 1: Write failing table-driven planning tests**

The test file must cover at least these named cases with exact assertions:

```ts
it("uses 270 focused minutes for a workday without workout");
it("uses 210 focused minutes for a workday with workout");
it("uses 330 focused minutes for a rest day without workout");
it("uses 270 focused minutes for a rest day with workout");
it("clamps a manual capacity to 0..480");
it("applies Momo and dictation credit one-to-one on Dictation day");
it("does not apply reading credit to a Dictation target");
it("records credit above its matching target as extra");
it("treats passive listening as a 60 minute reference outside capacity");
it("omits the passive task after the reference is met");
it("trims stretch and low-priority tasks before required tasks");
it("keeps Recovery High at 60 minutes");
it("returns deterministic task IDs and does not mutate input");
```

Use this canonical arithmetic case:

```ts
const result = buildDailyPlan({
  exercised: false,
  energyLevel: "normal",
  dayType: "listening_focus",
  dayContext: "workday",
  workdayBonus: {
    passiveListeningMinutes: 75,
    momoMinutes: 20,
    dictationMinutes: 30,
    readingMinutes: 10,
  },
});

expect(result.snapshot.summary).toEqual({
  standardCoreMinutes: 175,
  energyAdjustedCoreMinutes: 175,
  appliedCoreCreditMinutes: 50,
  extraCompletedMinutes: 25,
  capacityMinutes: 270,
  capacityTrimmedMinutes: 0,
  eveningCoreTargetMinutes: 125,
  passiveReferenceMinutes: 60,
  passiveReferenceRemainingMinutes: 0,
});
```

`extraCompletedMinutes` is 15 excess passive plus 10 unrelated reading; it is display-only and not core credit.

- [ ] **Step 2: Verify engine tests fail**

```powershell
npx vitest run src/planning/planEngine.test.ts
```

Expected: FAIL because `buildDailyPlan` does not exist.

- [ ] **Step 3: Implement input normalization and capacity calculation**

Export:

```ts
export function getDefaultFocusedMinutes(
  dayContext: DayContext,
  exercised: boolean,
): number;

export function buildDailyPlan(input: DailyPlanInput): DailyPlanResult;
```

Normalize numbers without mutating `input`. Use integer minutes and the exact capacity table in the design.

- [ ] **Step 4: Implement grouped credit**

Aggregate selected profile entries by `creditGroup`, apply credit in configured order, record applied/extra values, and remove zero-minute entries. Never inspect title strings to determine behavior.

- [ ] **Step 5: Implement priority capacity trimming**

Exclude parallel/control tasks. Remove optional stretch entries before reducing required entries. Reduce by registry increments and honor minimums, with wrap-up retained. Record `capacity_trimmed` when any focused target is removed.

- [ ] **Step 6: Build deterministic tasks and snapshot**

Task IDs use `plan:${entryId}`. Populate all optional v2.1 task metadata. Add passive only when reference remains and append stable sleep-control tasks. Return a snapshot without `generatedAt`.

- [ ] **Step 7: Run tests and typecheck**

```powershell
npx vitest run src/planning/planEngine.test.ts
npm run typecheck
```

Expected: all engine tests pass and no type errors.

- [ ] **Step 8: Commit**

```powershell
git add src/planning/planEngine.ts src/planning/planEngine.test.ts
git commit -m "feat: add capacity-aware daily plan engine"
```

---

### Task 4: Add Regeneration Preview And Progress-Safe Merge

**Files:**
- Create: `src/planning/planProgress.ts`
- Create: `src/planning/planProgress.test.ts`

- [ ] **Step 1: Write failing merge and preview tests**

Cover exact stable-ID match, legacy category/title fallback, one-to-one claiming, removed task with progress, removed untouched task, changed minutes, notes, and input immutability.

Use these contracts:

```ts
export interface PlanDifference {
  added: TaskCheckItem[];
  removed: TaskCheckItem[];
  changed: Array<{
    entryId: string;
    title: string;
    fromMinutes: number;
    toMinutes: number;
  }>;
  carriedForward: TaskCheckItem[];
}

export function previewPlanDifference(
  current: TaskCheckItem[],
  next: TaskCheckItem[],
): PlanDifference;

export function mergePlanProgress(
  current: TaskCheckItem[],
  next: TaskCheckItem[],
): TaskCheckItem[];
```

The critical assertion is:

```ts
expect(merged).toContainEqual(expect.objectContaining({
  actualMinutes: 25,
  notes: "real work",
  carriedForward: true,
  isCore: false,
  plannedMinutes: 0,
}));
```

- [ ] **Step 2: Verify tests fail**

```powershell
npx vitest run src/planning/planProgress.test.ts
```

- [ ] **Step 3: Implement claimed-index matching**

Match in order: `entryId`, then `definitionId + title`, then legacy `category + title`. Track claimed old indexes in a `Set<number>`. Never use broad category fallback alone for v2.1 tasks.

- [ ] **Step 4: Preserve unmatched real progress**

Retain unmatched old tasks only when `actualMinutes > 0`, `completed`, or notes are nonempty. Convert them to carried-forward optional tasks without changing their actual values.

- [ ] **Step 5: Run tests and commit**

```powershell
npx vitest run src/planning/planProgress.test.ts
npm run typecheck
git add src/planning/planProgress.ts src/planning/planProgress.test.ts
git commit -m "feat: add safe plan regeneration preview"
```

---

### Task 5: Add Dynamic Status And Correct Module Statistics

**Files:**
- Modify: `src/utils/status.ts`
- Create: `src/utils/status.test.ts`
- Modify: `src/utils/stats.ts`
- Create or modify: `src/utils/stats.test.ts`

- [ ] **Step 1: Capture legacy status behavior in tests**

Add fixtures for legacy Green, Yellow, Red, and Pending records without `planSnapshot`. Assert their current outputs before refactoring.

- [ ] **Step 2: Add failing dynamic status tests**

Test 0%, 59%, 60%, 99%, and 100% ratios; passive exclusion; unrelated extra credit; required task incompleteness; wrap-up; both sleep controls; and a plan completely offset by matching credit.

- [ ] **Step 3: Split legacy and dynamic calculators**

Keep exported `calculateColorStatus(record)` as the dispatcher:

```ts
export function calculateColorStatus(record: Partial<DailyRecord>): DayStatus {
  return record.planSnapshot
    ? calculateDynamicColorStatus(record)
    : calculateLegacyColorStatus(record);
}
```

Dynamic completion uses applied core credit plus capped actual required minutes divided by applied core credit plus generated required target. Passive, optional, carried-forward, and unrelated extra minutes are excluded.

- [ ] **Step 4: Add failing Stats credit tests**

Use one record with bonuses `{ momo: 10, dictation: 20, reading: 30, passive: 40 }` and no task actuals. Assert Momo 10, Dictation 20, Reading 30, Passive 40, and Formal 60.

- [ ] **Step 5: Fix Stats without double counting**

Add dictation and reading bonuses to their module and formal totals. Keep passive out of formal. Continue adding generated task `actualMinutes`; never add planned minutes or applied-credit snapshot totals.

- [ ] **Step 6: Run focused and full tests**

```powershell
npx vitest run src/utils/status.test.ts src/utils/stats.test.ts
npm test
npm run typecheck
```

Expected: all legacy and dynamic cases pass.

- [ ] **Step 7: Commit**

```powershell
git add src/utils/status.ts src/utils/status.test.ts src/utils/stats.ts src/utils/stats.test.ts
git commit -m "feat: calculate dynamic plan status and totals"
```

---

### Task 6: Integrate Dynamic Setup And Tracker UI

**Files:**
- Create: `src/components/daily/PlanSummary.tsx`
- Create: `src/components/daily/PlanSections.tsx`
- Create: `src/components/daily/RegenerationPreview.tsx`
- Create: `src/pages/DailyPage.test.tsx`
- Modify: `src/pages/DailyPage.tsx`
- Delete: `src/utils/tasks.ts`

- [ ] **Step 1: Write failing Daily rendering tests**

Test these user-visible behaviors:

```ts
it("collects day context and optional focused minutes");
it("labels completed time for workday and rest day");
it("shows standard, adjusted, credit, trimmed, and tonight totals");
it("renders passive listening separately from focused time");
it("renders only nonzero completed-earlier entries");
it("shows a regeneration preview before applying changes");
it("preserves actual minutes and notes after regeneration");
```

Mock only time and app-data callbacks. Use the real `buildDailyPlan` for arithmetic integration tests.

- [ ] **Step 2: Verify Daily tests fail**

```powershell
npx vitest run src/pages/DailyPage.test.tsx
```

- [ ] **Step 3: Extend `ConfigForm`**

Add a Day Context segmented control and optional focused-minutes input. Derive and display the blank default via `getDefaultFocusedMinutes`. Rename the completed-earlier section based on context and add one concise explanation.

- [ ] **Step 4: Replace `generateDailyPlan` integration**

Call `buildDailyPlan`. When creating a record, add `generatedAt` from `new Date().toISOString()` and persist `dayContext`, `availableFocusedMinutes`, tasks, and snapshot in one immutable `updateRecord` call.

- [ ] **Step 5: Build summary and separated sections**

`PlanSummary` displays focused arithmetic and a visually separate passive reference. `PlanSections` groups tasks by metadata and renders completed-earlier values from `workdayBonus`; it must reuse existing task editing callbacks and sleep-control behavior.

- [ ] **Step 6: Replace the regeneration modal**

Compute the next plan in memory, pass current and next tasks to `previewPlanDifference`, show `RegenerationPreview`, and call `mergePlanProgress` only after confirmation. Copy must promise preservation, not reset.

- [ ] **Step 7: Remove obsolete generator**

```powershell
rg "generateDailyPlan|utils/tasks" src
```

Expected before deletion: no source callers. Delete `src/utils/tasks.ts`, then rerun the search and expect no matches.

- [ ] **Step 8: Run focused/full checks and commit**

```powershell
npx vitest run src/pages/DailyPage.test.tsx
npm test
npm run typecheck
npm run build
git add src/components/daily src/pages/DailyPage.tsx src/pages/DailyPage.test.tsx src/utils/tasks.ts
git commit -m "feat: integrate dynamic Daily planning experience"
```

---

### Task 7: Integrate History And Data Health

**Files:**
- Modify: `src/pages/HistoryPage.tsx`
- Modify: `src/pages/HistoryPage.test.tsx`
- Modify: `src/utils/dataHealth.ts`
- Modify: `src/utils/dataHealth.test.ts`

- [ ] **Step 1: Write failing History tests**

Assert that a v2.1 record displays Day Context, tonight core target, completed-earlier total, capacity trimming, and passive reference separately. Assert that a legacy record still renders. Editing a plan input must show `Plan inputs changed` and must not automatically replace tasks.

- [ ] **Step 2: Implement History snapshot presentation**

Add a compact Plan Summary inside expanded details only when `planSnapshot` exists. Keep current task editing and sleep synchronization. Reuse display helpers rather than recomputing plan arithmetic.

- [ ] **Step 3: Add Data Health tests**

Test invalid engine version, negative summary values, snapshot input/date mismatch where applicable, and missing fields inside a present snapshot. Confirm that a legacy record without a snapshot remains healthy.

- [ ] **Step 4: Implement optional snapshot validation**

Validate only when `record.planSnapshot` is present. Report issues read-only; never repair or rewrite data.

- [ ] **Step 5: Run tests and commit**

```powershell
npx vitest run src/pages/HistoryPage.test.tsx src/utils/dataHealth.test.ts
npm test
npm run typecheck
git add src/pages/HistoryPage.tsx src/pages/HistoryPage.test.tsx src/utils/dataHealth.ts src/utils/dataHealth.test.ts
git commit -m "feat: expose dynamic plan history and health"
```

---

### Task 8: Add End-To-End Acceptance Coverage

**Files:**
- Create: `e2e/dynamic-daily-plan.spec.ts`

- [ ] **Step 1: Add deterministic record setup helper**

Use the existing isolated browser fixture and the real LocalStorage key `ielts_timebox_state_v2`. Clear state before each test. Do not depend on a live Supabase account.

- [ ] **Step 2: Test initial generation arithmetic**

At 390px width, select Workday, no workout, Normal, Dictation, enter Momo 20, Dictation 30, Reading 10, Passive 75, and generate. Assert standard 175, applied credit 50, tonight 125, and passive reference met. Assert no horizontal overflow.

- [ ] **Step 3: Test regeneration preservation**

Enter actual minutes and notes on one task, change to Low Reading with a 90-minute manual capacity, open preview, verify differences, confirm, and assert the real progress remains under either its matching task or Earlier Progress.

- [ ] **Step 4: Test persistence, History, and Stats**

Reload; assert summary persists. Open History and verify completed-earlier values. Open Stats and verify Momo, dictation, reading, and passive bonus totals appear once.

- [ ] **Step 5: Repeat overflow checks with wallpaper**

Use the existing IndexedDB/local metadata fixture. Check Daily at 390, 768, and 1440 widths with `document.documentElement.scrollWidth <= window.innerWidth`.

- [ ] **Step 6: Run E2E and commit**

```powershell
npm run build
npm run test:e2e -- e2e/dynamic-daily-plan.spec.ts
git add e2e/dynamic-daily-plan.spec.ts
git commit -m "test: verify dynamic Daily planning flow"
```

Expected: all new scenarios pass without console errors or overflow.

---

### Task 9: Release Metadata, Documentation, And Final Review

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `docs/PROJECT_HANDOFF.md`
- Create: `docs/V2_1_DYNAMIC_PLAN_RELEASE_CHECKLIST.md`

- [ ] **Step 1: Bump version**

```powershell
npm version 2.1.0 --no-git-tag-version
```

Expected: only `package.json` and `package-lock.json` version metadata changes.

- [ ] **Step 2: Update handoff and release checklist**

Document:

- new planning modules and ownership;
- exact baseline/capacity tables;
- legacy status dispatch;
- how to add a registered future task;
- manual acceptance cases from the design;
- known exclusions.

The checklist must include real phone PWA verification, wallpaper on/off, JSON export/import, manual cloud sync, old record rendering, plan regeneration, and module totals.

- [ ] **Step 3: Run all quality gates independently**

```powershell
git diff --check origin/main...HEAD
npm test
npm run typecheck
npm run build
npm run test:e2e
git status --short
```

Expected: no whitespace errors; all tests pass; build succeeds; only intended files are tracked; `DESIGN.md` and `read_projects.cjs` remain untracked.

- [ ] **Step 4: Perform focused code review**

Review the complete diff for:

- direct mutation;
- double-counted Workday/Earlier Today minutes;
- passive minutes entering focused capacity or status;
- Recovery High exceeding 60;
- legacy records accidentally entering the dynamic status path;
- regeneration losing actual minutes or notes;
- title-string-dependent planning behavior;
- LocalStorage/Supabase schema regressions;
- mobile overflow.

Fix findings with focused tests before continuing.

- [ ] **Step 5: Commit release metadata**

```powershell
git add package.json package-lock.json docs/PROJECT_HANDOFF.md docs/V2_1_DYNAMIC_PLAN_RELEASE_CHECKLIST.md
git commit -m "chore: prepare v2.1 dynamic planning release"
```

- [ ] **Step 6: Push for PR review**

```powershell
git push -u origin feature/v2.1-dynamic-daily-planning
git log --oneline origin/main..HEAD
git status --short
```

Expected: the remote branch contains only intended commits and the local branch is clean apart from known untracked files.

- [ ] **Step 7: Open a PR**

Create a PR from `feature/v2.1-dynamic-daily-planning` to `main` titled:

```text
feat: add dynamic daily planning
```

The PR body must summarize the rule engine, completed-earlier credit, capacity trimming, progress-safe regeneration, legacy compatibility, test counts, build result, and Playwright result.

