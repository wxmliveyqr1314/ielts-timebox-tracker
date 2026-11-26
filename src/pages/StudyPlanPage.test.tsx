// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TASK_REGISTRY } from "../planning/taskRegistry";
import { StudyPlanPage } from "./StudyPlanPage";
import { formatTaskTitle } from "../i18n/taskCopy";

afterEach(cleanup);

describe("StudyPlanPage", () => {
  it("renders the study guide header and task summary", () => {
    render(<StudyPlanPage />);

    expect(screen.getByRole("heading", { name: "学习指南" })).toBeTruthy();
    expect(screen.getByText("了解每项雅思学习任务的做法与完成标准")).toBeTruthy();
    expect(screen.getByText("全部任务")).toBeTruthy();
    expect(screen.getByText(String(Object.keys(TASK_REGISTRY).length))).toBeTruthy();
    expect(screen.getByText("专注任务")).toBeTruthy();
    expect(screen.getByText("计分任务")).toBeTruthy();
  });

  it("renders task groups and core task guidance from the registry", () => {
    render(<StudyPlanPage />);

    for (const groupTitle of [
      "词汇",
      "听力",
      "阅读",
      "口语",
      "复习与计划",
      "睡眠保护",
    ]) {
      expect(screen.getByRole("heading", { name: groupTitle })).toBeTruthy();
    }

    expect(screen.getByText("Momo 词汇复习")).toBeTruthy();
    expect(screen.getByText("完成今天的 Momo 词汇复习，优先保证准确率。")).toBeTruthy();
    expect(screen.getAllByText("具体做法").length).toBeGreaterThan(0);
    expect(screen.getAllByText("完成标准").length).toBeGreaterThan(0);
    expect(screen.getByText(/拆解 3～5 个难句/i)).toBeTruthy();
  });

  it("renders task metadata badges without editing app data", () => {
    render(<StudyPlanPage />);

    expect(screen.getAllByText("必做").length).toBeGreaterThan(0);
    expect(screen.getAllByText("不影响状态").length).toBeGreaterThan(0);
    expect(screen.getAllByText("收尾检查").length).toBeGreaterThan(0);
    expect(screen.getAllByText("可计分").length).toBeGreaterThan(0);
    expect(screen.getAllByText("不计分").length).toBeGreaterThan(0);
    expect(screen.getAllByText("辅助任务").length).toBeGreaterThan(0);
  });

  it("renders every current task title from the registry", () => {
    render(<StudyPlanPage />);

    for (const task of Object.values(TASK_REGISTRY)) {
      expect(screen.getByText(formatTaskTitle(task))).toBeTruthy();
    }
  });
});
