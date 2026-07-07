# v2.2 Optional Stretch Plan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This project owner explicitly prefers one task at a time: finish a task, verify it, commit it, report it, then wait for confirmation before starting the next task.

**Goal:** Add optional stretch tasks that use unused focused capacity as a no-penalty bonus challenge after the required baseline plan is generated.

**Architecture:** Keep v2.1's baseline dynamic plan as the source of daily status. Add typed stretch metadata, a small stretch-profile registry, stretch generation in the planning engine, and display/edit/report stretch tasks separately from required tasks. Stretch is stored inside `DailyRecord`/`record_json`, so LocalStorage and manual Supabase sync remain unchanged.

**Tech Stack:** React + Vite + TypeScript + Tailwind, Vitest, Playwright, localStorage, Supabase record-json sync.

---

## File Structure

- Modify `src/types/index.ts`: add stretch strategy/role metadata and make plan snapshots version-aware.
- Create `src/planning/stretchProfiles.ts`: versioned constants for Same Focus and Balanced stretch task allocation.
- Create `src/planning/stretchProfiles.test.ts`: unit tests for strategy coverage and Recovery lightness.
- Modify `src/planning/planEngine.ts`: accept stretch options and append optional stretch tasks after baseline tasks.
- Modify `src/planning/planEngine.test.ts`: prove passive listening and completed-earlier credit do not inflate stretch budget.
- Modify `src/utils/status.ts` and `src/utils/status.test.ts`: exclude stretch tasks from daily color status.
- Modify `src/utils/stats.ts` and `src/utils/stats.test.ts`: count stretch actual minutes in stats without changing old module totals incorrectly.
- Modify `src/planning/planProgress.ts` and `src/planning/planProgress.test.ts`: preserve stretch progress during regeneration and carry removed stretch progress forward.
- Modify `src/components/daily/PlanSummary.tsx`: explain capacity, baseline, unused capacity, and stretch budget more clearly.
- Modify `src/components/daily/PlanSections.tsx`: split required baseline, optional stretch, parallel listening, carried progress, and controls.
- Modify `src/pages/DailyPage.tsx` and `src/pages/DailyPage.test.tsx`: add stretch toggle/strategy UI and regenerate safely.
- Modify `src/pages/HistoryPage.tsx` and `src/pages/HistoryPage.test.tsx`: show stretch summary and keep editing safe.
- Modify `src/utils/dataHealth.ts` and `src/utils/dataHealth.test.ts`: validate optional stretch metadata without flagging legacy records.
- Modify `e2e/dynamic-daily-plan.spec.ts`: add one browser flow covering stretch on mobile.
- Modify `package.json` and `src/utils/version.ts` if the project still keeps explicit release version constants there; bump to `2.2.0`.
- Modify `docs/PROJECT_HANDOFF.md`: document v2.2 behavior and future v2.3 reward points.
- Create `docs/V2_2_OPTIONAL_STRETCH_RELEASE_CHECKLIST.md`: manual validation checklist.

---

### Task 1: Add Stretch Type Contracts

**Files:**
- Modify: `src/types/index.ts`
- Test: `src/planning/planTypes.test.ts`

- [ ] **Step 1: Write failing type/shape tests**

Add these assertions to `src/planning/planTypes.test.ts`:

```ts
import type {
  DailyPlanSnapshot,
  StretchStrategy,
  TaskCheckItem,
} from "../types";

it("allows optional stretch metadata without changing legacy snapshot shape", () => {
  const strategy: StretchStrategy = "same_focus";
  const task: TaskCheckItem = {
    id: "stretch:momo",
    title: "Momo vocabulary",
    category: "momo",
    plannedMinutes: 20,
    actualMinutes: 0,
    completed: false,
    isCore: false,
    isEveningTask: true,
    definitionId: "momo",
    entryId: "stretch:same_focus:momo",
    creditGroup: "momo",
    capacityKind: "stretch",
    statusRole: "optional",
    planRole: "stretch",
    stretchStrategy: strategy,
  };

  const snapshot: DailyPlanSnapshot = {
    engineVersion: 2,
    generatedAt: "2026-07-06T00:00:00.000Z",
    input: {
      exercised: false,
      energyLevel: "normal",
      dayType: "listening_focus",
      dayContext: "workday",
      workdayBonus: { passiveListeningMinutes: 0 },
    },
    credits: [],
    summary: {
      standardCoreMinutes: 175,
      energyAdjustedCoreMinutes: 175,
      appliedCoreCreditMinutes: 0,
      extraCompletedMinutes: 0,
      capacityMinutes: 270,
      capacityTrimmedMinutes: 0,
      eveningCoreTargetMinutes: 175,
      passiveReferenceMinutes: 60,
      passiveReferenceRemainingMinutes: 60,
    },
    adjustmentCodes: ["stretch_enabled"],
    stretch: {
      enabled: true,
      strategy,
      budgetMinutes: 95,
      plannedMinutes: 95,
    },
  };

  expect(task.planRole).toBe("stretch");
  expect(snapshot.stretch?.budgetMinutes).toBe(95);
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run:

```bash
npx vitest run src/planning/planTypes.test.ts
```

Expected: TypeScript/Vitest fails because `StretchStrategy`, `capacityKind: "stretch"`, `planRole`, `engineVersion: 2`, and `"stretch_enabled"` do not exist yet.

- [ ] **Step 3: Add minimal types**

Edit `src/types/index.ts`:

```ts
export type StretchStrategy = "same_focus" | "balanced";

export type PlanRole = "baseline" | "stretch" | "carried" | "control";

export type CapacityKind =
  | "focused"
  | "parallel"
  | "anchor"
  | "control"
  | "stretch";

export type PlanEngineVersion = 1 | 2;

export type PlanAdjustmentCode =
  | "low_energy"
  | "high_energy"
  | "workout_start"
  | "workday_credit"
  | "rest_day"
  | "manual_capacity"
  | "capacity_trimmed"
  | "passive_reference_met"
  | "recovery_no_increase"
  | "stretch_enabled";

