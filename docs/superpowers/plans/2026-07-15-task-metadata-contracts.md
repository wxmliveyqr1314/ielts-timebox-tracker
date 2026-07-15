# Task Metadata Contracts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add learning metadata fields to the centralized task registry so Daily task cards can later show clear task guidance.

**Architecture:** Extend existing type contracts in `src/types/index.ts` and `src/planning/taskRegistry.ts`. Keep all metadata registry-local and optional for compatibility with old records. Add registry tests before production code.

**Tech Stack:** React + Vite + TypeScript + Vitest.

## Global Constraints

- Do not change DailyRecord storage shape in this task.
- Do not change plan generation, status calculation, rewards, stats, or UI behavior in this task.
- Do not remove `mixed-review`; it remains a legacy-compatible task definition.
- Keep cloud sync behavior unchanged.
- Keep the implementation additive and backwards-compatible.

---

### Task 1: Add Task Metadata Contract

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/planning/taskRegistry.ts`
- Test: `src/planning/taskRegistry.test.ts`

**Interfaces:**
- Produces: `IeltsSkill` union type exported from `src/types/index.ts`.
- Produces: optional `skill`, `description`, `instruction`, `doneCriteria`, `formalStudy`, and `rewardEligible` fields on `TaskDefinition`.
- Produces: every active `TASK_REGISTRY` entry has non-empty `skill`, `description`, `instruction`, and `doneCriteria`.

- [x] **Step 1: Write failing registry metadata tests**

Add tests to `src/planning/taskRegistry.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { TASK_REGISTRY, getTaskDefinition } from "./taskRegistry";

describe("TASK_REGISTRY learning metadata", () => {
  it("defines learning guidance for every active task", () => {
    for (const definition of Object.values(TASK_REGISTRY)) {
      expect(definition.skill, definition.id).toBeTruthy();
      expect(definition.description, definition.id).toBeTruthy();
      expect(definition.instruction, definition.id).toBeTruthy();
      expect(definition.doneCriteria, definition.id).toBeTruthy();
      expect(typeof definition.formalStudy, definition.id).toBe("boolean");
      expect(typeof definition.rewardEligible, definition.id).toBe("boolean");
    }
  });

  it("keeps mixed-review available as a legacy-compatible task", () => {
    const definition = getTaskDefinition("mixed-review");

    expect(definition.title).toBe("Dictation or light reading review");
    expect(definition.description).toContain("light review");
    expect(definition.statusRole).toBe("required");
  });

  it("marks passive and control tasks as not reward eligible", () => {
    expect(getTaskDefinition("passive-listening").rewardEligible).toBe(false);
    expect(getTaskDefinition("sleep-stop-heavy").rewardEligible).toBe(false);
    expect(getTaskDefinition("sleep-no-compensation").rewardEligible).toBe(false);
  });

  it("marks wrap-up as planning work, not formal study", () => {
    const definition = getTaskDefinition("wrap-up");

    expect(definition.skill).toBe("planning");
    expect(definition.formalStudy).toBe(false);
    expect(definition.rewardEligible).toBe(false);
  });
});
```

- [x] **Step 2: Run the new test to verify RED**

Run:

```bash
npx vitest run src/planning/taskRegistry.test.ts
```

Expected:

- FAIL before implementation because `skill`, `description`, `instruction`, `doneCriteria`, `formalStudy`, and `rewardEligible` do not exist yet.

- [x] **Step 3: Add metadata types**

In `src/types/index.ts`, add:

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
```

- [x] **Step 4: Extend TaskDefinition**

In `src/planning/taskRegistry.ts`, import `IeltsSkill` and add optional fields:

```ts
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

- [x] **Step 5: Populate registry metadata**

Add short, user-facing metadata to every `TASK_REGISTRY` entry. Example for `momo`:

```ts
momo: defineTask({
  id: "momo",
  title: "Momo vocabulary",
  category: "momo",
  skill: "vocabulary",
  description:
    "Complete today's Momo vocabulary review. Focus on accuracy, not speed.",
  instruction:
    "Review the assigned vocabulary and mark difficult words for future repetition.",
  doneCriteria:
    "Complete the planned minutes or today's assigned Momo review unit.",
  creditGroup: "momo",
  capacityKind: "focused",
  statusRole: "required",
  minMinutes: 10,
  incrementMinutes: 5,
  formalStudy: true,
  rewardEligible: true,
}),
```

- [x] **Step 6: Run focused test to verify GREEN**

Run:

```bash
npx vitest run src/planning/taskRegistry.test.ts
```

Expected:

- PASS.

- [x] **Step 7: Run existing planning tests**

Run:

```bash
npx vitest run src/planning/focusProfiles.test.ts src/planning/planEngine.test.ts
```

Expected:

- PASS.

- [x] **Step 8: Run full quality checks**

Run:

```bash
npm test
npm run typecheck
npm run build
git diff --check
```

Expected:

- all pass;
- `git diff --check` has no output.

- [x] **Step 9: Commit**

Run:

```bash
git add docs/superpowers/plans/2026-07-15-task-metadata-contracts.md src/types/index.ts src/planning/taskRegistry.ts src/planning/taskRegistry.test.ts
git commit -m "feat: add task metadata contracts"
```
