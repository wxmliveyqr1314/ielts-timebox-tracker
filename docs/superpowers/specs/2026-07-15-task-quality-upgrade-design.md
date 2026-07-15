# v2.4 Task Quality Upgrade Design

Date: 2026-07-15

Status: Design ready for review

## Summary

v2.4 should upgrade the task system from "time blocks with labels" into clearer IELTS learning actions.

This is Phase A of the broader IELTS Study Coach direction. It should not add IELTS mock tests, Writing, Error Log, or a new Study Plan page yet. The goal is to strengthen the task foundation so later exam-specific features have a reliable base.

## Product Goal

After v2.4, each generated Daily task should make it clearer:

- what the user should do;
- which IELTS skill or support ability it trains;
- what counts as completed;
- whether Workday Bonus can reduce it;
- whether it affects status and rewards.

The Daily plan should remain lightweight, but the task model should become more semantic.

## Non-Goals

v2.4 will not:

- add Writing Focus;
- add IELTS Listening Section / Reading Passage / Speaking Part practice;
- add Error Log;
- add Study Plan / IELTS Roadmap page;
- change Green / Yellow / Red thresholds;
- change manual cloud sync into automatic sync;
- rewrite existing DailyRecord history.

## Current Reality

Current task infrastructure already has useful structure:

- `TaskDefinition` in `src/planning/taskRegistry.ts`;
- `FOCUS_PROFILES` in `src/planning/focusProfiles.ts`;
- optional stretch profiles;
- `creditGroup`, `capacityKind`, `statusRole`, `minMinutes`, `incrementMinutes`;
- `WorkdayBonus` for passive listening, momo, dictation, and reading;
- `DailyRecord.planSnapshot` preserving generated plan inputs and credits;
- status and reward systems that already read task roles.

Current gaps:

- tasks do not explain how to perform them;
- tasks do not define done criteria;
- `mixed-review` combines dictation and reading in one ambiguous task;
- speaking work done during the workday cannot be entered as bonus credit;
- speaking tasks do not currently have a `CreditGroup`;
- future IELTS-specific tasks need a cleaner semantic base.

## Proposed Data Model Additions

### TaskDefinition Learning Metadata

Extend `TaskDefinition` with optional metadata fields:

```ts
export type IeltsSkill =
  | "listening"
  | "reading"
  | "speaking"
  | "writing"
  | "vocabulary"
  | "review"
  | "planning"
  | "sleep";

export interface TaskDefinition {
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

These fields are optional in v2.4 so old task definitions and old records remain compatible.

### CreditGroup

Extend `CreditGroup`:

```ts
export type CreditGroup =
  | "momo"
  | "dictation"
  | "reading"
  | "speaking"
  | "passive_listening";