export interface DailyPlanInput {
  exercised: boolean;
  energyLevel: EnergyLevel;
  dayType: DayType;
  dayContext: DayContext;
  workdayBonus: WorkdayBonus;
  availableFocusedMinutes?: number;
  stretchEnabled?: boolean;
  stretchStrategy?: StretchStrategy;
}

export interface DailyPlanStretchSummary {
  enabled: boolean;
  strategy?: StretchStrategy;
  budgetMinutes: number;
  plannedMinutes: number;
}

export interface DailyPlanSnapshot {
  engineVersion: PlanEngineVersion;
  generatedAt: string;
  input: DailyPlanInput;
  credits: PlanCredit[];
  summary: PlanSummary;
  adjustmentCodes: PlanAdjustmentCode[];
  stretch?: DailyPlanStretchSummary;
}

export interface TaskCheckItem {
  id: string;
  title: string;
  category: TaskCategory;
  plannedMinutes: number;
  actualMinutes: number;
  completed: boolean;
  isCore: boolean;
  isEveningTask: boolean;
  canBeReducedByWorkdayBonus?: boolean;
  notes?: string;
  definitionId?: string;
  entryId?: string;
  creditGroup?: CreditGroup;
  capacityKind?: CapacityKind;
  statusRole?: StatusRole;
  carriedForward?: boolean;
  planRole?: PlanRole;
  stretchStrategy?: StretchStrategy;
}
```

Keep existing fields and ordering where possible; the snippet above shows the required additions, not a reason to delete unrelated code.

- [ ] **Step 4: Verify Task 1**

Run:

```bash
npx vitest run src/planning/planTypes.test.ts
npm run typecheck
```

Expected: both pass.

- [ ] **Step 5: Commit Task 1**

```bash
git add src/types/index.ts src/planning/planTypes.test.ts
git commit -m "feat: add stretch planning contracts"
```

Stop and report before starting Task 2.

---

### Task 2: Add Versioned Stretch Profiles

**Files:**
- Create: `src/planning/stretchProfiles.ts`
- Create: `src/planning/stretchProfiles.test.ts`

- [ ] **Step 1: Write failing profile tests**

Create `src/planning/stretchProfiles.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { DayType, StretchStrategy } from "../types";
import { getStretchProfile } from "./stretchProfiles";

const modes: DayType[] = [
  "listening_focus",
  "reading_focus",
  "speaking_focus",
  "recovery",
];
const strategies: StretchStrategy[] = ["same_focus", "balanced"];

