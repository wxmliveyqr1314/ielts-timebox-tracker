# v2.5 Study Plan / Task Library Design

## Goal

v2.5 should add a read-only Study Plan page that helps the user understand the current IELTS task system.

The app already generates dynamic daily plans and now has task guidance metadata. The missing product surface is a stable place to answer:

- What tasks exist in the system?
- Which IELTS skill does each task train?
- What should I actually do for this task?
- What counts as finished?
- Does the task affect status, rewards, focused capacity, or workday credit?

This phase should reduce decision friction and make the app feel more like an IELTS study coach, without changing the daily planning algorithm.

## Non-Goals

v2.5 must not:

- change Daily plan generation;
- change Green / Yellow / Red / Pending rules;
- change reward scoring;
- add Writing;
- add IELTS mock-test workflows;
- add AI analysis;
- add editable task definitions;
- add cloud sync changes;
- migrate old DailyRecord data.

This is a read-only learning reference page.

## User Problem

The user can forget what a task means or face choice overload when a generated task appears. For example, "Long sentence analysis" is useful only if the app reminds the user to break down 3-5 difficult sentences and identify structure.

Daily task cards now show compact guidance, but the user still needs a full task map outside the daily execution flow.

## Recommended Approach

### Option A: Put Task Library inside Settings

Simple to implement, no navigation change. However, Settings is already dense and task guidance is not a configuration concern.

### Option B: Add a fifth bottom-tab page named Study

Recommended. It makes the task system visible as a first-class study surface. The risk is mobile nav density, so the implementation must keep labels short and verify no horizontal overflow.

### Option C: Add collapsible help only inside Daily

Low navigation cost, but it keeps the learning system hidden until a plan is generated and does not solve the need for a complete task list.

v2.5 should use Option B.

## Page Name and Navigation

Add a bottom navigation tab:

- id: `study`
- label: `Study`
- icon: use an existing Lucide study-related icon such as `BookOpen`

The tab order should be:

1. Daily
2. Study
3. History
4. Stats
5. Settings

Reason: Study is conceptually close to Daily. It explains what daily tasks mean before reviewing history or stats.

Mobile constraints:

- keep labels short;
- reduce horizontal padding if needed;
- preserve tap target height;
- verify phone width around 390px;
- no horizontal overflow.

## Data Source

The page reads from:

- `TASK_REGISTRY` in `src/planning/taskRegistry.ts`

It should not duplicate task descriptions inside the page component.

If a task lacks optional metadata, the UI should gracefully show a short fallback, not crash.

No persistent data is introduced.

Cloud sync impact: none.

LocalStorage impact: none.

Supabase impact: none.

## Grouping Model

Tasks should be grouped by learning purpose, not raw category string.

Recommended groups:

### Vocabulary

- Momo vocabulary

### Listening

- Dictation error review
- New dictation unit
- Dictation error check
- Additional dictation practice
- Light dictation review
- Passive listening reference

### Reading

- Reading passage scan
- Long sentence analysis
- Synonym and vocabulary notes
- Additional timed reading
- Light reading review

### Speaking

- Speaking shadowing
- AI speaking conversation
- Correction and retake
- Additional speaking simulation

### Review and Planning

- Dictation or light reading review
- Record results and tomorrow's first step

### Sleep Protection

- No new heavy task after 22:30
- No compensatory staying up

If future tasks add `writing`, the group can be added later. Do not add a Writing group in v2.5 unless real writing tasks exist.

## Task Card Content

Each task card should show:

- task title;
- skill label;
- short description;
- "How to do it" instruction;
- "Done when" criteria;
- metadata badges.

Suggested badges:

- Status: `Required`, `Optional`, `Ignored`, or `Control`
- Capacity: `Focused`, `Parallel`, `Anchor`, or `Control`
- Reward: `Reward` / `No reward`
- Formal study: `Formal` / `Support`
- Credit group when present, such as `Dictation credit`

Badges should be compact and readable over wallpaper surfaces.

## Visual Design

Follow the current v1.8+ visual direction:

- use `wallpaper-surface` cards;
- keep strong readability over wallpaper;
- avoid large marketing hero sections;
- use compact, utility-first dashboard style;
- cards should be practical, not decorative.

Suggested layout:

1. Header card:
   - title: `Study Plan`
   - subtitle: `Task guide for the current IELTS routine`
   - summary pills:
     - total tasks;
     - focused tasks;
     - reward-eligible tasks.

2. Group sections:
   - group title;
   - one-sentence purpose;
   - list of task cards.

3. Optional note:
   - `This page is read-only. Daily plans still decide what to do today.`

No editing controls in v2.5.

## Component Boundary

Recommended files:

- `src/pages/StudyPlanPage.tsx`
- `src/pages/StudyPlanPage.test.tsx`
- optionally `src/planning/taskLibraryView.ts`
- optionally `src/planning/taskLibraryView.test.ts`

Keep page-specific presentation in the page component. If grouping and badge formatting become more than a few lines, extract a pure helper so tests can cover it without rendering React.

## Helper Functions

If extracted, a helper may expose:

```ts
export interface TaskLibraryGroup {
  id: string;
  title: string;
  description: string;
  tasks: Readonly<TaskDefinition>[];
}

export function buildTaskLibraryGroups(
  registry: Readonly<Record<string, Readonly<TaskDefinition>>>,
): TaskLibraryGroup[];
```

Rules:

- preserve deterministic group order;
- hide no known tasks;
- place unknown or uncategorized skills in Review and Planning or a final Other group;
- do not mutate the registry.

## Testing

Focused tests should cover:

- every task in `TASK_REGISTRY` appears exactly once;
- expected groups are present;
- core guidance text such as description, instruction, and done criteria renders;
- metadata badges render for required/control/ignored and reward/no-reward tasks;
- bottom navigation can switch to Study;
- no page crash if optional metadata is absent in a test fixture.

Before merge, run:

```bash
npm test -- --run
npm run typecheck
npm run build
npm run test:e2e
```

Add or update e2e smoke coverage only if the existing navigation smoke test does not automatically cover the new tab.

## Data Health

No new persistent data means no Data Health schema changes are required.

However, v2.5 indirectly depends on task metadata quality. If the page exposes missing metadata too visibly, add a test that asserts generated task definitions have:

- `description`
- `instruction`
- `doneCriteria`

Do not make legacy `mixed-review` fail health checks. It remains valid for old records and can appear as a legacy review item.

## Accessibility

- The page title should be a semantic heading.
- Group headings should be navigable.
- Badges should not be the only way to understand a task.
- Avoid tiny body text for instructions.
- The bottom nav button must remain keyboard-clickable and screen-reader readable.

## Release Checklist

- Study tab visible on mobile.
- No horizontal overflow at common phone width.
- Every task registry definition appears once.
- Daily generation unchanged.
- History and Stats unchanged.
- Wallpaper readability remains acceptable.
- Version should bump to `2.5.0` during the implementation release wrap, not during this design-only PR.

## Future Phases

After v2.5 is stable:

1. Add IELTS exam-style task types: Listening Section, Reading Passage, Speaking Part Practice.
2. Add Error Log for Listening / Reading / Speaking mistake types.
3. Add a longer-term IELTS Roadmap or Study Plan progress model.
4. Add Writing only after a dedicated Writing data design.

v2.5 should prepare the user-facing surface for these future phases without pretending they already exist.
