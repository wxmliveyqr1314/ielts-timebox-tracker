# v2.3 Reward Points Design

## Objective

Add a lightweight reward-points layer that makes daily progress feel more motivating without changing the existing planning, status, cloud sync, or deletion rules.

v2.3 should reward the behavior the app already cares about:

- completing the baseline daily plan;
- keeping a steady green/yellow streak;
- optionally doing stretch work when there is extra capacity.

The reward system must be encouraging, not punitive. It should help the user connect study effort to real-world rewards such as a meal, a purchase, or another personal treat.

## Product Position

v2.1 introduced dynamic baseline planning.
v2.2 introduced optional stretch work.
v2.3 should sit above both as an incentive layer.

The points system must not become a second status engine. Green, Yellow, Red, and Pending remain the source of truth for whether a day met the required plan. Points explain and reward that result.

## MVP Scope

### Included

1. A simple reward goal:
   - goal name, such as "Hotpot dinner" or "Buy a keyboard";
   - target points, such as `20`;
   - optional note.
2. A points summary:
   - total earned points;
   - progress toward the active reward goal;
   - recent seven-day points;
   - average points per completed day.
3. Per-day point calculation from existing records:
   - Green gives full baseline points;
   - Yellow gives partial baseline points;
   - Red and Pending give no baseline points;
   - optional stretch gives small bonus points.
4. Display in Stats and Settings:
   - Stats shows reward progress and recent points;
   - Settings allows editing the active reward goal.
5. JSON export/import support through the existing `AppState` local storage path.
6. Data Health validation for reward settings.

### Excluded

1. No complex store, inventory, badges, levels, or achievements.
2. No manual point editing in v2.3.
3. No negative points or punishment.
4. No automatic cloud sync changes for settings.
5. No changes to `calculateColorStatus`.
6. No changes to v2.1 baseline generation or v2.2 stretch generation.
7. No AI recommendation logic.

## Scoring Rules

### Baseline status points

Use the final saved `DailyRecord.status`.

| Status | Points | Meaning |
| --- | ---: | --- |
| `green` | `1.0` | Required baseline fully met |
| `yellow` | `0.5` | Meaningful partial completion |
| `red` | `0` | Baseline missed |
| `pending` | `0` | Day not completed yet |

The app should present this as a motivational system, not a judgment system.

### Optional stretch bonus

Stretch bonus only applies to records with `planSnapshot.stretch.enabled === true`.

Recommended MVP rule:

```text
stretchCompletionRatio = min(1, stretchCompletedMinutes / stretchPlannedMinutes)
stretchBonusPoints = roundToOneDecimal(0.2 * stretchCompletionRatio)
```

Examples:

- 0 of 40 stretch minutes completed -> `+0.0`
- 20 of 40 completed -> `+0.1`
- 40 of 40 completed -> `+0.2`
- more than planned -> still capped at `+0.2`

This keeps stretch encouraging but prevents it from becoming more important than the baseline.

### Total day points

```text
dayPoints = baselineStatusPoints + stretchBonusPoints
```

Maximum normal day score is `1.2`.

Pending days always return `0`, even if some minutes have been entered. This avoids prematurely awarding an unfinished day.

### Future scoring flexibility

The scoring constants should live in one reward utility module, not inside React components:

```ts
const REWARD_POINTS_VERSION = 1;
const STATUS_POINTS = {
  green: 1,
  yellow: 0.5,
  red: 0,
  pending: 0,
};
const MAX_STRETCH_BONUS = 0.2;
```

Future versions can add task-ratio scoring or streak bonuses without rewriting the UI.

## Data Model

### AppState extension

Add an optional rewards object to `AppState`.

```ts
export interface RewardGoal {
  id: string;
  title: string;
  targetPoints: number;
  note?: string;
  createdAt: string;
  completedAt?: string;
}

export interface RewardSettings {
  schemaVersion: 1;
  activeGoal?: RewardGoal;
}

export interface AppState {
  records: Record<string, DailyRecord>;
  settings?: AppSettings;
  rewards?: RewardSettings;
  sync?: { ... };
}
```

The reward goal is local-first in v2.3. It is included in localStorage and JSON export/import. Existing manual Supabase daily-record sync does not need to sync this settings object in v2.3.

Because points are derived from `records`, the most important point total naturally follows synced daily records across devices. If the reward goal itself needs cross-device sync later, add a dedicated settings sync in a future version.

### No per-record point storage in MVP

Do not store calculated points inside each `DailyRecord` in v2.3.

Reasons:

- History editing can change status or stretch minutes.
- Deleting a record should automatically remove its points.
- Regeneration should not create stale point totals.
- A pure derived calculation is easier to test and safer with cloud merge.

## Reward Utility Module

Create a pure module:

```text
src/rewards/rewardPoints.ts
```

Responsibilities:

1. Calculate points for one record.
2. Calculate total points for a list of records.
3. Calculate recent points for the last N records.
4. Calculate progress toward a reward goal.
5. Format point values for display.

It must not read or write:

- React state;
- localStorage;
- Supabase;
- IndexedDB;
- current time, except when creating a goal in the UI layer.

### Suggested functions

```ts
export function calculateRecordRewardPoints(record: DailyRecord): RecordRewardPoints;

export function calculateRewardSummary(
  records: DailyRecord[],
  goal?: RewardGoal,
): RewardSummary;

export function formatPoints(points: number): string;
```

Suggested result shape:

