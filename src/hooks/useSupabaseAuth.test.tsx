// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSupabaseAuth } from "./useSupabaseAuth";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithOtp: vi.fn(),
  verifyOtp: vi.fn(),
  signOut: vi.fn(),
  unsubscribe: vi.fn(),
}));

vi.mock("../utils/supabaseClient", () => ({
  isSupabaseConfigured: true,
  supabase: { auth: mocks },
}));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
  mocks.onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: mocks.unsubscribe } },
  });
});

afterEach(cleanup);

describe("useSupabaseAuth failures", () => {
  it("leaves the login form available when initial session retrieval rejects", async () => {
    mocks.getSession.mockRejectedValue(new TypeError("Failed to fetch"));
    const { result } = renderHook(() => useSupabaseAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Failed to fetch");
    expect(result.current.session).toBeNull();
  });

  it("releases sending state after a rejected request and supports a retry", async () => {
    const { result } = renderHook(() => useSupabaseAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));
    mocks.signInWithOtp.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await act(async () => {
      const response = await result.current.sendMagicLink("  learner@example.com  ");
      expect(response.error?.message).toBe("Failed to fetch");
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe("Failed to fetch");

    mocks.signInWithOtp.mockResolvedValueOnce({ error: null });
    await act(async () => {
      expect((await result.current.sendMagicLink("  learner@example.com  ")).error).toBeNull();
    });
    expect(mocks.signInWithOtp).toHaveBeenLastCalledWith({
      email: "learner@example.com",
      options: { emailRedirectTo: window.location.origin },
    });
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("recovers loading state when verification or sign-out rejects", async () => {
    const { result, unmount } = renderHook(() => useSupabaseAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));
    mocks.verifyOtp.mockRejectedValue(new Error("Verification unavailable"));
    await act(async () => {
      const response = await result.current.verifyEmailOtp("learner@example.com", "123456");
      expect(response.error?.message).toBe("Verification unavailable");
    });
    expect(result.current.loading).toBe(false);

    mocks.signOut.mockRejectedValue(new Error("Sign out unavailable"));
    await act(async () => { await result.current.signOut(); });
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe("Sign out unavailable");
    unmount();
    expect(mocks.unsubscribe).toHaveBeenCalledOnce();
  });
});
