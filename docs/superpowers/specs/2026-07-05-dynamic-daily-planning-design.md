# v2.1 Dynamic Daily Planning Design

## Objective

Replace the rigid task-array generator with an explainable, rule-driven planning engine. The engine must turn the user's daily conditions into one realistic plan, count study already completed during work, reduce only matching evening work, respect tonight's available focused time, and preserve all real progress when the plan is regenerated.

The feature remains local-first. It does not add AI planning, automatic cloud synchronization, calendar inference, or an automatic odd/even-week scheduler.

## Confirmed Product Rules

### Daily inputs

The plan uses these inputs:

- Day context: `workday` or `rest_day`.
- Workout completed: yes or no.
- Energy: `low`, `normal`, or `high`.
- Focus mode: Dictation, Reading, Speaking, or Recovery.
- Workday/Earlier Today completion: Momo, passive listening, dictation, and reading minutes completed before Generate Plan.
- Optional focused minutes available tonight. A blank value uses the schedule-derived default.

Do not automatically infer the user's alternating five-day/six-day work week in v2.1. Day context is selected manually so an exceptional workday, holiday, or changed shift cannot silently produce the wrong plan.

### Default capacity

- Workday without workout: 270 focused minutes, corresponding to 18:00 through 22:30.
- Workday with workout: 210 focused minutes, corresponding to 19:00 through 22:30.
- Rest day without workout: 330 focused minutes, corresponding to 17:00 through 22:30.
- Rest day with workout: 270 focused minutes, corresponding to 18:00 through 22:30.
- A manually entered focused-minutes value overrides the default but is clamped to `0..480`.
- No new heavy task is scheduled after 22:30. Passive listening is parallel activity and does not consume focused capacity.

The current `startTime` type must be extended to include `17:00`; existing records remain valid.

### Standard mode baselines

Normal-energy core baselines preserve the current study structure:

| Focus mode | Core baseline | Parallel listening reference |
| --- | ---: | ---: |
| Dictation | 175 minutes | 60 minutes |
| Reading | 190 minutes | 60 minutes |
| Speaking | 130 minutes | 60 minutes |
| Recovery | 60 minutes maximum | Optional, not required |

The 60-minute passive-listening value is a display reference, not a hard target. Passive listening may exceed 60 minutes, has no upper limit, does not consume focused capacity, does not reduce any other task, and does not affect Green/Yellow/Red.

### Energy variants

- Low targets approximately 70% of the mode's normal core baseline and retains the highest-priority tasks.
- Normal uses 100% of the baseline.
- High targets approximately 115% by adding a separate stretch task instead of merely lengthening one task.
- Recovery never increases above its normal 60-minute ceiling. Low Recovery may be reduced; High Recovery must not add work.

The initial exact profile totals are:

| Focus mode | Low | Normal | High |
| --- | ---: | ---: | ---: |
| Dictation | 120 | 175 | 200 |
| Reading | 135 | 190 | 220 |
| Speaking | 90 | 130 | 150 |
| Recovery | 45 | 60 | 60 |

These are versioned planning constants, not hidden UI calculations. Future calibration can change a new engine version without changing historical plan snapshots.

### Workday/Earlier Today credit

- The entered values are real minutes already completed before Generate Plan.
- They appear in a separate `Completed earlier` section and count toward actual daily/module totals.
- Momo, dictation, and reading credit reduce only their matching core group, one minute for one minute, down to zero.
- A credit never reduces a different category. For example, dictation completed on a Reading day may reduce a planned dictation-review task, but never reduces reading.
- Matching credit is applied before capacity trimming.
- Credit that exceeds its matching target, or has no matching target in the selected mode, is still counted as extra actual study but does not reduce another task.
- Passive-listening completion reduces only the remaining 60-minute listening reference shown to the user. It never changes focused tasks or status.
- There are no fabricated fixed workday tasks. A zero entry produces no completed-earlier item.

### Regeneration

Changing configuration after generation first displays a plan-difference preview. The user must confirm before applying it.

Regeneration preserves:

- `actualMinutes`;
- `completed`;
- `notes`;
- sleep-control state;
- real progress on a task that is no longer in the new plan.