```

### WorkdayBonus

Extend `WorkdayBonus`:

```ts
export interface WorkdayBonus {
  passiveListeningMinutes: number;
  momoMinutes?: number;
  dictationMinutes?: number;
  readingMinutes?: number;
  speakingMinutes?: number;
}
```

This field means: speaking practice already completed before Generate Plan.

## Task Definition Upgrade Rules

Every active registry task should receive:

- `skill`;
- `description`;
- `instruction`;
- `doneCriteria`;
- `formalStudy`;
- `rewardEligible`.

Suggested definitions:

### Momo vocabulary

- Skill: `vocabulary`
- Instruction: review assigned Momo vocabulary and mark difficult words.
- Done criteria: complete the planned minutes or one planned review unit.
- Formal study: true
- Reward eligible: true

### Dictation error review

- Skill: `listening`
- Instruction: review previous dictation errors, replay original audio, and correct repeated mistakes.
- Done criteria: review at least 5 error items or complete the planned minutes.

### New dictation unit

- Skill: `listening`
- Instruction: complete a new dictation segment and note unclear words or sentences.
- Done criteria: complete one assigned segment or planned minutes.

### Dictation error check

- Skill: `listening`
- Instruction: quickly verify recent dictation mistakes and repeat only the missed parts.
- Done criteria: complete the error checklist or planned minutes.

### Reading passage scan

- Skill: `reading`
- Instruction: scan a passage, identify structure, topic sentences, and question locations.
- Done criteria: finish one passage scan or planned minutes.

### Long sentence analysis

- Skill: `reading`
- Instruction: select 3-5 complex sentences. Identify sentence structure, grammar links, and key vocabulary.
- Done criteria: finish at least 3 long-sentence breakdowns or planned minutes.

### Synonym and vocabulary notes

- Skill: `reading`
- Instruction: collect IELTS reading synonyms, paraphrases, and vocabulary from mistakes or passages.
- Done criteria: record at least 5 useful items or planned minutes.

### Speaking shadowing

- Skill: `speaking`
- Instruction: shadow short spoken material, focusing on pronunciation, rhythm, and fluency.
- Done criteria: complete the planned minutes or one short shadowing set.

### AI speaking conversation

- Skill: `speaking`
- Instruction: answer IELTS-style speaking prompts with an AI or speaking partner.
- Done criteria: complete one focused conversation round or planned minutes.

### Correction and retake

- Skill: `speaking`
- Instruction: review corrected answers, then retake the same question with improvements.
- Done criteria: complete at least one corrected retake.

### Wrap-up

- Skill: `planning`
- Instruction: record results, notes, and tomorrow's first step.
- Done criteria: fill tomorrow's first step and any necessary notes.
- Formal study: false
- Reward eligible: false
- Status role remains `required` in v2.4 unless a later design changes status rules.

### Passive listening reference

- Skill: `listening`
- Instruction: log passive listening reference time.
- Done criteria: reach the reference amount if applicable.
- Formal study: false
- Reward eligible: false
- Status role remains `ignored`.

### Sleep controls

- Skill: `sleep`
- Instruction: confirm sleep-protection behavior.
- Done criteria: mark honestly.
- Formal study: false
- Reward eligible: false

## Mixed Review Split

Current problem:

```text
mixed-review = Dictation or light reading review
```

This is ambiguous for stats and user behavior.

v2.4 should introduce:

### `light-dictation-review`

- Title: Light dictation review
- Skill: `listening`
- Credit group: `dictation`
- Category: `dictation_review`
- Done criteria: review 5 dictation errors or replay one short section.

### `light-reading-review`

- Title: Light reading review
- Skill: `reading`
- Credit group: `reading`
- Category: `reading_synonym_notes`
- Done criteria: review 5 reading synonyms, vocabulary items, or one short sentence set.

New plans should stop generating `mixed-review`.

Compatibility rule:

- Old historical records with `definitionId: "mixed-review"` must continue to render.
- `getTaskDefinition("mixed-review")` should remain for compatibility.
- Data Health should not flag old `mixed-review` records as invalid.
- Stats may keep treating old mixed review as `other` unless a later migration maps it.

## Speaking Bonus

### User Meaning

`speakingMinutes` means speaking-related work already completed during the day before pressing Generate Plan.

Examples:

- shadowing during a break;
- short oral practice;
- repeating IELTS answers;
- AI speaking drill already done before evening.

### Reduction Rule

Speaking bonus should reduce only safe speaking tasks.

Initial v2.4 rule:

1. Add `creditGroup: "speaking"` to `speaking-shadowing`.
2. Add `creditGroup: "speaking"` to `speaking-stretch`.
3. Do not reduce `speaking-conversation` or `speaking-retake` by default.

Reason:

Shadowing is easier to replace with daytime speaking work. AI conversation and retake are higher-value structured speaking tasks and should not disappear just because the user spoke a little during the day.

If the user later wants all speaking tasks reducible, that should be a separate setting.

### Extra Minutes

If speaking bonus exceeds reducible speaking tasks:

- record the extra minutes in plan credits;
- do not reduce other groups;
- do not punish the user;
- allow stats to show extra speaking effort if implemented.

## UI Changes

### Daily Setup

Add `Speaking Bonus (Mins)` to Workday Bonus inputs.

Keep the same meaning as existing bonus inputs:

> minutes already completed before Generate Plan.

The input should be visible near Momo / Dictation / Reading bonus fields.

### Daily Plan

Task cards should optionally expose:

- description;
- instruction;
- done criteria.

Recommendation for v2.4: show a compact "How to finish" row or expandable details under each task, not a large wall of text.

### History

Historical task display should remain compatible with old tasks.

If task metadata exists, History may display done criteria or skill later, but v2.4 does not require it.

### Stats

Stats should continue to work with old and new tasks.

If `speakingMinutes` appears in Workday Bonus, Stats should avoid double-counting:

- task actual minutes count from tasks;
- bonus minutes count through plan credits or a clear separate field only if intentionally displayed.

## Planning Impact

### Plan Engine

Update Workday Bonus normalization:

- include `speakingMinutes`;
- cap it with the same safety limit as other bonus fields;
- apply it only to tasks whose `creditGroup` is `speaking`.

### Focus Profiles

Replace speaking profile `mixed-review` entries with either:

- `light-dictation-review`; or
- `light-reading-review`;

Recommended split:

- Speaking low: `light-dictation-review`
- Speaking normal: `light-reading-review`
- Speaking high: keep normal structure plus optional speaking stretch.

This keeps speaking days from becoming only speaking work while still making the secondary review explicit.

### Optional Stretch

Optional stretch should remain no-penalty.

Speaking bonus may reduce optional speaking stretch only when the stretch task has `creditGroup: "speaking"`.

## Status Impact

No status rule change in v2.4.

Expected behavior:

- required tasks remain required;
- optional stretch remains optional;
- passive listening remains ignored;
- speaking bonus can reduce matching required speaking-shadowing tasks before the plan is generated;
- Green / Yellow / Red / Pending logic stays the same.

## Reward Impact

No reward formula change in v2.4.

Expected behavior:

- metadata can mark future reward eligibility;
- current reward calculation should keep using existing status/progress rules;
- optional stretch bonus behavior remains unchanged.

If `rewardEligible` is added, it should be treated as metadata first. Do not rewire reward scoring until a separate design approves it.

## Cloud Sync Impact

Daily records are synced as JSON through the existing manual sync path.

Adding optional metadata and `speakingMinutes` is compatible with the local-first model:

- old records load without the new field;
- new records sync through existing DailyRecord JSON;
- cloud table schema does not need to change;
- manual sync behavior stays unchanged.

If task definitions later become user-editable, that will require a separate cloud/data design.

## Data Health Impact

Data Health should be updated to:

- tolerate missing `speakingMinutes`;
- validate `speakingMinutes` as a non-negative finite number when present;
- tolerate old `mixed-review` records;
- optionally warn if a new record has an unknown `definitionId`.

## Tests

Minimum tests for v2.4:

### Registry Tests

- every active task has learning metadata;
- `light-dictation-review` and `light-reading-review` exist;
- `mixed-review` remains available as legacy compatibility.

### Plan Engine Tests

- speaking bonus reduces `speaking-shadowing`;
- speaking bonus does not reduce `speaking-conversation`;
- extra speaking bonus does not reduce dictation/reading/momo tasks;
- mixed-review no longer appears in newly generated speaking plans.

### UI Tests

- Daily setup renders Speaking Bonus input;
- generated plan displays task done criteria or compact guidance;
- old records still render.

### Health Tests

- `speakingMinutes` missing is valid;
- invalid `speakingMinutes` is reported;
- legacy `mixed-review` is valid.

### Regression

Run:

```bash
npm test
npm run typecheck
npm run build
npm run test:e2e
```

## Implementation Plan

Implement one task at a time.

### Task 1: Task Metadata Contracts

- Add optional metadata types.
- Add metadata to existing registry entries.
- Add tests proving active task metadata exists.
- No UI behavior change.

### Task 2: Split Mixed Review

- Add `light-dictation-review` and `light-reading-review`.
- Stop new focus profiles from generating `mixed-review`.
- Keep legacy compatibility.
- Add plan tests.

### Task 3: Speaking Bonus Data Path

- Extend `CreditGroup` and `WorkdayBonus`.
- Update plan engine credit normalization/application.
- Add tests for same-group-only speaking reduction.
- No broad UI polish.

### Task 4: Daily Setup UI

- Add Speaking Bonus input.
- Ensure mobile layout does not overflow.
- Add UI tests if existing test setup supports it.

### Task 5: Task Guidance Display

- Show compact task guidance on Daily plan cards.
- Avoid making task cards visually noisy.
- Preserve History compatibility.

### Task 6: Data Health and Release Wrap

- Add health validation for `speakingMinutes`.
- Update handoff/release notes if needed.
- Run full checks.

## Open Product Questions

These do not block v2.4, but should be revisited later:

1. Should speaking bonus eventually reduce AI conversation or retake when the user explicitly chooses that?
2. Should wrap-up remain required for Green status, or become reward-only / habit-only?
3. Should passive listening beyond 60 minutes earn reward points separately?
4. Should task instructions support markdown or stay plain text?
5. Should Task Library / Study Plan expose the registry to the user later?

## Acceptance Criteria

v2.4 is complete when:

- Daily setup includes Speaking Bonus.
- Generated speaking plans no longer contain ambiguous `mixed-review`.
- Every active task has a clear instruction and done criteria.
- Speaking bonus only reduces speaking-shadowing / speaking stretch, not other task groups.
- Old records remain readable.
- Status, rewards, cloud sync, and history are not broken.
- Full tests and build pass.