```ts
export interface RecordRewardPoints {
  date: string;
  status: DayStatus;
  baselinePoints: number;
  stretchPoints: number;
  totalPoints: number;
  stretchCompletedMinutes: number;
  stretchPlannedMinutes: number;
}

export interface RewardSummary {
  totalPoints: number;
  recent7Points: number;
  completedDays: number;
  averagePointsPerCompletedDay: number;
  goalTitle?: string;
  goalTargetPoints?: number;
  goalProgressRatio?: number;
  pointsRemaining?: number;
}
```

## UI Design

### Stats page

Add a compact reward card near the top, after the existing core metric cards or before Optional Stretch.

Recommended card content:

```text
Reward progress
8.5 / 20 points
Goal: Hotpot dinner
[progress bar]
Recent 7 days: 3.2 points
Stretch bonus: +0.4
```

If no active goal exists:

```text
Reward progress
No reward goal yet
Set one in Settings to make progress tangible.
```

The card should use existing `wallpaper-surface` styling and must remain readable over wallpaper.

### Settings page

Add a "Reward Goal" section, near Data Health or below it.

Fields:

- Goal title input;
- Target points numeric input;
- Optional note input;
- Save button;
- Clear goal button with confirmation.

Validation:

- title is required to save;
- target points must be an integer or decimal between `1` and `999`;
- note is optional and capped at a reasonable length such as 120 characters.

No destructive action should happen without confirmation.

### History page

v2.3 may show a small point value on each expanded record, but this is optional for MVP.

Recommended MVP: do not add History UI until Stats/Settings prove useful. If implemented, keep it read-only:

```text
Points: 1.1
Baseline: 1.0 / Stretch: 0.1
```

## Data Flow

```text
AppState.records
  -> sortRecordsByDateDesc
  -> rewardPoints pure helpers
  -> Stats display

AppState.rewards.activeGoal
  -> Settings edit
  -> localStorage persistence through useAppData
  -> JSON export/import
  -> Stats goal progress display
```

Daily and History editing indirectly affect points because the points are derived from saved records. No special update hook is required.

## Cloud Sync Behavior

v2.3 does not change manual Supabase daily-record sync.

Implication:

- Records sync across devices as they do now.
- Derived total points follow synced records.
- The reward goal setting is local to the current browser unless imported through JSON.

This is acceptable for the MVP because the reward target is not study evidence; it is preference metadata. A later version can add settings sync after the scoring model proves useful.

## Error Handling

1. Invalid or missing reward settings:
   - ignore malformed reward goal;
   - Data Health reports a warning or error;
   - Stats falls back to "No reward goal yet".
2. Invalid record dates:
   - use the existing date normalization and sorting behavior.
3. Missing stretch metadata:
   - treat stretch bonus as zero.
4. `stretchPlannedMinutes <= 0`:
   - treat stretch bonus as zero.
5. Negative actual minutes:
   - Data Health already flags invalid task minutes;
   - reward helpers should clamp stretch actual minutes to zero defensively.

## Data Health

Extend `analyzeAppDataHealth` to validate:

- `rewards` is an object when present;
- `rewards.schemaVersion === 1`;
- active goal title is a non-empty string;
- target points is a finite positive number;
- target points is not unreasonably large;
- `completedAt`, if present, is a valid date string.

Malformed rewards should not crash Settings or Stats.

## Testing Plan

### Unit tests

Add tests for:

1. Green gives `1.0`.
2. Yellow gives `0.5`.
3. Red gives `0`.
4. Pending gives `0`.
5. Stretch bonus is proportional and capped at `0.2`.
6. Missing stretch snapshot gives `0` stretch bonus.
7. Total summary handles empty records.
8. Goal progress clamps ratio to `0..1`.
9. Formatting avoids noisy decimals, such as `1`, `1.1`, `0.5`.
10. Data Health catches malformed reward settings.

### React tests

Add tests for:

1. Stats shows "No reward goal yet" when no goal exists.
2. Stats shows progress when a goal exists.
3. Settings can render the reward goal form.
4. Settings save updates `AppState.rewards`.
5. Settings clear requires confirmation.

### E2E smoke

Add or extend Playwright smoke only if the UI surface is broad enough:

- seed records with green/yellow/stretch data;
- open Stats and verify reward progress is visible;
- open Settings and verify reward goal section exists.

## Release Scope

v2.3 should be released as:

- pure reward calculation helpers;
- Settings reward goal editor;
- Stats reward progress display;
- Data Health validation;
- version bump to `2.3.0`;
- release checklist update.

Do not include:

- reward history store;
- cloud settings sync;
- badges;
- streak multipliers;
- manual point correction;
- notification reminders.

## Acceptance Criteria

1. Existing v2.2 daily planning behavior remains unchanged.
2. Existing Green / Yellow / Red / Pending calculation remains unchanged.
3. Optional Stretch remains optional and no-penalty.
4. Points are derived from records and update when history records are edited or deleted.
5. Stats shows reward progress without layout overflow on mobile.
6. Settings can save and clear one active reward goal.
7. LocalStorage and JSON export/import preserve reward settings.
8. Malformed reward settings do not white-screen the app.
9. `npm test`, `npm run typecheck`, `npm run build`, and relevant e2e smoke tests pass.

## Future Extensions

After observing v2.3 usage, possible later improvements:

1. Settings cloud sync for reward goals.
2. Multiple reward goals.
3. Redeem/archive completed goals.
4. Streak bonus.
5. More detailed task-ratio scoring.
6. Weekly summary of points earned.
7. A reward timeline in History.