describe("stretchProfiles", () => {
  it("defines entries for every mode and strategy", () => {
    for (const mode of modes) {
      for (const strategy of strategies) {
        expect(getStretchProfile(mode, strategy).entries.length).toBeGreaterThan(0);
      }
    }
  });

  it("keeps recovery stretch intentionally light", () => {
    for (const strategy of strategies) {
      const total = getStretchProfile("recovery", strategy).entries.reduce(
        (sum, entry) => sum + entry.plannedMinutes,
        0,
      );

      expect(total).toBeLessThanOrEqual(45);
    }
  });

  it("balanced dictation includes non-dictation work", () => {
    const definitions = getStretchProfile("listening_focus", "balanced").entries.map(
      (entry) => entry.definitionId,
    );

    expect(definitions).toContain("reading-analysis");
    expect(definitions).toContain("speaking-shadowing");
  });

  it("same focus dictation starts with current-mode work", () => {
    const definitions = getStretchProfile("listening_focus", "same_focus").entries.map(
      (entry) => entry.definitionId,
    );

    expect(definitions.slice(0, 2)).toEqual(["momo", "dictation-review"]);
  });
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run:

```bash
npx vitest run src/planning/stretchProfiles.test.ts
```

Expected: FAIL because `stretchProfiles.ts` does not exist.

- [ ] **Step 3: Implement the profile registry**

Create `src/planning/stretchProfiles.ts`:

```ts
import type { DayType, StretchStrategy } from "../types";
import { getTaskDefinition } from "./taskRegistry";

export interface StretchProfileEntry {
  entryId: string;
  definitionId: string;
  plannedMinutes: number;
  priority: number;
}

export interface StretchProfile {
  dayType: DayType;
  strategy: StretchStrategy;
  entries: readonly StretchProfileEntry[];
}

function entry(
  entryId: string,
  definitionId: string,
  plannedMinutes: number,
  priority: number,
): StretchProfileEntry {
  getTaskDefinition(definitionId);
  return Object.freeze({ entryId, definitionId, plannedMinutes, priority });
}

function profile(
  dayType: DayType,
  strategy: StretchStrategy,
  entries: readonly StretchProfileEntry[],
): StretchProfile {
  return Object.freeze({ dayType, strategy, entries: Object.freeze([...entries]) });
}

const PROFILES: Readonly<Record<DayType, Readonly<Record<StretchStrategy, StretchProfile>>>> =
  Object.freeze({
    listening_focus: Object.freeze({
      same_focus: profile("listening_focus", "same_focus", [
        entry("stretch:listening:same:momo", "momo", 20, 90),
        entry("stretch:listening:same:review", "dictation-review", 25, 85),
        entry("stretch:listening:same:new", "dictation-new", 30, 80),
        entry("stretch:listening:same:check", "dictation-error-check", 20, 70),
      ]),
      balanced: profile("listening_focus", "balanced", [
        entry("stretch:listening:balanced:reading", "reading-analysis", 30, 90),
        entry("stretch:listening:balanced:speaking", "speaking-shadowing", 20, 80),
        entry("stretch:listening:balanced:momo", "momo", 20, 75),
        entry("stretch:listening:balanced:notes", "reading-notes", 25, 70),
      ]),
    }),
    reading_focus: Object.freeze({
      same_focus: profile("reading_focus", "same_focus", [
        entry("stretch:reading:same:analysis", "reading-analysis", 35, 90),
        entry("stretch:reading:same:notes", "reading-notes", 25, 80),
        entry("stretch:reading:same:scan", "reading-scan", 20, 75),
        entry("stretch:reading:same:timed", "reading-stretch", 30, 70),
      ]),
      balanced: profile("reading_focus", "balanced", [
        entry("stretch:reading:balanced:dictation", "dictation-review", 25, 90),
        entry("stretch:reading:balanced:speaking", "speaking-shadowing", 20, 80),
        entry("stretch:reading:balanced:momo", "momo", 20, 75),
        entry("stretch:reading:balanced:check", "dictation-error-check", 15, 70),
      ]),
    }),
    speaking_focus: Object.freeze({
      same_focus: profile("speaking_focus", "same_focus", [
        entry("stretch:speaking:same:conversation", "speaking-conversation", 30, 90),
        entry("stretch:speaking:same:retake", "speaking-retake", 20, 80),
        entry("stretch:speaking:same:shadowing", "speaking-shadowing", 20, 75),
        entry("stretch:speaking:same:momo", "momo", 20, 70),
      ]),
      balanced: profile("speaking_focus", "balanced", [
        entry("stretch:speaking:balanced:reading", "reading-analysis", 30, 90),
        entry("stretch:speaking:balanced:dictation", "dictation-review", 25, 80),
        entry("stretch:speaking:balanced:momo", "momo", 20, 75),
      ]),
    }),
    recovery: Object.freeze({
      same_focus: profile("recovery", "same_focus", [
        entry("stretch:recovery:same:momo", "momo", 20, 90),
        entry("stretch:recovery:same:dictation", "dictation-review", 20, 80),
      ]),
      balanced: profile("recovery", "balanced", [
        entry("stretch:recovery:balanced:momo", "momo", 15, 90),
        entry("stretch:recovery:balanced:notes", "reading-notes", 15, 80),
        entry("stretch:recovery:balanced:dictation", "dictation-review", 15, 70),
      ]),
    }),
  });

export function getStretchProfile(
  dayType: DayType,
  strategy: StretchStrategy,
): StretchProfile {
  return PROFILES[dayType][strategy];
}
```

- [ ] **Step 4: Verify Task 2**

Run:

```bash
npx vitest run src/planning/stretchProfiles.test.ts
npm run typecheck
```

Expected: both pass.

- [ ] **Step 5: Commit Task 2**

```bash
git add src/planning/stretchProfiles.ts src/planning/stretchProfiles.test.ts
git commit -m "feat: add optional stretch profiles"
```

Stop and report before starting Task 3.

---

### Task 3: Generate Stretch Tasks in the Plan Engine

**Files:**
- Modify: `src/planning/planEngine.ts`
- Modify: `src/planning/planEngine.test.ts`

- [ ] **Step 1: Add failing engine tests**

Append to `src/planning/planEngine.test.ts`:

```ts
it("adds same-focus stretch tasks from unused capacity when enabled", () => {
  const result = buildDailyPlan(
    baseInput({
      stretchEnabled: true,
      stretchStrategy: "same_focus",
    }),
  );

  const stretchTasks = result.tasks.filter((task) => task.planRole === "stretch");

  expect(result.snapshot.engineVersion).toBe(2);
  expect(result.snapshot.stretch).toMatchObject({
    enabled: true,
    strategy: "same_focus",
    budgetMinutes: 95,
    plannedMinutes: 95,
  });
  expect(stretchTasks.reduce((sum, task) => sum + task.plannedMinutes, 0)).toBe(95);
  expect(stretchTasks.every((task) => task.statusRole === "optional")).toBe(true);
  expect(stretchTasks.every((task) => task.capacityKind === "stretch")).toBe(true);
});

it("uses selected mode target, not completed-earlier credit, for stretch budget", () => {
  const result = buildDailyPlan(
    baseInput({
      workdayBonus: {
        passiveListeningMinutes: 90,
        momoMinutes: 20,
        dictationMinutes: 30,
        readingMinutes: 720,
      },
      stretchEnabled: true,
      stretchStrategy: "balanced",
    }),
  );

  expect(result.snapshot.summary.eveningCoreTargetMinutes).toBe(125);
  expect(result.snapshot.stretch?.budgetMinutes).toBe(95);
  expect(result.snapshot.summary.extraCompletedMinutes).toBeGreaterThan(0);
});

it("does not add stretch when the selected mode already fills capacity", () => {
  const result = buildDailyPlan(
    baseInput({
      dayType: "reading_focus",
      energyLevel: "high",
      exercised: true,
      stretchEnabled: true,
      stretchStrategy: "same_focus",
    }),
  );

  expect(result.snapshot.summary.capacityMinutes).toBe(210);
  expect(result.snapshot.summary.energyAdjustedCoreMinutes).toBe(220);
  expect(result.snapshot.stretch).toMatchObject({
    enabled: true,
    strategy: "same_focus",
    budgetMinutes: 0,
    plannedMinutes: 0,
  });
  expect(result.tasks.some((task) => task.planRole === "stretch")).toBe(false);
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run:

```bash
npx vitest run src/planning/planEngine.test.ts
```

Expected: FAIL because `buildDailyPlan()` ignores stretch fields.

- [ ] **Step 3: Implement stretch generation**

In `src/planning/planEngine.ts`:

1. Import `StretchStrategy` and `getStretchProfile`.
2. Add helpers:

```ts
import { getStretchProfile, type StretchProfileEntry } from "./stretchProfiles";
```

```ts
function normalizeStretchStrategy(value: unknown): StretchStrategy {
  return value === "balanced" ? "balanced" : "same_focus";
}

function toStretchTask(
  entry: StretchProfileEntry,
  strategy: StretchStrategy,
): TaskCheckItem {
  const task = standaloneTask(entry.definitionId, entry.entryId, entry.plannedMinutes);
  return {
    ...task,
    id: `stretch:${entry.entryId}`,
    isCore: false,
    isEveningTask: true,
    capacityKind: "stretch",
    statusRole: "optional",
    planRole: "stretch",
    stretchStrategy: strategy,
  };
}

function buildStretchEntries(
  budgetMinutes: number,
  dayType: DailyPlanInput["dayType"],
  strategy: StretchStrategy,
): StretchProfileEntry[] {
  let remaining = Math.max(0, Math.floor(budgetMinutes / 5) * 5);
  const entries: StretchProfileEntry[] = [];

  for (const entry of getStretchProfile(dayType, strategy).entries) {
    if (remaining <= 0) break;
    const definition = getTaskDefinition(entry.definitionId);
    const increment = definition.incrementMinutes || 5;
    const allocation = Math.min(
      entry.plannedMinutes,
      Math.floor(remaining / increment) * increment,
    );
    if (allocation <= 0) continue;
    entries.push({ ...entry, plannedMinutes: allocation });
    remaining -= allocation;
  }

  return entries;
}
```

3. Normalize `stretchEnabled` and `stretchStrategy` inside `input`:

```ts
const stretchEnabled = Boolean(rawInput.stretchEnabled);
const stretchStrategy = normalizeStretchStrategy(rawInput.stretchStrategy);

const input: DailyPlanInput = {
  exercised: Boolean(rawInput.exercised),
  energyLevel: rawInput.energyLevel,
  dayType: rawInput.dayType,
  dayContext: rawInput.dayContext,
  workdayBonus: normalizedBonus,
  stretchEnabled,
  stretchStrategy,
  ...(Number.isFinite(rawInput.availableFocusedMinutes)
    ? {
        availableFocusedMinutes: normalizeMinutes(
          rawInput.availableFocusedMinutes,
          480,
        ),
      }
    : {}),
};
```

4. After `capacityTrimmedMinutes` is calculated, compute stretch:

```ts
const stretchBudgetMinutes = stretchEnabled
  ? Math.max(0, capacityMinutes - energyAdjustedCoreMinutes)
  : 0;
const stretchEntries = stretchEnabled
  ? buildStretchEntries(stretchBudgetMinutes, input.dayType, stretchStrategy)
  : [];
const stretchPlannedMinutes = sumEntries(stretchEntries);
```

5. After baseline `trimmedEntries.map(toTask)`, append stretch tasks before passive listening:

```ts
const tasks = trimmedEntries.map(toTask);
tasks.push(...stretchEntries.map((entry) => toStretchTask(entry, stretchStrategy)));
```

6. Return `engineVersion: 2`, add stretch summary, and add the adjustment code:

```ts
if (stretchEnabled) {
  addAdjustment(adjustmentCodes, "stretch_enabled");
}
```

```ts
engineVersion: 2,
```

```ts
stretch: {
  enabled: stretchEnabled,
  ...(stretchEnabled ? { strategy: stretchStrategy } : {}),
  budgetMinutes: stretchBudgetMinutes,
  plannedMinutes: stretchPlannedMinutes,
},
```

- [ ] **Step 4: Verify Task 3**

Run:

```bash
npx vitest run src/planning/planEngine.test.ts
npm run typecheck
```

Expected: both pass.

- [ ] **Step 5: Commit Task 3**

```bash
git add src/planning/planEngine.ts src/planning/planEngine.test.ts
git commit -m "feat: generate optional stretch tasks"
```

Stop and report before starting Task 4.

---

### Task 4: Exclude Stretch from Status, Preserve in Regeneration, Count in Stats

**Files:**
- Modify: `src/utils/status.ts`
- Modify: `src/utils/status.test.ts`
- Modify: `src/planning/planProgress.ts`
- Modify: `src/planning/planProgress.test.ts`
- Modify: `src/utils/stats.ts`
- Modify: `src/utils/stats.test.ts`

- [ ] **Step 1: Add failing status test**

In `src/utils/status.test.ts`, add:

```ts
it("ignores incomplete stretch tasks when calculating dynamic status", () => {
  const record = makeRecord({
    planSnapshot: {
      engineVersion: 2,
      generatedAt: "2026-07-06T00:00:00.000Z",
      input: {
        exercised: false,
        energyLevel: "normal",
        dayType: "listening_focus",
        dayContext: "workday",
        workdayBonus: { passiveListeningMinutes: 0 },
        stretchEnabled: true,
        stretchStrategy: "same_focus",
      },
      credits: [],
      summary: {
        standardCoreMinutes: 100,
        energyAdjustedCoreMinutes: 100,
        appliedCoreCreditMinutes: 0,
        extraCompletedMinutes: 0,
        capacityMinutes: 270,
        capacityTrimmedMinutes: 0,
        eveningCoreTargetMinutes: 100,
        passiveReferenceMinutes: 60,
        passiveReferenceRemainingMinutes: 60,
      },
      adjustmentCodes: ["stretch_enabled"],
      stretch: {
        enabled: true,
        strategy: "same_focus",
        budgetMinutes: 170,
        plannedMinutes: 20,
      },
    },
    tasks: [
      task("required", "momo", 100, 100, {
        capacityKind: "focused",
        statusRole: "required",
      }),
      task("stretch", "momo", 20, 0, {
        capacityKind: "stretch",
        statusRole: "optional",
        planRole: "stretch",
      }),
    ],
  });

  expect(calculateColorStatus(record)).toBe("green");
});
```

- [ ] **Step 2: Add failing stats test**

In `src/utils/stats.test.ts`, add:

```ts
it("counts completed stretch minutes as study minutes", () => {
  const record = baseRecord({
    planSnapshot: {
      engineVersion: 2,
      generatedAt: "2026-07-06T00:00:00.000Z",
      input: {
        exercised: false,
        energyLevel: "normal",
        dayType: "listening_focus",
        dayContext: "workday",
        workdayBonus: { passiveListeningMinutes: 0 },
        stretchEnabled: true,
        stretchStrategy: "same_focus",
      },
      credits: [],
      summary: {
        standardCoreMinutes: 175,
        energyAdjustedCoreMinutes: 175,
        appliedCoreCreditMinutes: 0,
        extraCompletedMinutes: 0,
        capacityMinutes: 270,
        capacityTrimmedMinutes: 0,
        eveningCoreTargetMinutes: 175,
        passiveReferenceMinutes: 60,
        passiveReferenceRemainingMinutes: 60,
      },
      adjustmentCodes: ["stretch_enabled"],
      stretch: {
        enabled: true,
        strategy: "same_focus",
        budgetMinutes: 95,
        plannedMinutes: 20,
      },
    },
    tasks: [
      task("Required Momo", "momo", 30),
      {
        ...task("Stretch Momo", "momo", 20),
        planRole: "stretch",
        capacityKind: "stretch",
        statusRole: "optional",
      },
    ],
  });

  const stats = getModuleMinutesStats({ [record.date]: record });
  expect(stats.totalFormal).toBeGreaterThanOrEqual(50);
});
```

Adjust the assertion to the actual stats helper shape if the helper does not expose `totalFormal`; do not change the rule.

- [ ] **Step 3: Add failing progress preservation test**

In `src/planning/planProgress.test.ts`, add:

```ts
it("preserves matching stretch progress during regeneration", () => {
  const current = task("stretch:same:momo", {
    id: "stretch:stretch:listening:same:momo",
    entryId: "stretch:listening:same:momo",
    definitionId: "momo",
    plannedMinutes: 20,
    actualMinutes: 15,
    completed: false,
    planRole: "stretch",
    capacityKind: "stretch",
    statusRole: "optional",
  });
  const next = task("stretch:same:momo", {
    id: "stretch:stretch:listening:same:momo",
    entryId: "stretch:listening:same:momo",
    definitionId: "momo",
    plannedMinutes: 25,
    actualMinutes: 0,
    completed: false,
    planRole: "stretch",
    capacityKind: "stretch",
    statusRole: "optional",
  });

  const result = mergePlanProgress([current], [next]);
  expect(result.tasks[0]).toMatchObject({
    plannedMinutes: 25,
    actualMinutes: 15,
    planRole: "stretch",
  });
});
```

- [ ] **Step 4: Run focused tests and confirm failures**

Run:

```bash
npx vitest run src/utils/status.test.ts src/utils/stats.test.ts src/planning/planProgress.test.ts
```

Expected: at least status fails because stretch is not yet explicitly excluded; progress may already pass if metadata is naturally preserved.

- [ ] **Step 5: Implement status exclusion**

In `src/utils/status.ts`, any dynamic target filter should exclude stretch:

```ts
function isRequiredDynamicTarget(task: TaskCheckItem): boolean {
  if (task.carriedForward) return false;
  if (task.planRole === "stretch") return false;
  if (task.capacityKind === "stretch") return false;
  if (task.statusRole === "optional" || task.statusRole === "ignored") return false;
  return task.statusRole === "required" || task.capacityKind === "focused" || task.capacityKind === "anchor";
}
```

Use this helper in the dynamic status calculation instead of filtering only by `capacityKind`.

- [ ] **Step 6: Preserve metadata in progress merge if needed**

If `mergePlanProgress` drops fields, update the merge result to spread the new task first and then preserved user fields only:

```ts
return {
  ...nextTask,
  actualMinutes: currentTask.actualMinutes,
  completed: currentTask.completed,
  notes: currentTask.notes,
};
```

Do not overwrite `nextTask.planRole`, `capacityKind`, `statusRole`, or `stretchStrategy` with stale values unless the next task lacks them.

- [ ] **Step 7: Count stretch actual minutes in stats**

Do not add a separate reward system. Ensure existing formal/module totals include stretch actual minutes based on task category while avoiding double-counting completed-earlier snapshot credit. Add only the minimal handling required by the failing test.

- [ ] **Step 8: Verify Task 4**

Run:

```bash
npx vitest run src/utils/status.test.ts src/utils/stats.test.ts src/planning/planProgress.test.ts
npm test -- --run
npm run typecheck
```

Expected: all pass.

- [ ] **Step 9: Commit Task 4**

```bash
git add src/utils/status.ts src/utils/status.test.ts src/planning/planProgress.ts src/planning/planProgress.test.ts src/utils/stats.ts src/utils/stats.test.ts
git commit -m "feat: keep stretch optional in status and stats"
```

Stop and report before starting Task 5.

---

### Task 5: Add Daily Stretch UI

**Files:**
- Modify: `src/components/daily/PlanSummary.tsx`
- Modify: `src/components/daily/PlanSections.tsx`
- Modify: `src/pages/DailyPage.tsx`
- Modify: `src/pages/DailyPage.test.tsx`

- [ ] **Step 1: Add failing Daily UI tests**

In `src/pages/DailyPage.test.tsx`, add:

```ts
it("can enable same-focus stretch after generating a baseline plan", async () => {
  renderDailyPage();

  fireEvent.click(screen.getByText(/generate plan/i));
  expect(screen.getByText(/optional stretch/i)).toBeTruthy();
  expect(screen.getByText(/unused focused capacity/i)).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: /add optional stretch/i }));
  fireEvent.click(screen.getByRole("button", { name: /same focus/i }));

  expect(screen.getByText(/0 penalty if skipped/i)).toBeTruthy();
  expect(screen.getAllByText(/optional/i).length).toBeGreaterThan(0);
});
```

Use the existing test render helper name if it differs from `renderDailyPage`.

- [ ] **Step 2: Run the focused test and confirm it fails**

Run:

```bash
npx vitest run src/pages/DailyPage.test.tsx
```

Expected: FAIL because the stretch UI does not exist.

- [ ] **Step 3: Improve `PlanSummary` labels**

In `src/components/daily/PlanSummary.tsx`, add these metrics:

```tsx
const unusedFocusedCapacity = Math.max(
  0,
  summary.capacityMinutes - summary.energyAdjustedCoreMinutes,
);
```

Render labels:

```tsx
<Metric label="Focused capacity" value={`${summary.capacityMinutes}m`} />
<Metric label="Mode target" value={`${summary.energyAdjustedCoreMinutes}m`} />
<Metric label="Completed earlier" value={`-${summary.appliedCoreCreditMinutes}m`} />
<Metric label="Unused capacity" value={`${unusedFocusedCapacity}m`} />
<Metric label="Tonight focused" value={`${summary.eveningCoreTargetMinutes}m`} />
```

Keep passive listening in its separate card with the existing text that it does not reduce focused study.

- [ ] **Step 4: Split stretch tasks in `PlanSections`**

In `src/components/daily/PlanSections.tsx`, split:

```ts
const stretch = tasks.filter((task) => !task.carriedForward && task.planRole === "stretch");
const focused = tasks.filter(
  (task) =>
    !task.carriedForward &&
    task.planRole !== "stretch" &&
    (task.capacityKind === "focused" ||
      task.capacityKind === "anchor" ||
      (!task.capacityKind && task.category !== "sleep_control")),
);
```

Render a separate section:

```tsx
{stretch.length > 0 && (
  <section aria-label="Optional stretch tasks" className="space-y-3">
    <div className="flex items-center justify-between">
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-indigo-300">
        Optional stretch
      </h3>
      <span className="text-[10px] font-semibold text-slate-400">
        0 penalty if skipped
      </span>
    </div>
    {stretch.map(renderTask)}
  </section>
)}
```

- [ ] **Step 5: Add Daily state and controls**

In `src/pages/DailyPage.tsx`, add local config fields:

```ts
stretchEnabled: Boolean(record.planSnapshot?.stretch?.enabled),
stretchStrategy: record.planSnapshot?.stretch?.strategy ?? "same_focus",
```

When calling `buildDailyPlan`, pass:

```ts
stretchEnabled: localConfig.stretchEnabled,
stretchStrategy: localConfig.stretchStrategy,
```

Below `<PlanSummary />`, render:

```tsx
<section className="wallpaper-surface rounded-xl border border-slate-200 bg-slate-50/80 p-4">
  <div className="flex items-center justify-between gap-3">
    <div>
      <h3 className="text-sm font-bold text-slate-800">Optional stretch</h3>
      <p className="text-xs text-slate-500">
        Uses unused focused capacity. It does not affect today's color status.
      </p>
    </div>
    <button
      type="button"
      onClick={() =>
        setLocalConfig((previous) => ({
          ...previous,
          stretchEnabled: !previous.stretchEnabled,
        }))
      }
      className="rounded-lg border border-indigo-200 px-3 py-2 text-xs font-bold text-indigo-600"
    >
      {localConfig.stretchEnabled ? "On" : "Add optional stretch"}
    </button>
  </div>

  {localConfig.stretchEnabled && (
    <div className="mt-3 grid grid-cols-2 gap-2">
      {(["same_focus", "balanced"] as const).map((strategy) => (
        <button
          key={strategy}
          type="button"
          onClick={() =>
            setLocalConfig((previous) => ({
              ...previous,
              stretchStrategy: strategy,
            }))
          }
          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold"
        >
          {strategy === "same_focus" ? "Same Focus" : "Balanced"}
        </button>
      ))}
    </div>
  )}
