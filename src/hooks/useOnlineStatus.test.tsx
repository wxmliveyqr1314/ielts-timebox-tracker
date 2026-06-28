// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useOnlineStatus } from "./useOnlineStatus";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("useOnlineStatus", () => {
  it("tracks offline and online browser events", () => {
    vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(true);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);
    act(() => window.dispatchEvent(new Event("offline")));
    expect(result.current).toBe(false);
    act(() => window.dispatchEvent(new Event("online")));
    expect(result.current).toBe(true);
  });
});
