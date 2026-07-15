# IELTS TimeBox Tracker Development Rules

Last updated: 2026-07-15

## Product Positioning

IELTS TimeBox Tracker is no longer only a time-box checklist. It should evolve as a personal IELTS study coach:

- It helps decide what to study today.
- It records what was actually done.
- It protects sleep and recovery.
- It turns daily execution into learning feedback.
- It gradually connects task behavior with IELTS skill readiness.

New features should improve at least one of these outcomes:

- better IELTS ability;
- clearer daily learning decisions;
- safer long-term consistency;
- more useful feedback for tomorrow's plan;
- more motivation without damaging recovery.

## Development Workflow

Do not jump directly from an idea to code for meaningful features.

The normal workflow is:

1. Clarify the product problem.
2. Write or update a design document in `docs/` or `docs/superpowers/specs/`.
3. Identify data, planning, status, stats, reward, cloud sync, and UI impact.
4. Break implementation into small reviewable tasks.
5. Implement one task at a time.
6. Run relevant tests and build checks.
7. Review before merge.
8. Merge through the established PR flow.

Small copy/style fixes can be lighter, but anything that changes data, planning, scoring, cloud sync, or task behavior needs a written plan first.

## Git Workflow

- Do not commit directly to `main`.
- Use focused branches such as `feature/v2.4-task-quality-upgrade` or `docs/v2.4-task-quality-upgrade-design`.
- Keep unrelated local files such as `DESIGN.md` and `read_projects.cjs` untracked unless explicitly requested.
- Prefer one coherent commit per logical task, not one commit for every tiny edit.
- Keep branches available after merge unless cleanup is explicitly requested.

## Cloud Sync Is Core Infrastructure

Cloud sync is no longer a future feature. It is part of the base architecture.

All new persistent data must explicitly define one of these positions:

1. Synced through the existing local-first cloud sync path.
2. Local-only by design, with a documented reason.
3. Deferred from cloud sync, with a migration path before it becomes user-critical.

Rules:

- UI pages must not write directly to Supabase tables.
- Persistent data should flow through local state first.
- New cloud-backed data needs RLS, migration, local fallback, and offline behavior considered.
- Never commit `.env`, service-role keys, or real secret values.
- Manual sync remains the current sync behavior unless a separate design approves automatic sync.

## Data Compatibility

Daily records, history, stats, reward points, wallpaper settings, and manual cloud sync are now production data paths.

Any schema change must answer:

- Does old LocalStorage still load?
- Does old cloud data still merge safely?
- Does History still render old records?
- Does Stats still calculate old records?
- Does Data Health detect or tolerate the new shape?
- Is a migration required?

Prefer additive optional fields over destructive rewrites.

## Task System Rules

The learning task system is the foundation for planning, status, stats, and rewards.

Task definitions should live in the central planning layer, not inside page components.

Current task infrastructure includes:

- `src/planning/taskRegistry.ts`
- `src/planning/focusProfiles.ts`
- `src/planning/stretchProfiles.ts`
- `src/planning/planEngine.ts`
- `src/planning/planProgress.ts`
- `src/utils/status.ts`
- `src/utils/stats.ts`
- `src/rewards/rewardPoints.ts`

Future task definitions should move toward this semantic model:

```ts
TaskDefinition {
  id: string;
  title: string;
  category: TaskCategory;
  skill?: IeltsSkill;
  description?: string;
  instruction?: string;
  doneCriteria?: string;
  creditGroup?: CreditGroup;
  capacityKind: CapacityKind;
  statusRole: StatusRole;
  minMinutes: number;
  incrementMinutes: number;
  formalStudy?: boolean;
  rewardEligible?: boolean;
}
```

Every task should eventually answer:

- What ability does this train?
- What should the user actually do?
- What counts as done?
- Does it affect Green/Yellow/Red status?
- Does it count for reward points?
- Can Workday Bonus reduce it?
- Does it count as formal study time?

## Planning Engine Rules

The Daily page should collect inputs. It should not own planning logic.

The desired flow is:

```text
User Inputs
  -> Planning Engine
  -> Daily Tasks
  -> Progress / Status / Stats / Rewards
```

When changing Focus Mode, Workday Bonus, optional stretch tasks, or task allocation, check:

- `planEngine.ts`
- `focusProfiles.ts`
- `stretchProfiles.ts`
- `taskRegistry.ts`
- `status.ts`
- `stats.ts`
- `rewardPoints.ts`
- Daily / History rendering
- Data Health validation
- tests

## Focus Mode Rules

Current focus modes:

- `listening_focus` displayed as Dictation;
- `reading_focus`;
- `speaking_focus`;
- `recovery`.

Future focus modes such as Writing, Mock Test, or Review Day must not be added as simple labels. They require impact analysis across:

- task registry;
- planning engine;
- recommendation logic;
- status calculation;
- stats;
- rewards;
- history;
- tests.

## Recommendation Rules

Focus recommendations must remain:

- explainable;
- deterministic;
- testable;
- safe to override manually.

The UI may recommend, but the user remains in control.

## Status Rules

Green / Yellow / Red / Pending are core behavior.

Do not change their meaning casually.

Current principle:

- required/control tasks affect status;
- optional stretch tasks do not punish the user;
- passive listening does not reduce or punish required focused work;
- pending records are transparent in streak logic.

Any future change to status rules needs a dedicated design and regression tests.

## Reward Rules

Rewards should motivate without encouraging overwork.

Current principle:

- completion of the baseline plan is the main reward source;
- optional stretch can add bonus reward but must be capped;
- reward settings must tolerate missing, old, or malformed data;
- reward display must never break Stats.

Future reward changes should protect sleep and recovery first.

## UI Rules

The interface should reduce execution friction, not merely look nicer.

Each important screen should help answer:

- What should I do now?
- Why is this recommended?
- What counts as complete?
- What changed after I edited this?
- What is the next useful step?

Visual polish is welcome, but readability, mobile layout, and no horizontal overflow are mandatory.

Wallpaper support means cards should remain legible over images.

## Testing Rules

For normal feature work, run the relevant focused tests first, then full checks before merge.

Common commands:

```bash
npm test
npm run typecheck
npm run build
npm run test:e2e
npm run check
```

Use narrower commands during development when appropriate, for example:

```bash
npx vitest run src/planning/planEngine.test.ts
npx vitest run src/rewards/rewardPoints.test.ts
```

Core logic should be tested before UI wiring.

## Do Not Do Without Explicit Confirmation

- Replace the tech stack.
- Rewrite the app architecture wholesale.
- Change DailyRecord compatibility.
- Change Green / Yellow / Red meaning.
- Change cloud sync behavior from manual to automatic.
- Delete or migrate user data destructively.
- Add a new major IELTS module such as Writing without a dedicated design.

## Product Principle

When choosing between two options, prefer:

- simple over clever;
- stable over ambitious;
- local-first safety over cloud convenience;
- learning effectiveness over gamified noise;
- incremental evolution over large rewrites.

