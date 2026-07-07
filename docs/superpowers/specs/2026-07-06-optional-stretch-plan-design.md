# v2.2 Optional Stretch Plan Design

## Objective

Turn the focused-capacity ceiling introduced in v2.1 into a positive optional challenge space.

In v2.1, the schedule-derived capacity values such as 210 and 270 minutes only act as a one-way safety brake: they trim an oversized plan, but they do not create additional opportunity when the selected focus mode target is lower than the available capacity. This can make the capacity number feel disconnected from the generated plan.

v2.2 adds an optional Stretch Plan that can use the unused capacity after the baseline plan is generated. The baseline plan remains the source of daily status. Stretch tasks are extra work: completing them is rewarded in history/stats and future points, but not completing them has no penalty.

## Product Rules

### Baseline plan remains authoritative

- The existing v2.1 dynamic plan remains the required daily baseline.
- Green, Yellow, Red, and Pending continue to be calculated from the baseline plan only.
- Completed-earlier credit still reduces only matching baseline task groups.
- Passive listening remains parallel and does not consume focused capacity.
- Sleep-control tasks remain unchanged.
- Existing v2.1 records without stretch metadata remain valid.

### Stretch plan trigger

After a baseline plan is generated, Daily shows an optional section below the plan summary:

> Add optional stretch plan

The user can leave this off. When off, no stretch tasks are generated and the v2.1 behavior is unchanged.

When on, the app calculates:

```text
stretchBudget = max(0, capacityMinutes - energyAdjustedCoreMinutes)
```

This uses the selected mode target before completed-earlier credit. The intent is to expose the unused schedule capacity without letting earlier work create an artificially large stretch budget.

Examples:

- Workday, no workout, Dictation Normal: capacity 270, mode target 175, stretch budget 95.
- Workday, workout, Reading Normal: capacity 210, mode target 190, stretch budget 20.
- Workday, workout, Reading High: capacity 210, mode target 220, stretch budget 0 because the baseline already exceeds the capacity and will be trimmed.

Stretch budget is rounded down to the same five-minute increments used by normal planning.

### Stretch strategy

v2.2 supports two user-facing strategies.

#### Same Focus

Use the same focus mode as the baseline. This is for deepening the chosen module.

Examples:

- Dictation day: add more Momo, dictation review, new dictation, or error-check work.
- Reading day: add reading analysis, notes, scan, or small supporting dictation review.
- Speaking day: add speaking drills, recording/review, or short Momo.
- Recovery day: add only light recovery-safe work and never turn recovery into a heavy day.

#### Balanced

Spread stretch time across other useful categories so the day does not become too one-dimensional.

Examples:

- Dictation day may add a small Reading or Speaking block.
- Reading day may add light Dictation or Speaking.
- Speaking day may add Reading or Momo.
- Recovery day may add only light maintenance blocks.

Balanced does not mean equal distribution. It means a stable, preconfigured cross-module sequence.

### No full custom picker in v2.2

The data model should allow future custom strategies, but v2.2 does not need a full manual task-type picker. A full picker would make the Daily setup screen heavier before the core stretch behavior has been validated.

The initial strategy enum should therefore support:

- `same_focus`
- `balanced`

It may reserve a future value such as `custom`, but the UI must not expose unfinished custom behavior.

## Stretch Task Semantics

Stretch tasks are regular task records with explicit metadata:

- `planRole: "stretch"` or an equivalent strongly typed field.
- `statusRole: "optional"` or another value that makes status calculations ignore them.
- `capacityKind: "stretch"` or a clearly equivalent value.
- A stable `entryId` and `definitionId`.
- A `stretchStrategy` value in the plan snapshot.

Stretch tasks:

- Count toward actual study minutes in history and stats.
- Are visible in Daily and History.
- Can be edited like other tasks.
- Are preserved during regeneration when they still match.
- Can become carried-forward progress if a regeneration removes them after the user has already logged real work.
- Do not affect daily status if incomplete.
- Should not be counted as baseline target minutes.

## Workday Credit Interaction

Completed-earlier fields continue to apply only to the baseline plan.

This means:

- Momo credit reduces baseline Momo only.
- Dictation credit reduces baseline Dictation only.
- Reading credit reduces baseline Reading only.
- Passive listening reduces only the passive reference.
- Extra credit remains extra actual study but never reduces another category.
- Stretch tasks are generated after the baseline target and stretch budget are decided.

Stretch tasks should not be reduced by completed-earlier credit in v2.2. This keeps the mental model simple:

> Earlier work reduces today's required baseline. Stretch is an optional extra challenge chosen after that.

## Recommended Stretch Allocation

The first implementation should use versioned profile constants, not ad hoc branching in the UI.

Add a small stretch-profile registry parallel to the existing focus profile registry:

- It maps `dayType + strategy` to an ordered list of stretch entries.
- Each entry has `definitionId`, `entryId`, `plannedMinutes`, `priority`, and optional min/increment metadata.
- The engine fills entries until the stretch budget is exhausted.
- Entry minutes are capped by their configured planned minutes.
- If the stretch budget is smaller than the first entry, the first entry may be reduced to a five-minute increment.
- Recovery stretch profiles must stay intentionally light.