Stable plan-entry IDs are used for exact matching. An old task with progress that has no matching new entry is retained as `carriedForward`, with no new target requirement, under `Earlier progress`. One old task must never be claimed by multiple new tasks.

## Architecture

### Pure planning pipeline

```text
DailyPlanInput
  -> normalize and validate input
  -> load versioned FocusModeProfile
  -> select the Energy variant
  -> aggregate same-category credit
  -> reduce matching task groups
  -> trim focused work to capacity by priority
  -> append parallel and sleep-control entries
  -> calculate summary and explanations
  -> DailyPlanResult
```

The engine must not read React state, LocalStorage, IndexedDB, Supabase, current time, or browser globals. The same input always returns the same result.

### Modules

#### `src/planning/taskRegistry.ts`

Owns task definitions. A definition describes presentation and behavior, not a day's mutable progress:

```ts
export type CreditGroup = "momo" | "dictation" | "reading" | "passive_listening";
export type CapacityKind = "focused" | "parallel" | "anchor" | "control";
export type StatusRole = "required" | "optional" | "ignored" | "control";

export interface TaskDefinition {
  id: string;
  title: string;
  category: TaskCategory;
  creditGroup?: CreditGroup;
  capacityKind: CapacityKind;
  statusRole: StatusRole;
  minMinutes: number;
  incrementMinutes: number;
}
```

Adding a normal future task requires adding one definition and referencing it from a profile. It must not require a new branch inside the engine. A genuinely new reporting category still requires extending `TaskCategory`, which preserves TypeScript exhaustiveness.

#### `src/planning/focusProfiles.ts`

Owns versioned mode templates and exact Low/Normal/High variants. Each entry has a stable `entryId`, definition ID, planned minutes, planning priority, credit order, and whether it may be omitted by capacity trimming.

#### `src/planning/planEngine.ts`

Owns validation, credit application, capacity trimming, deterministic IDs, summaries, and explanation codes. It returns `DailyPlanResult`; it never mutates an input object.

#### `src/planning/planProgress.ts`

Owns regeneration preview and progress-safe merging. It is separate from generation so both algorithms remain small and testable.

#### `src/utils/status.ts`

Keeps the legacy status path for records without a v2.1 plan snapshot. New records use the dynamic snapshot and task metadata.

### Plan types

Add these concepts to `src/types/index.ts`:

```ts
export type DayContext = "workday" | "rest_day";
export type PlanEngineVersion = 1;

export interface DailyPlanInput {
  exercised: boolean;
  energyLevel: EnergyLevel;
  dayType: DayType;
  dayContext: DayContext;
  workdayBonus: WorkdayBonus;
  availableFocusedMinutes?: number;
}

export interface PlanCredit {
  group: CreditGroup;
  enteredMinutes: number;
  appliedMinutes: number;
  extraMinutes: number;
}

export interface PlanSummary {
  standardCoreMinutes: number;
  energyAdjustedCoreMinutes: number;
  appliedCoreCreditMinutes: number;
  extraCompletedMinutes: number;
  capacityMinutes: number;
  capacityTrimmedMinutes: number;
  eveningCoreTargetMinutes: number;
  passiveReferenceMinutes: number;
  passiveReferenceRemainingMinutes: number;
}

export interface DailyPlanSnapshot {
  engineVersion: PlanEngineVersion;
  generatedAt: string;
  input: DailyPlanInput;
  credits: PlanCredit[];
  summary: PlanSummary;
  adjustmentCodes: PlanAdjustmentCode[];
}

export interface DailyPlanResult {
  tasks: TaskCheckItem[];
  snapshot: Omit<DailyPlanSnapshot, "generatedAt">;
}
```

`generatedAt` is supplied by the caller when the result is committed to a record. Keeping time out of the engine preserves determinism.

Extend `TaskCheckItem` with optional backward-compatible metadata:

```ts
definitionId?: string;
entryId?: string;
creditGroup?: CreditGroup;
capacityKind?: CapacityKind;
statusRole?: StatusRole;
carriedForward?: boolean;
```

