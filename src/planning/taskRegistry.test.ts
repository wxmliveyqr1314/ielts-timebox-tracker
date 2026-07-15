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

  it("defines separate light review tasks for dictation and reading", () => {
    const dictation = getTaskDefinition("light-dictation-review");
    const reading = getTaskDefinition("light-reading-review");

    expect(dictation).toMatchObject({
      title: "Light dictation review",
      skill: "listening",
      creditGroup: "dictation",
      statusRole: "required",
    });
    expect(dictation.description).toContain("dictation mistakes");

    expect(reading).toMatchObject({
      title: "Light reading review",
      skill: "reading",
      creditGroup: "reading",
      statusRole: "required",
    });
    expect(reading.description).toContain("reading notes");
  });

  it("marks passive and control tasks as not reward eligible", () => {
    expect(getTaskDefinition("passive-listening").rewardEligible).toBe(false);
    expect(getTaskDefinition("sleep-stop-heavy").rewardEligible).toBe(false);
    expect(getTaskDefinition("sleep-no-compensation").rewardEligible).toBe(
      false,
    );
  });

  it("marks wrap-up as planning work, not formal study", () => {
    const definition = getTaskDefinition("wrap-up");

    expect(definition.skill).toBe("planning");
    expect(definition.formalStudy).toBe(false);
    expect(definition.rewardEligible).toBe(false);
  });
});
