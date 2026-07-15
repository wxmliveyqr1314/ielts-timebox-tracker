// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BottomNav } from "./BottomNav";

afterEach(cleanup);

describe("BottomNav", () => {
  it("renders Study as a primary navigation tab", () => {
    const onChangeTab = vi.fn();

    render(<BottomNav currentTab="daily" onChangeTab={onChangeTab} />);

    fireEvent.click(screen.getByRole("button", { name: /study/i }));

    expect(onChangeTab).toHaveBeenCalledWith("study");
  });
});