Extend `DailyRecord` with optional fields so old LocalStorage and cloud JSON remain readable:

```ts
dayContext?: DayContext;
availableFocusedMinutes?: number;
planSnapshot?: DailyPlanSnapshot;
```

No Supabase migration is required because the cloud table stores the complete record as JSON.

## Planning Algorithm

### 1. Normalize input

- Missing legacy `dayContext` defaults to `workday` only when showing an old record; new setup always asks explicitly and defaults to `workday`.
- Blank available time means use the schedule default.
- Numeric entries are finite integers clamped to safe ranges.
- Workday/Earlier Today minutes are clamped to `0..720` per category.

### 2. Select profile

Select the exact profile variant by Focus Mode and Energy. Recovery maps High to the Normal Recovery variant to preserve the no-increase rule.

### 3. Apply matching credit

For each credit group:

1. Sum the selected profile's target minutes for entries in the group.
2. Apply `min(enteredCredit, groupTarget)`.
3. Record the remainder as extra completed minutes.
4. Reduce entries in configured credit order, never below zero.
5. Remove zero-minute evening entries from the generated task list.

Passive listening uses the same accounting structure for display, but its applied amount is excluded from `appliedCoreCreditMinutes`.

### 4. Trim to focused capacity

- Exclude `parallel` and `control` tasks from capacity.
- Keep required anchors such as wrap-up before optional/stretch work.
- Remove optional/stretch entries first, from lowest planning priority upward.
- Then reduce reducible entries in their configured increment while respecting `minMinutes`.
- If capacity is below all minimums, keep wrap-up and the highest-priority focus entry, reducing the focus entry to the remaining nonnegative capacity.
- Record every omitted or reduced entry in adjustment codes so the UI can explain what happened.
- Never add work to compensate for a small capacity.

### 5. Add passive reference and controls

- If the passive reference remaining is greater than zero, add one optional parallel task for that remaining reference.
- It is never core and never required for status.
- Add stable wrap-up and sleep-control entries using registry definitions.
- Preserve the existing bidirectional sleep-control synchronization.

## Dynamic Status Rules

Legacy records without `planSnapshot` continue through the existing algorithm unchanged.

For records with a v2.1 snapshot:

- `pending`: no plan tasks exist.
- `red`: compensatory staying up is not confirmed, or dynamic core progress is below 60%, or there is no real core progress.
- `yellow`: at least 60% but less than 100% of the dynamic core target is complete and no-compensatory-staying-up is confirmed.
- `green`: 100% of required dynamic core work is complete, wrap-up is complete, and both sleep-control requirements are confirmed.

Dynamic progress is calculated as:

```text
applied matching core credit + actual generated core minutes
------------------------------------------------------------
applied matching core credit + generated core target minutes
```

Clamp actual contribution per generated required task to at most its planned target when calculating the completion ratio. Extra minutes remain visible in totals but cannot conceal an unfinished required task. Passive listening and unrelated extra credit never affect the ratio.

## User Experience

### Setup

The Daily setup retains the existing recommendation and adds:

- Day Context segmented control.
- Optional `Tonight focused time` numeric input with the derived default shown beside it.
- Rename Workday Bonus to `Completed during work` on Workday and `Completed earlier today` on Rest Day.
- Keep the four current completion inputs.
- Short text explaining that these are real completed minutes and only matching tasks are reduced.

Generate Plan creates the record immediately, as today, then opens the tracker.

### Tracker overview

Before the task list, show an un-nested summary surface with:

- Standard core baseline.
- Energy-adjusted target.
- Matching credit applied.
- Capacity reduction.
- Tonight's remaining core target.
- Passive listening as a separate `60m reference`, never mixed into focused totals.

Show short explanation chips such as `Low energy`, `Workout start 19:00`, `30m dictation already done`, and `20m removed by capacity`.

### Task sections

Render distinct sections:

1. `Completed earlier`: only nonzero Workday/Earlier Today entries.
2. `Tonight's core plan`: generated focused and anchor tasks.
3. `Parallel listening`: the optional passive reference, when remaining.
4. `Earlier progress`: unmatched real progress retained during regeneration.
5. `Sleep control`: the two existing controls.

