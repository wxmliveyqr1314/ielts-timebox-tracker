// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, act, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WallpaperSettings } from "./WallpaperSettings";
import { UseWallpaperResult } from "../../hooks/useWallpaper";

const makeWallpaper = (overrides: Partial<UseWallpaperResult> = {}): UseWallpaperResult => ({
  ready: true,
  active: false,
  imageUrl: null,
  overlayOpacity: 50,
  preference: null,
  busy: null,
  notice: null,
  uploadAndApply: vi.fn(),
  setEnabled: vi.fn(),
  setOverlayOpacity: vi.fn(),
  remove: vi.fn(),
  clearNotice: vi.fn(),
  ...overrides,
});

describe("WallpaperSettings", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("disables cloud upload while signed out", () => {
    render(<WallpaperSettings wallpaper={makeWallpaper()} signedIn={false} online={true} />);
    const btn = screen.getByRole("button", { name: /upload & apply/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("uploads only after an image is selected", async () => {
    const uploadAndApply = vi.fn();
    render(<WallpaperSettings wallpaper={makeWallpaper({ uploadAndApply })} signedIn online={true} />);
    const file = new File(["image"], "wallpaper.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText(/choose wallpaper image/i), { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: /upload & apply/i }));
    expect(uploadAndApply).toHaveBeenCalledWith(file);
  });

  it("clicks Remove wallpaper, asserts remove not called, clicks Remove dialog button and asserts one call", () => {
    const remove = vi.fn();
    render(<WallpaperSettings wallpaper={makeWallpaper({ active: true, imageUrl: "blob", remove })} signedIn online={true} />);
    fireEvent.click(screen.getByRole("button", { name: /remove wallpaper/i }));
    expect(remove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /^Remove$/i }));
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it("verifies slider min/max, changes it, and debounces setOverlayOpacity", () => {
    vi.useFakeTimers();
    const setOverlayOpacity = vi.fn();
    render(<WallpaperSettings wallpaper={makeWallpaper({ active: true, imageUrl: "blob", setOverlayOpacity })} signedIn online={true} />);
    const slider = screen.getByLabelText(/Overlay opacity/i) as HTMLInputElement;
    expect(slider.getAttribute("min")).toBe("25");
    expect(slider.getAttribute("max")).toBe("70");
    fireEvent.change(slider, { target: { value: "55" } });
    expect(setOverlayOpacity).not.toHaveBeenCalled();
    vi.advanceTimersByTime(400);
    expect(setOverlayOpacity).toHaveBeenCalledWith(55);
    vi.useRealTimers();
  });

  it("retains selected file on upload failure", async () => {
    const uploadAndApply = vi.fn().mockResolvedValue(false);
    render(<WallpaperSettings wallpaper={makeWallpaper({ uploadAndApply })} signedIn online={true} />);
    const file = new File(["image"], "wallpaper.png", { type: "image/png" });
    const input = screen.getByLabelText(/choose wallpaper image/i) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    // Ensure preview is shown
    expect(screen.getByRole("button", { name: /upload & apply/i })).toBeDefined();

    const btn = screen.getByRole("button", { name: /upload & apply/i });
    await act(async () => {
      fireEvent.click(btn);
    });

    expect(uploadAndApply).toHaveBeenCalledWith(file);
    // Button should still be enabled because selectedFile was not cleared
    expect((screen.getByRole("button", { name: /upload & apply/i }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("clears file and preview on upload success", async () => {
    const uploadAndApply = vi.fn().mockResolvedValue(true);
    render(<WallpaperSettings wallpaper={makeWallpaper({ uploadAndApply })} signedIn online={true} />);
    const file = new File(["image"], "wallpaper.png", { type: "image/png" });
    const input = screen.getByLabelText(/choose wallpaper image/i) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByRole("button", { name: /upload & apply/i })).toBeDefined();

    const btn = screen.getByRole("button", { name: /upload & apply/i });
    await act(async () => {
      fireEvent.click(btn);
    });

    expect(uploadAndApply).toHaveBeenCalledWith(file);
    // Button should be disabled because selectedFile is cleared
    await waitFor(() => expect((screen.getByRole("button", { name: /upload & apply/i }) as HTMLButtonElement).disabled).toBe(true));
  });

  it("disables all controls and shows offline notice when online=false", () => {
    render(
      <WallpaperSettings
        wallpaper={makeWallpaper({ active: true, imageUrl: "blob" })}
        signedIn={true}
        online={false}
      />
    );
    
    expect(screen.getByText("Wallpaper cloud controls are unavailable offline. Your cached wallpaper remains visible.")).toBeDefined();
    
    const fileInput = screen.getByLabelText(/choose wallpaper image/i) as HTMLInputElement;
    const uploadBtn = screen.getByRole("button", { name: /upload & apply/i }) as HTMLButtonElement;
    const enableCheckbox = screen.getByLabelText(/enable wallpaper/i) as HTMLInputElement;
    const slider = screen.getByLabelText(/Overlay opacity/i) as HTMLInputElement;
    const removeBtn = screen.getByRole("button", { name: /remove wallpaper/i }) as HTMLButtonElement;
    
    expect(fileInput.disabled).toBe(true);
    expect(uploadBtn.disabled).toBe(true);
    expect(enableCheckbox.disabled).toBe(true);
    expect(slider.disabled).toBe(true);
    expect(removeBtn.disabled).toBe(true);
  });
});