</section>
```

Use existing local styling conventions and selected-button classes instead of leaving the snippet visually raw.

- [ ] **Step 6: Verify Task 5**

Run:

```bash
npx vitest run src/pages/DailyPage.test.tsx
npm test -- --run
npm run typecheck
npm run build
```

Expected: all pass.

- [ ] **Step 7: Commit Task 5**

```bash
git add src/components/daily/PlanSummary.tsx src/components/daily/PlanSections.tsx src/pages/DailyPage.tsx src/pages/DailyPage.test.tsx
git commit -m "feat: add optional stretch controls to Daily"
```

Stop and report before starting Task 6.

---

### Task 6: Expose Stretch in History and Data Health

**Files:**
- Modify: `src/pages/HistoryPage.tsx`
- Modify: `src/pages/HistoryPage.test.tsx`
- Modify: `src/utils/dataHealth.ts`
- Modify: `src/utils/dataHealth.test.ts`

- [ ] **Step 1: Add failing History test**

In `src/pages/HistoryPage.test.tsx`, add:

```ts
it("shows stretch summary without changing historical status", () => {
  const record = dynamicRecord({
    status: "green",
    planSnapshot: {
      ...baseDynamicSnapshot(),
      engineVersion: 2,
      adjustmentCodes: ["stretch_enabled"],
      stretch: {
        enabled: true,
        strategy: "balanced",
        budgetMinutes: 95,
        plannedMinutes: 40,
      },
    },
    tasks: [
      ...baseDynamicTasks(),
      {
        ...baseTask("Stretch reading", "reading", 40, 20),
        planRole: "stretch",
        capacityKind: "stretch",
        statusRole: "optional",
      },
    ],
  });

  renderHistoryPage({ records: { [record.date]: record } });
  fireEvent.click(screen.getByText(record.date));

  expect(screen.getByText(/optional stretch/i)).toBeTruthy();
  expect(screen.getByText(/does not change day status/i)).toBeTruthy();
  expect(screen.getByText(/balanced/i)).toBeTruthy();
});
```

Adapt helper names to existing test utilities.

- [ ] **Step 2: Add failing Data Health test**

In `src/utils/dataHealth.test.ts`, add:

```ts
it("accepts valid stretch metadata and keeps legacy records healthy", () => {
  const legacy = makeRecord("2026-07-05");
  const stretch = makeRecord("2026-07-06", {
    planSnapshot: {
      ...makeSnapshot(),
      engineVersion: 2,
      adjustmentCodes: ["stretch_enabled"],
      stretch: {
        enabled: true,
        strategy: "same_focus",
        budgetMinutes: 95,
        plannedMinutes: 20,
      },
    },
  });

  const report = analyzeAppDataHealth({
    records: {
      [legacy.date]: legacy,
      [stretch.date]: stretch,
    },
  });

  expect(report.ok).toBe(true);
});
```

- [ ] **Step 3: Run focused tests and confirm failures**

Run:

```bash
npx vitest run src/pages/HistoryPage.test.tsx src/utils/dataHealth.test.ts
```

- [ ] **Step 4: Implement History stretch display**

In `src/pages/HistoryPage.tsx`, inside the historical plan summary area, add:

```tsx
{snapshot.stretch?.enabled && (
  <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50/80 p-3 wallpaper-surface">
    <div className="flex items-center justify-between gap-3">
      <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">
        Optional stretch
      </span>
      <span className="text-xs font-bold text-slate-700">
        {snapshot.stretch.strategy === "balanced" ? "Balanced" : "Same Focus"}
      </span>
    </div>
    <p className="mt-2 text-xs text-slate-500">
      {snapshot.stretch.plannedMinutes}m planned from {snapshot.stretch.budgetMinutes}m unused capacity. It does not change day status.
    </p>
  </div>
)}
```

- [ ] **Step 5: Implement Data Health validation**

In `src/utils/dataHealth.ts`, validate only when `snapshot.stretch` exists:

```ts
if (snapshot.stretch) {
  const stretch = snapshot.stretch;
  if (typeof stretch.enabled !== "boolean") {
    addIssue("error", "PLAN_STRETCH_INVALID_ENABLED", "Plan stretch enabled flag is invalid", key);
  }
  if (
    stretch.strategy !== undefined &&
    stretch.strategy !== "same_focus" &&
    stretch.strategy !== "balanced"
  ) {
    addIssue("error", "PLAN_STRETCH_INVALID_STRATEGY", "Plan stretch strategy is invalid", key);
  }
  if (
    typeof stretch.budgetMinutes !== "number" ||
    stretch.budgetMinutes < 0 ||
    Number.isNaN(stretch.budgetMinutes)
  ) {
    addIssue("error", "PLAN_STRETCH_INVALID_BUDGET", "Plan stretch budget is invalid", key);
  }
  if (
    typeof stretch.plannedMinutes !== "number" ||
    stretch.plannedMinutes < 0 ||
    Number.isNaN(stretch.plannedMinutes)
  ) {
    addIssue("error", "PLAN_STRETCH_INVALID_PLANNED", "Plan stretch planned minutes is invalid", key);
  }
}
```

- [ ] **Step 6: Verify Task 6**

Run:

```bash
npx vitest run src/pages/HistoryPage.test.tsx src/utils/dataHealth.test.ts
npm test -- --run
npm run typecheck
```

Expected: all pass.

- [ ] **Step 7: Commit Task 6**

```bash
git add src/pages/HistoryPage.tsx src/pages/HistoryPage.test.tsx src/utils/dataHealth.ts src/utils/dataHealth.test.ts
git commit -m "feat: expose optional stretch history and health"
```

Stop and report before starting Task 7.

---

### Task 7: Add Stretch Stats and E2E Smoke Coverage

**Files:**
- Modify: `src/utils/stats.ts`
- Modify: `src/utils/stats.test.ts`
- Modify: `src/pages/StatsPage.tsx`
- Modify: `src/pages/StatsPage.test.tsx`
- Modify: `e2e/dynamic-daily-plan.spec.ts`

- [ ] **Step 1: Add failing stats summary test**

In `src/utils/stats.test.ts`, add a test for a new helper:

```ts
import { getStretchStats } from "./stats";

