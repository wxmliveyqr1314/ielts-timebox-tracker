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
    const btn = screen.getByRole("button", { name: /上传并应用/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("uploads only after an image is selected", async () => {
    const uploadAndApply = vi.fn();
    render(<WallpaperSettings wallpaper={makeWallpaper({ uploadAndApply })} signedIn online={true} />);
    const file = new File(["image"], "wallpaper.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText(/选择壁纸图片/i), { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: /上传并应用/i }));
    expect(uploadAndApply).toHaveBeenCalledWith(file);
  });

  it("clicks Remove wallpaper, asserts remove not called, clicks Remove dialog button and asserts one call", () => {
    const remove = vi.fn();
    render(<WallpaperSettings wallpaper={makeWallpaper({ active: true, imageUrl: "blob", remove })} signedIn online={true} />);
    fireEvent.click(screen.getByRole("button", { name: /移除壁纸/i }));
    expect(remove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /^移除$/ }));
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it("verifies slider min/max, changes it, and debounces setOverlayOpacity", () => {
    vi.useFakeTimers();
    const setOverlayOpacity = vi.fn();
    render(<WallpaperSettings wallpaper={makeWallpaper({ active: true, imageUrl: "blob", setOverlayOpacity })} signedIn online={true} />);
    const slider = screen.getByLabelText(/遮罩深度/i) as HTMLInputElement;
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
    const input = screen.getByLabelText(/选择壁纸图片/i) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    // Ensure preview is shown
    expect(screen.getByRole("button", { name: /上传并应用/i })).toBeDefined();

    const btn = screen.getByRole("button", { name: /上传并应用/i });
    await act(async () => {
      fireEvent.click(btn);
    });

    expect(uploadAndApply).toHaveBeenCalledWith(file);
    // Button should still be enabled because selectedFile was not cleared
    expect((screen.getByRole("button", { name: /上传并应用/i }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("clears file and preview on upload success", async () => {
    const uploadAndApply = vi.fn().mockResolvedValue(true);
    render(<WallpaperSettings wallpaper={makeWallpaper({ uploadAndApply })} signedIn online={true} />);
    const file = new File(["image"], "wallpaper.png", { type: "image/png" });
    const input = screen.getByLabelText(/选择壁纸图片/i) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByRole("button", { name: /上传并应用/i })).toBeDefined();

    const btn = screen.getByRole("button", { name: /上传并应用/i });
    await act(async () => {
      fireEvent.click(btn);
    });

    expect(uploadAndApply).toHaveBeenCalledWith(file);
    // Button should be disabled because selectedFile is cleared
    await waitFor(() => expect((screen.getByRole("button", { name: /上传并应用/i }) as HTMLButtonElement).disabled).toBe(true));
  });

  it("disables all controls and shows offline notice when online=false", () => {
    render(
      <WallpaperSettings
        wallpaper={makeWallpaper({ active: true, imageUrl: "blob" })}
        signedIn={true}
        online={false}
      />
    );

    expect(screen.getByText("离线时无法修改云壁纸，已缓存的壁纸仍可显示。")).toBeDefined();

    const fileInput = screen.getByLabelText(/选择壁纸图片/i) as HTMLInputElement;
    const uploadBtn = screen.getByRole("button", { name: /上传并应用/i }) as HTMLButtonElement;
    const enableCheckbox = screen.getByLabelText(/启用壁纸/i) as HTMLInputElement;
    const slider = screen.getByLabelText(/遮罩深度/i) as HTMLInputElement;
    const removeBtn = screen.getByRole("button", { name: /移除壁纸/i }) as HTMLButtonElement;

    expect(fileInput.disabled).toBe(true);
    expect(uploadBtn.disabled).toBe(true);
    expect(enableCheckbox.disabled).toBe(true);
    expect(slider.disabled).toBe(true);
    expect(removeBtn.disabled).toBe(true);
  });
});
