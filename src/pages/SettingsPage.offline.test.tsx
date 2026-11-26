// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SettingsPage } from "./SettingsPage";
import { UseWallpaperResult } from "../hooks/useWallpaper";

afterEach(() => {
  cleanup();
});

const mockAppData = {
  data: {},
  importData: () => {},
  clearData: () => {},
  replaceData: () => {},
} as any;

const mockWallpaper = {
  active: false,
  enabled: false,
  imageUrl: null,
  overlayOpacity: 50,
  busy: false,
  ready: true,
  toggle: () => {},
  setOpacity: () => {},
  uploadAndApply: async () => false,
  clearCache: async () => false,
} as unknown as UseWallpaperResult;

describe("SettingsPage offline guards", () => {
  it("shows recovery guidance for session errors while signed out", () => {
    render(
      <SettingsPage
        appData={mockAppData}
        auth={{ session: null, configured: true, loading: false, error: "Failed to fetch" } as any}
        wallpaper={mockWallpaper}
        online={true}
      />,
    );
    expect(screen.getByText(/check whether its Supabase project is paused/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Send Magic Link" })).toBeTruthy();
  });

  it("explains rejected email delivery and lets the user try again", async () => {
    render(
      <SettingsPage
        appData={mockAppData}
        auth={{
          session: null,
          configured: true,
          loading: false,
          error: null,
          sendMagicLink: async () => ({ error: new TypeError("Failed to fetch") }),
        } as any}
        wallpaper={mockWallpaper}
        online={true}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText("Enter your email"), {
      target: { value: "learner@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send Magic Link" }));
    expect(await screen.findByText(/check whether its Supabase project is paused/i)).toBeTruthy();
    expect((screen.getByRole("button", { name: "Send Magic Link" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("disables auth and sync actions when offline", () => {
    // Unauthenticated state
    const authLoggedOut = {
      session: null,
      email: null,
      loading: false,
      configured: true,
      error: null,
      sendMagicLink: async () => ({ error: null }),
      verifyEmailOtp: async () => ({ error: null }),
      signOut: async () => {},
    } as any;

    const { rerender } = render(
      <SettingsPage
        appData={mockAppData}
        auth={authLoggedOut}
        wallpaper={mockWallpaper}
        online={false}
      />
    );

    expect(screen.getByText("Cloud account and sync actions are unavailable offline. Local data remains available.")).toBeDefined();

    const emailInput = screen.getByPlaceholderText("Enter your email");
    const sendBtn = screen.getByRole("button", { name: "Send Magic Link" }) as HTMLButtonElement;
    const otpInput = screen.getByPlaceholderText("6-digit code (if you didn't click the link)");
    const verifyBtn = screen.getByRole("button", { name: "Verify Code" }) as HTMLButtonElement;

    expect(sendBtn.disabled).toBe(true);
    expect(verifyBtn.disabled).toBe(true);

    // Authenticated state
    const authLoggedIn = {
      ...authLoggedOut,
      session: { user: { id: "test-user" } },
      email: "test@example.com",
    };

    rerender(
      <SettingsPage
        appData={mockAppData}
        auth={authLoggedIn}
        wallpaper={mockWallpaper}
        online={false}
      />
    );

    const syncBtn = screen.getByRole("button", { name: "Sync now" }) as HTMLButtonElement;
    expect(syncBtn.disabled).toBe(true);
  });
});