Suggested initial shape:

| Baseline focus | Same Focus examples | Balanced examples |
| --- | --- | --- |
| Dictation | Momo, dictation review, new dictation, error check | Reading analysis, speaking drill, Momo |
| Reading | Reading analysis, notes, scan | Dictation review, speaking drill, Momo |
| Speaking | Speaking drill, recording review, Momo | Reading notes, dictation review, Momo |
| Recovery | Momo, dictation review | Momo, light reading notes |

Exact minute values should be defined in the implementation plan after inspecting the current task registry and profile totals.

## UI Design

### Daily setup

The setup form remains focused on the baseline plan. Do not add the stretch strategy before Generate Plan unless the user has already enabled stretch in a previous session.

### Generated Daily view

Below the existing plan summary, add a compact stretch section:

```text
Optional stretch
Unused focused capacity: 95m
[off/on] Add optional stretch plan
[Same Focus] [Balanced]
```

When off:

- Show the available stretch budget.
- Explain that this does not affect today's color status.

When on:

- Show the generated stretch tasks in a separate visual group below baseline tasks.
- Clearly label them as optional.
- Show `0 penalty if skipped` or a similarly concise reassurance.

### Regeneration

If the user changes baseline inputs after enabling stretch:

- Recalculate stretch budget.
- Recalculate stretch tasks using the selected strategy.
- Include stretch additions/removals in the existing regeneration preview.
- Preserve actual minutes, completion, and notes for matching stretch tasks.
- Preserve removed real stretch progress as carried-forward progress.

### History

History should show:

- Baseline target summary.
- Optional stretch summary when present.
- Stretch completion minutes.
- A clear label that stretch does not change the day status.

### Stats

Stats should add lightweight stretch visibility, not a full reward system yet:

- Total stretch minutes completed.
- Number of days with stretch enabled.
- Number of days with stretch completed at least partially.

The future points system can consume these fields in v2.3.

## Data Model

Extend the dynamic plan snapshot without breaking old records.

Suggested additions:

```ts
type PlanRole = "baseline" | "stretch" | "carried" | "control";
type StretchStrategy = "same_focus" | "balanced";

interface TaskCheckItem {
  planRole?: PlanRole;
  stretchStrategy?: StretchStrategy;
}

interface DailyPlanSnapshot {
  stretch?: {
    enabled: boolean;
    strategy?: StretchStrategy;
    budgetMinutes: number;
    plannedMinutes: number;
    completedMinutes?: number;
  };
}
```

The exact names can be adjusted during implementation, but the contract must preserve these concepts:

- Baseline tasks and stretch tasks are distinguishable.
- Status calculations can ignore stretch safely.
- Stats and future rewards can query stretch completion.
- Legacy records without `stretch` are treated as `enabled: false`.

## Status Calculation

Daily status must remain based on baseline required tasks and sleep-control rules.

Stretch tasks must be excluded from:

- Required target minutes.
- Completion ratio denominator.
- Required task completion checks.
- Red/yellow/green threshold decisions.

Stretch tasks may be included in:

- Total actual minutes.
- Module actual minutes.
- Future reward-point calculation.

## LocalStorage and Cloud Sync

No new table or Supabase schema change is required for v2.2 if stretch metadata remains inside `DailyRecord` and `record_json`.

The existing local-first and manual cloud-sync behavior should continue unchanged:

- No automatic sync.
- No realtime.
- No separate cloud stretch table.
- Tombstones remain record-level.

## Testing Requirements

Add focused unit tests before implementation:

- Stretch budget is `capacityMinutes - energyAdjustedCoreMinutes`, not `capacityMinutes - eveningCoreTargetMinutes`.
- Passive listening never changes stretch budget.
- Completed-earlier credit never increases stretch budget.
- Same Focus generates stretch entries from the selected focus family.
- Balanced generates cross-module stretch entries.
- Stretch tasks are ignored by status calculation.
- Stretch actual minutes are counted in stats.
- Regeneration preserves stretch progress and carries removed progress forward.
- Legacy records without stretch metadata remain healthy.

Add at least one browser smoke test:

- Generate a Dictation Normal workday with no workout.
- Confirm baseline target remains 175.
- Enable Same Focus stretch.
- Confirm stretch appears separately and status remains based on baseline.
- Confirm no mobile horizontal overflow at 390px.

## Out of Scope

v2.2 does not include:

- Reward points.
- Reward goals.
- AI-generated plans.
- Full custom stretch task picker.
- Automatic workweek detection.
- Automatic cloud sync.
- Calendar integration.
- Changing existing v2.1 baseline totals.

## Future v2.3 Reward Points Preview

v2.2 should prepare clean data for v2.3 but not implement points.

The intended future model:

- Green baseline completion grants full daily points.
- Yellow grants partial points.
- Red grants little or no points.
- Stretch completion grants a small bonus, such as `+0.2`.
- Stats or Settings can define a real-world reward goal, such as a meal or purchase, with a target point total.

This is intentionally deferred so v2.2 can validate whether optional stretch tasks feel motivating without making the scoring system too complex too early.
