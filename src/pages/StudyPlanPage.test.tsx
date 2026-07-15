// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TASK_REGISTRY } from "../planning/taskRegistry";
import { StudyPlanPage } from "./StudyPlanPage";

afterEach(cleanup);

describe("StudyPlanPage", () => {
  it("renders the study guide header and task summary", () => {
    render(<StudyPlanPage />);

    expect(screen.getByRole("heading", { name: "Study Plan" })).toBeTruthy();
    expect(screen.getByText("Task guide for the current IELTS routine")).toBeTruthy();
    expect(screen.getByText("Total tasks")).toBeTruthy();
    expect(screen.getByText(String(Object.keys(TASK_REGISTRY).length))).toBeTruthy();
    expect(screen.getByText("Focused tasks")).toBeTruthy();
    expect(screen.getByText("Reward tasks")).toBeTruthy();
  });

  it("renders task groups and core task guidance from the registry", () => {
    render(<StudyPlanPage />);

    for (const groupTitle of [
      "Vocabulary",
      "Listening",
      "Reading",
      "Speaking",
      "Review and Planning",
      "Sleep Protection",
    ]) {
      expect(screen.getByRole("heading", { name: groupTitle })).toBeTruthy();
    }

    expect(screen.getByText("Momo vocabulary")).toBeTruthy();
    expect(screen.getByText("Complete today's Momo vocabulary review. Focus on accuracy, not speed.")).toBeTruthy();
    expect(screen.getAllByText("How to do it").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Done when").length).toBeGreaterThan(0);
    expect(screen.getByText(/Break down 3-5 difficult sentences/i)).toBeTruthy();
  });

  it("renders task metadata badges without editing app data", () => {
    render(<StudyPlanPage />);

    expect(screen.getAllByText("Required").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Ignored").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Control").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Reward").length).toBeGreaterThan(0);
    expect(screen.getAllByText("No reward").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Support").length).toBeGreaterThan(0);
  });

  it("renders every current task title from the registry", () => {
    render(<StudyPlanPage />);

    for (const task of Object.values(TASK_REGISTRY)) {
      expect(screen.getByText(task.title)).toBeTruthy();
    }
  });
});