it("summarizes optional stretch usage", () => {
  const active = baseRecord({
    date: "2026-07-06",
    planSnapshot: {
      ...baseSnapshot(),
      engineVersion: 2,
      stretch: {
        enabled: true,
        strategy: "same_focus",
        budgetMinutes: 95,
        plannedMinutes: 40,
      },
    },
    tasks: [
      {
        ...task("Stretch Momo", "momo", 25),
        planRole: "stretch",
        capacityKind: "stretch",
        statusRole: "optional",
      },
    ],
  });

  expect(getStretchStats({ [active.date]: active })).toEqual({
    enabledDays: 1,
    partialDays: 1,
    completedMinutes: 25,
  });
});
```

- [ ] **Step 2: Implement `getStretchStats`**

In `src/utils/stats.ts`:

```ts
export interface StretchStats {
  enabledDays: number;
  partialDays: number;
  completedMinutes: number;
}

export function getStretchStats(records: Record<string, DailyRecord>): StretchStats {
  let enabledDays = 0;
  let partialDays = 0;
  let completedMinutes = 0;

  Object.values(records).forEach((record) => {
    if (!record.planSnapshot?.stretch?.enabled) return;
    enabledDays += 1;
    const dayMinutes = record.tasks
      .filter((task) => task.planRole === "stretch" || task.capacityKind === "stretch")
      .reduce((sum, task) => sum + Math.max(0, task.actualMinutes || 0), 0);
    completedMinutes += dayMinutes;
    if (dayMinutes > 0) partialDays += 1;
  });

  return { enabledDays, partialDays, completedMinutes };
}
```

- [ ] **Step 3: Add Stats UI**

In `src/pages/StatsPage.tsx`, import and use `getStretchStats()`. Add a compact card:

```tsx
<section className="wallpaper-surface rounded-lg border border-slate-200 bg-white/80 p-4 shadow-sm">
  <div className="flex items-center justify-between">
    <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">
      Optional Stretch
    </h2>
    <span className="text-[10px] font-semibold text-slate-400">No penalty</span>
  </div>
  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
    <div>
      <p className="font-mono text-lg font-bold text-slate-800">{stretchStats.completedMinutes}</p>
      <p className="text-[10px] text-slate-500">minutes</p>
    </div>
    <div>
      <p className="font-mono text-lg font-bold text-slate-800">{stretchStats.enabledDays}</p>
      <p className="text-[10px] text-slate-500">enabled days</p>
    </div>
    <div>
      <p className="font-mono text-lg font-bold text-slate-800">{stretchStats.partialDays}</p>
      <p className="text-[10px] text-slate-500">active days</p>
    </div>
  </div>