### Regeneration preview

When configuration changes, calculate but do not persist the next result. The preview shows:

- added tasks;
- removed tasks;
- target-minute changes;
- credits and capacity changes;
- progress that will be carried forward.

The confirmation copy must say that recorded progress is preserved. It must not claim progress will be reset.

## History And Stats

### History

- Show Day Context, dynamic evening target, completed-earlier total, and capacity trimming in the expanded record.
- Keep Workday/Earlier Today fields editable.
- Editing those fields does not silently regenerate a historical plan. Show a `Plan inputs changed` warning and offer explicit regeneration.
- Old records render without a snapshot using existing fields.

### Stats

Fix module totals so all Workday/Earlier Today categories count:

- Momo bonus -> Momo and formal totals.
- Dictation bonus -> Dictation and formal totals.
- Reading bonus -> Reading and formal totals.
- Passive bonus -> Passive only.

Do not count credit twice after it has reduced an evening target. The credit is actual completion; generated planned minutes are targets, and only generated `actualMinutes` are added to actual totals.

Streak and sleep-control algorithms remain unchanged except that they consume the status already stored on each record.

## Data Compatibility And Safety

- All new `DailyRecord` fields are optional.
- Loading existing records performs no destructive migration and does not rewrite them merely because the app opened.
- Legacy status calculations remain available indefinitely for legacy records.
- JSON import accepts records with or without v2.1 fields.
- Cloud sync continues to treat each DailyRecord JSON as one last-write-wins unit.
- Data Health validates new fields when present but does not report their absence on legacy records.
- Regeneration is the only operation that replaces plan targets, and it requires confirmation after progress exists.
- No direct object mutation is allowed in engine, merge, status, Stats, or React update paths.

## Testing Strategy

### Unit tests

Cover:

- all 4 modes x 3 energy values;
- Recovery High never exceeding 60;
- all four credit groups;
- same-category-only reduction;
- excess and unrelated credit;
- passive exclusion from capacity and status;
- all default capacities and manual overrides;
- capacity trimming priority and minimums;
- deterministic IDs and input immutability;
- progress-safe regeneration and one-to-one task matching;
- legacy and dynamic status paths;
- Stats inclusion of Momo, dictation, reading, and passive completion.

### Component tests

Cover setup fields, summary values, separated sections, preview differences, confirmation, and retained progress.

### Playwright

At mobile and desktop widths:

1. Generate a Normal Dictation Workday plan with completed-earlier credit.
2. Verify summary arithmetic and matching reduction.
3. Record progress and notes.
4. Change to Low Reading with a smaller capacity.
5. Verify preview before persistence.
6. Confirm regeneration and verify progress/notes remain visible.
7. Reload and verify the same snapshot and task state persist.
8. Open History and Stats and verify completed-earlier minutes appear once.
9. Confirm no horizontal overflow with and without wallpaper.

## Acceptance Criteria

1. A configuration combination produces one explainable dynamic plan.
2. Workday/Earlier Today values appear as real completed work and reduce only matching evening targets.
3. No fabricated fixed workday tasks remain.
4. Passive listening is a 60-minute optional reference, excluded from focused capacity and status.
5. Energy, workout, day context, and available time visibly affect the result according to this specification.
6. Recovery never gains extra work from High energy.
7. The tracker displays standard, adjusted, credited, trimmed, and remaining totals without mixing passive listening into focused time.
8. Regeneration previews differences and preserves all real progress and notes.
9. New records use dynamic status; legacy records retain their historical calculation path.
10. History and Stats use the same DailyRecord data and count all completed-earlier categories exactly once.
11. New task definitions can be added through the registry/profile boundary without modifying engine control flow.
12. Unit tests, TypeScript, production build, and Playwright pass.

## Scope Exclusions

- AI-generated plans.
- Automatic odd/even-week detection.
- Calendar integration.
- Automatic plan regeneration after edits.
- Automatic cloud sync.
- Cross-category substitution.
- Passive-listening enforcement.
- Recalculation of old historical statuses.
- Redesign of History, Stats, Settings, wallpaper, PWA, or navigation beyond the fields required here.

