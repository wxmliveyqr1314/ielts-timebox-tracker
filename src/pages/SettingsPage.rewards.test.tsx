// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SettingsPage } from "./SettingsPage";
import { AppState, RewardGoalDraft } from "../types";
import { UseWallpaperResult } from "../hooks/useWallpaper";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const mockAuth = {
  session: null,
  email: null,
  loading: false,
  configured: true,
  error: null,
  sendMagicLink: async () => ({ error: null }),
  verifyEmailOtp: async () => ({ error: null }),
  signOut: async () => {},
} as any;

const mockWallpaper = {
  active: false,
  enabled: false,
  imageUrl: null,
  overlayOpacity: 50,
  preference: null,
  busy: null,
  ready: true,
  notice: null,
  uploadAndApply: async () => false,
  setEnabled: () => {},
  setOverlayOpacity: () => {},
  remove: async () => {},
  clearNotice: () => {},
} as unknown as UseWallpaperResult;

function renderSettings(data: AppState, overrides: Partial<{
  saveRewardGoal: (draft: RewardGoalDraft) => void;
  clearRewardGoal: () => void;
}> = {}) {
  const appData = {
    data,
    importData: () => {},
    clearData: () => {},
    replaceData: () => {},
    saveRewardGoal: vi.fn(),
    clearRewardGoal: vi.fn(),
    ...overrides,
  };

  render(
    <SettingsPage
      appData={appData}
      auth={mockAuth}
      wallpaper={mockWallpaper}
      online={true}
    />
  );

  return appData;
}

describe("SettingsPage reward goal", () => {
  it("saves a reward goal from the settings form", () => {
    const saveRewardGoal = vi.fn();
    renderSettings({ records: {} }, { saveRewardGoal });

    fireEvent.change(screen.getByLabelText("Reward title"), {
      target: { value: "Hotpot dinner" },
    });
    fireEvent.change(screen.getByLabelText("Target points"), {
      target: { value: "20" },
    });
    fireEvent.change(screen.getByLabelText("Reward note"), {
      target: { value: "After a focused streak" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Reward Goal" }));

    expect(saveRewardGoal).toHaveBeenCalledWith({
      title: "Hotpot dinner",
      targetPoints: 20,
      note: "After a focused streak",
    });
  });

  it("pre-fills and clears an existing active reward goal", () => {
    const clearRewardGoal = vi.fn();

    renderSettings(
      {
        records: {},
        rewards: {
          schemaVersion: 1,
          activeGoal: {
            id: "goal-1",
            title: "New headphones",
            targetPoints: 35,
            note: "For stable study weeks",
            createdAt: "2026-07-10T08:00:00.000Z",
          },
        },
      },
      { clearRewardGoal },
    );

    expect(screen.getByDisplayValue("New headphones")).toBeDefined();
    expect(screen.getByDisplayValue("35")).toBeDefined();
    expect(screen.getByDisplayValue("For stable study weeks")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Clear Reward Goal" }));

    expect(clearRewardGoal).toHaveBeenCalledTimes(1);
  });
});