</section>
```

- [ ] **Step 4: Add E2E smoke test**

In `e2e/dynamic-daily-plan.spec.ts`, add:

```ts
test("optional stretch stays separate from baseline status on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedEmptyApp(page);
  await page.goto("/");

  await page.getByRole("button", { name: /dictation/i }).click();
  await page.getByRole("button", { name: /generate plan/i }).click();

  await expect(page.getByText(/Tonight focused/i)).toBeVisible();
  await page.getByRole("button", { name: /add optional stretch/i }).click();
  await page.getByRole("button", { name: /same focus/i }).click();

  await expect(page.getByLabel(/optional stretch tasks/i)).toBeVisible();
  await expect(page.getByText(/0 penalty if skipped/i)).toBeVisible();
  await expect(page.locator("body")).not.toHaveJSProperty("scrollWidth", 999999);
});
```

Use the existing seed/navigation helpers in the file rather than duplicating them. Replace the overflow assertion with the project's existing overflow helper if one exists.

- [ ] **Step 5: Verify Task 7**

Run:

```bash
npx vitest run src/utils/stats.test.ts src/pages/StatsPage.test.tsx
npm test -- --run
npm run typecheck
npm run build
npm run test:e2e
```

Expected: all pass.

- [ ] **Step 6: Commit Task 7**

```bash
git add src/utils/stats.ts src/utils/stats.test.ts src/pages/StatsPage.tsx src/pages/StatsPage.test.tsx e2e/dynamic-daily-plan.spec.ts
git commit -m "feat: add optional stretch stats"
```

Stop and report before starting Task 8.

---

### Task 8: Release Documentation and Version Bump

**Files:**
- Modify: `package.json`
- Modify: `src/utils/version.ts` if it contains explicit fallback version text.
- Modify: `docs/PROJECT_HANDOFF.md`
- Create: `docs/V2_2_OPTIONAL_STRETCH_RELEASE_CHECKLIST.md`

- [ ] **Step 1: Update version**

In `package.json`, set:

```json
"version": "2.2.0"
```

If `src/utils/version.ts` has a hard-coded fallback, update it to `2.2.0`.

- [ ] **Step 2: Create release checklist**

Create `docs/V2_2_OPTIONAL_STRETCH_RELEASE_CHECKLIST.md`:

```md
# v2.2 Optional Stretch Release Checklist

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
```

- [ ] **Step 3: Update handoff**

Add a v2.2 section to `docs/PROJECT_HANDOFF.md`:

```md
## v2.2 Optional Stretch Plan

v2.2 adds an optional stretch layer after the required v2.1 baseline plan.

- Baseline tasks still decide Green / Yellow / Red.
- Stretch tasks use unused focused capacity and are marked optional.
- Stretch can be generated as Same Focus or Balanced.
- Stretch completion is counted in stats.
- Incomplete stretch has no penalty.
- Reward points are intentionally deferred to v2.3.
```

- [ ] **Step 4: Run final quality gates**

Run:

```bash
git diff --check origin/main...HEAD
npm test -- --run
npm run typecheck
npm run build
npm run test:e2e
```

Expected: all pass.

- [ ] **Step 5: Commit Task 8**

```bash
git add package.json src/utils/version.ts docs/PROJECT_HANDOFF.md docs/V2_2_OPTIONAL_STRETCH_RELEASE_CHECKLIST.md
git commit -m "chore: prepare v2.2 optional stretch release"
```

Stop and report before starting final review.

---

### Task 9: Final Review and PR Preparation

**Files:**
- No code changes unless review finds a defect.

- [ ] **Step 1: Inspect branch state**

Run:

```bash
git status --short
git log --oneline origin/main..HEAD
git diff --stat origin/main...HEAD
```

Expected: clean status except intentionally untracked local files outside this worktree; commits show one task per commit.

- [ ] **Step 2: Review core invariants manually**

Check these files:

```bash
rg "planRole|stretch|capacityKind|stretchStrategy" src
```

Confirm:

- Stretch tasks are generated only when `stretchEnabled` is true.
- Status filters exclude `planRole === "stretch"` and `capacityKind === "stretch"`.
- Workday credit still applies only to baseline groups.
- Passive listening still does not consume focused capacity.
- Legacy records without `snapshot.stretch` are valid.

- [ ] **Step 3: Run final quality gates again**

Run:

```bash
git diff --check origin/main...HEAD
npm test -- --run
npm run typecheck
npm run build
npm run test:e2e
```

Expected: all pass.

- [ ] **Step 4: Push branch**

```bash
git push -u origin feature/v2.2-optional-stretch-plan
```

If the implementation work started from this docs branch, rename before pushing:

```bash
git branch -m feature/v2.2-optional-stretch-plan
git push -u origin feature/v2.2-optional-stretch-plan
```

- [ ] **Step 5: Report PR-ready status**

Report:

- Branch name.
- Commit list.
- Test/build results.
- Any known limitations.
- Suggested PR title: `feat: add optional stretch plan`.

Do not delete worktrees or feature branches unless the user explicitly asks.

---

## Plan Self-Review

- Spec coverage: baseline authority, stretch trigger, Same Focus/Balanced strategies, no custom picker, status exclusion, History/Stats visibility, LocalStorage/cloud safety, tests, and v2.3 points deferral are all mapped to tasks.
- Unresolved-marker scan: no incomplete instructions are used as implementation steps.
- Type consistency: `StretchStrategy`, `PlanRole`, `capacityKind: "stretch"`, `planRole: "stretch"`, `DailyPlanSnapshot.stretch`, and `stretch_enabled` are introduced in Task 1 and reused consistently afterward.
- Scope check: reward points remain out of scope and are not implemented in this plan.
