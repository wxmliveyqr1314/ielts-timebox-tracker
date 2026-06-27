# Cloud Wallpaper UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the approved cloud wallpaper foundation to the application, add Settings controls, and present a readable content-only wallpaper across all pages.

**Architecture:** A single `useWallpaper` hook owns local-first initialization, authenticated cloud refresh, Object URL lifecycle, and explicit user actions. `App` passes resolved presentation state to `AppLayout` and action state to a focused `WallpaperSettings` component. Page surfaces opt into wallpaper-safe translucent styling without changing business logic.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Tailwind CSS 4, Supabase JS 2, Lucide React, Vitest 4, Testing Library, jsdom.

---

## Prerequisites

- `feature/v1.7-cloud-wallpaper-foundation` is merged into `main`.
- `supabase/migrations/20260627_cloud_wallpaper.sql` has been run in the correct Supabase project.
- The private `wallpapers` bucket and `user_preferences` RLS policies have been manually verified.

## File Map

- Create `src/hooks/useWallpaper.ts`: local-first and cloud-refresh state machine.
- Create `src/hooks/useWallpaper.test.tsx`: hook tests.
- Create `src/components/settings/WallpaperSettings.tsx`: wallpaper controls.
- Create `src/components/settings/WallpaperSettings.test.tsx`: control behavior tests.
- Modify `src/App.tsx`: instantiate and distribute wallpaper state.
- Modify `src/components/layout/AppLayout.tsx`: content-only background and overlay.
- Modify `src/index.css`: opt-in translucent surface utilities.
- Modify `src/pages/SettingsPage.tsx`: render the new focused component.
- Modify `src/pages/DailyPage.tsx`: add wallpaper-safe surface classes only.
- Modify `src/pages/HistoryPage.tsx`: add wallpaper-safe surface classes only.
- Modify `src/pages/StatsPage.tsx`: add wallpaper-safe surface classes only.
- Modify `package.json` and `package-lock.json`: add test DOM dependencies and bump visible version to `1.7.1`.
- Create `docs/WALLPAPER_MANUAL_TEST_CHECKLIST.md`: deployment and two-device acceptance.

### Task 1: Prepare the UI branch and test environment

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Start from merged main**

```powershell
git switch main
git pull origin main
git switch -c feature/v1.7.1-wallpaper-ui
```

- [ ] **Step 2: Verify the foundation and Supabase setup are present**

```powershell
Test-Path src/utils/wallpaperService.ts
Test-Path supabase/migrations/20260627_cloud_wallpaper.sql
npm test
```

Expected: both paths return `True`; all tests pass.

- [ ] **Step 3: Install React DOM test support**

Run: `npm install -D @testing-library/react jsdom`

- [ ] **Step 4: Add a jsdom directive to React test files**

Every `.test.tsx` created by this plan must begin with:

```ts
// @vitest-environment jsdom
```

- [ ] **Step 5: Commit test tooling**

```powershell
git add package.json package-lock.json
git commit -m "test: add wallpaper ui test support"
```

### Task 2: Build the local-first wallpaper hook with TDD

**Files:**
- Create: `src/hooks/useWallpaper.ts`
- Create: `src/hooks/useWallpaper.test.tsx`

- [ ] **Step 1: Write failing hook tests**

Use `renderHook`, `act`, and dependency injection to prove:

The hook file and test helper must share this dependency contract so no test touches real Supabase, IndexedDB, Canvas, or Object URL globals:

```ts
export interface WallpaperHookDeps {
  loadMeta(): WallpaperLocalMeta | null;
  saveMeta(meta: WallpaperLocalMeta): void;
  loadBlob(): Promise<Blob | null>;
  saveDownloaded(blob: Blob, preference: WallpaperPreference): Promise<void>;
  clearCache(): Promise<void>;
  fetchPreference(userId: string): Promise<WallpaperPreference | null>;
  download(path: string): Promise<Blob>;
  savePreference(preference: WallpaperPreference): Promise<void>;
  processImage(file: File): Promise<ProcessedWallpaper>;
  replace(input: {
    userId: string;
    image: ProcessedWallpaper;
    previous: WallpaperPreference | null;
    overlayOpacity: number;
  }): Promise<{ preference: WallpaperPreference; cleanupWarning: string | null }>;
  remove(current: WallpaperPreference): Promise<{
    preference: WallpaperPreference;
    cleanupWarning: string | null;
  }>;
  createObjectUrl(blob: Blob): string;
  revokeObjectUrl(url: string): void;
  now(): Date;
}
```

```ts
// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useWallpaper } from "./useWallpaper";

it("renders cached wallpaper before cloud refresh", async () => {
  const cached = new Blob(["cached"], { type: "image/webp" });
  const deps = makeDeps({ cachedBlob: cached, cloudPreference: null });
  const { result } = renderHook(() => useWallpaper({ userId: null, deps }));
  await waitFor(() => expect(result.current.ready).toBe(true));
  expect(result.current.active).toBe(true);
});

it("hides a previous account cache before loading another account", async () => {
  const deps = makeDeps({ cachedOwner: "user-a", cachedBlob: new Blob(["a"]) });
  const { result } = renderHook(() => useWallpaper({ userId: "user-b", deps }));
  await waitFor(() => expect(result.current.ready).toBe(true));
  expect(result.current.active).toBe(false);
});

```

Define `makeDeps` in the test with spies for every `WallpaperHookDeps` method; do not use real Supabase or IndexedDB in hook tests. Add three further tests with these exact assertions:

- cloud download rejection leaves `active === true`, keeps the cached Object URL, and sets a warning notice;
- replacing the active Blob calls `revokeObjectURL` with the previous URL, and unmount revokes the final URL;
- a deferred startup download resolved after `uploadAndApply` does not replace the uploaded wallpaper URL or preference.

- [ ] **Step 2: Verify failure**

Run: `npx vitest run src/hooks/useWallpaper.test.tsx`

Expected: FAIL because the hook does not exist.

- [ ] **Step 3: Implement the hook API**

Export these exact interfaces:

```ts
export interface WallpaperViewState {
  ready: boolean;
  active: boolean;
  imageUrl: string | null;
  overlayOpacity: number;
  preference: WallpaperPreference | null;
  busy: "upload" | "remove" | "preference" | null;
  notice: { type: "success" | "warning" | "error"; message: string } | null;
}

export interface UseWallpaperResult extends WallpaperViewState {
  uploadAndApply(file: File): Promise<void>;
  setEnabled(enabled: boolean): Promise<void>;
  setOverlayOpacity(value: number): Promise<void>;
  remove(): Promise<void>;
  clearNotice(): void;
}
```

The hook must:

- load valid local metadata and IndexedDB Blob first;
- create one Object URL at a time and revoke the previous URL;
- keep signed-out cache display;
- immediately hide cache owned by another signed-in user;
- fetch and download newer cloud state when signed in;
- ignore stale refresh promises with a monotonically increasing operation id;
- call `processWallpaperImage` and `replaceWallpaper` for upload;
- persist toggle and overlay changes through `saveWallpaperPreference` only when signed in;
- keep signed-out overlay changes local only;
- use `removeWallpaper` for confirmed removal;
- expose errors as notices without throwing through React event handlers.

- [ ] **Step 4: Run focused tests and commit**

```powershell
npx vitest run src/hooks/useWallpaper.test.tsx
npm test
git add src/hooks/useWallpaper.ts src/hooks/useWallpaper.test.tsx
git commit -m "feat: add local-first wallpaper hook"
```

### Task 3: Add the Settings wallpaper component with TDD

**Files:**
- Create: `src/components/settings/WallpaperSettings.tsx`
- Create: `src/components/settings/WallpaperSettings.test.tsx`

- [ ] **Step 1: Write failing interaction tests**

```ts
// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WallpaperSettings } from "./WallpaperSettings";

it("disables cloud upload while signed out", () => {
  render(<WallpaperSettings wallpaper={makeWallpaper()} signedIn={false} />);
  expect(screen.getByRole("button", { name: /upload & apply/i })).toBeDisabled();
});

it("uploads only after an image is selected", async () => {
  const uploadAndApply = vi.fn();
  render(<WallpaperSettings wallpaper={makeWallpaper({ uploadAndApply })} signedIn />);
  const file = new File(["image"], "wallpaper.png", { type: "image/png" });
  fireEvent.change(screen.getByLabelText(/choose wallpaper image/i), { target: { files: [file] } });
  fireEvent.click(screen.getByRole("button", { name: /upload & apply/i }));
  expect(uploadAndApply).toHaveBeenCalledWith(file);
});

```

Add a removal test that clicks `Remove wallpaper`, asserts that `remove` has not been called, then clicks the dialog's `Remove` button and asserts one call. Add a slider test that locates the range input by label, verifies `min="25"` and `max="70"`, changes it to `55`, advances fake timers by 400 ms, and expects `setOverlayOpacity(55)` once.

- [ ] **Step 2: Verify failure**

Run: `npx vitest run src/components/settings/WallpaperSettings.test.tsx`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the component**

Requirements:

- Use Lucide `Image`, `Upload`, `Eye`, and `Trash2` icons.
- Use a hidden file input with `accept="image/jpeg,image/png,image/webp"` and an accessible label.
- Show a stable 16:9 preview area with `backgroundImage` and `backgroundSize: "cover"`.
- `Upload & Apply` is disabled when signed out, no file is selected, or `busy` is non-null.
- Use a checkbox/switch for enabled state.
- Use `<input type="range" min={25} max={70} step={1}>` for overlay.
- Debounce cloud persistence of slider changes by 400 ms while applying the visual value immediately.
- Render notices with `role="status"`; errors use `role="alert"`.
- Keep the removal dialog opaque, viewport-fixed, keyboard reachable, and protected by Cancel/Remove buttons.
- Never call existing DailyRecord `Sync now` from this component.

- [ ] **Step 4: Run tests and commit**

```powershell
npx vitest run src/components/settings/WallpaperSettings.test.tsx
npm test
git add src/components/settings/WallpaperSettings.tsx src/components/settings/WallpaperSettings.test.tsx
git commit -m "feat: add wallpaper settings controls"
```

### Task 4: Integrate wallpaper state into App and AppLayout

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/layout/AppLayout.tsx`
- Modify: `src/pages/SettingsPage.tsx`

- [ ] **Step 1: Instantiate one hook in App**

Use the existing auth session without creating a second competing auth subscription. Move `useSupabaseAuth()` ownership to `App` if necessary, then pass the same auth result to `SettingsPage` and `useWallpaper`.

The resulting shape must be:

```tsx
const auth = useSupabaseAuth();
const wallpaper = useWallpaper({ userId: auth.session?.user.id ?? null });

<AppLayout currentTab={currentTab} onChangeTab={setCurrentTab} wallpaper={wallpaper}>
  {currentTab === "settings" && (
    <SettingsPage appData={appData} auth={auth} wallpaper={wallpaper} />
  )}
</AppLayout>
```

- [ ] **Step 2: Extend AppLayout props and render content-only layers**

Use this structure:

```tsx
<div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans max-w-md mx-auto relative overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.05)] border-x border-slate-200">
  <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center flex-shrink-0 z-20">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">T</div>
      <h1 className="text-xl font-semibold tracking-tight text-slate-800">
        TimeBox <span className="text-slate-400 font-normal">Tracker</span>
      </h1>
    </div>
  </header>
  <main className="relative flex-1 overflow-y-auto pb-24">
    {wallpaper.active && wallpaper.imageUrl && (
      <div className="fixed-wallpaper-layer absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${wallpaper.imageUrl})` }} />
        <div className="absolute inset-0 bg-slate-950" style={{ opacity: wallpaper.overlayOpacity / 100 }} />
      </div>
    )}
    <div
      className="relative z-10 p-5 min-h-full"
      data-wallpaper-active={wallpaper.active ? "true" : "false"}
    >
      {children}
    </div>
  </main>
  <BottomNav currentTab={currentTab} onChangeTab={onChangeTab} />
</div>
```

Do not place wallpaper behind the header, bottom nav, or fixed dialogs.

- [ ] **Step 3: Render WallpaperSettings in SettingsPage**

Add the focused component before Data Health:

```tsx
<section>
  <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 mt-8">Appearance</h2>
  <WallpaperSettings wallpaper={wallpaper} signedIn={Boolean(auth.session?.user.id)} />
</section>
```

Remove the internal `useSupabaseAuth()` call from SettingsPage after auth is passed from App. Keep every existing auth and sync behavior unchanged.

- [ ] **Step 4: Run type-check, tests, and commit**

```powershell
npm test
npx tsc --noEmit
git add src/App.tsx src/components/layout/AppLayout.tsx src/pages/SettingsPage.tsx
git commit -m "feat: integrate cloud wallpaper"
```

### Task 5: Add opt-in translucent surfaces

**Files:**
- Modify: `src/index.css`
- Modify: `src/pages/DailyPage.tsx`
- Modify: `src/pages/HistoryPage.tsx`
- Modify: `src/pages/StatsPage.tsx`
- Modify: `src/pages/SettingsPage.tsx`

- [ ] **Step 1: Add reusable wallpaper-safe classes**

```css
@layer utilities {
  [data-wallpaper-active="true"] .wallpaper-surface {
    background-color: rgb(8 16 34 / 0.66) !important;
    border-color: rgb(255 255 255 / 0.16) !important;
    color: rgb(248 250 252);
    backdrop-filter: blur(13px);
    box-shadow: 0 8px 20px rgb(0 0 0 / 0.16);
  }

  [data-wallpaper-active="true"] .wallpaper-surface-soft {
    background-color: rgb(15 23 42 / 0.58) !important;
    border-color: rgb(255 255 255 / 0.12) !important;
    color: rgb(241 245 249);
    backdrop-filter: blur(10px);
  }

  [data-wallpaper-active="true"] .wallpaper-heading {
    color: white !important;
    text-shadow: 0 2px 8px rgb(0 0 0 / 0.75);
  }
}
```

- [ ] **Step 2: Mark only content surfaces**

Add `wallpaper-surface` to page-level record, history-entry, stats-panel, Data Health, Cloud Sync, backup, and Wallpaper Settings containers. Add `wallpaper-surface-soft` to nested task rows and compact statistic rows.

Do not apply either class to:

- modals or destructive confirmations;
- form inputs;
- status-color badges;
- header or bottom navigation;
- the entire page root.

Add `wallpaper-heading` only to headings that otherwise sit directly over the image. Preserve all event handlers, value bindings, state calculations, and status color logic exactly.

- [ ] **Step 3: Check source for accidental giant panels**

Run:

```powershell
rg -n 'data-wallpaper-active|wallpaper-surface|wallpaper-heading' src/pages src/components
```

Expected: classes are present on localized surfaces; no page root has `wallpaper-surface`.

- [ ] **Step 4: Run regression gates and commit**

```powershell
npm test
npx tsc --noEmit
npm run build
git add src/index.css src/pages/DailyPage.tsx src/pages/HistoryPage.tsx src/pages/StatsPage.tsx src/pages/SettingsPage.tsx
git commit -m "style: add wallpaper-safe surfaces"
```

### Task 6: Add manual acceptance documentation and visible version

**Files:**
- Create: `docs/WALLPAPER_MANUAL_TEST_CHECKLIST.md`
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Write the checklist**

The document must contain checkboxes for:

```markdown
# Wallpaper Manual Test Checklist

## Upload and display
- [ ] JPEG, PNG, and WebP can be selected.
- [ ] Unsupported files are rejected before upload.
- [ ] Upload & Apply changes the content background only.
- [ ] Header, bottom navigation, inputs, and dialogs remain readable.
- [ ] Overlay works at 25%, 42%, and 70%.

## Cloud and offline
- [ ] Device B receives the wallpaper after signing into the same account.
- [ ] Offline reload uses the IndexedDB cache.
- [ ] Sign-out retains the last cached wallpaper and disables cloud actions.
- [ ] Signing into another account never shows the previous account cache.

## Replacement and removal
- [ ] Replacement keeps the old wallpaper when upload or preference save fails.
- [ ] Disable/re-enable does not delete the image.
- [ ] Remove requires confirmation and returns to the default background.
- [ ] Removed wallpaper does not return on another device after refresh.

## Regression
- [ ] Daily task editing and status calculation still work.
- [ ] History editing and deletion still work.
- [ ] Stats remain read-only and correct.
- [ ] DailyRecord Sync now remains manual and functional.
- [ ] JSON import/export and Data Health remain functional.
```

- [ ] **Step 2: Update the visible application version**

Set `package.json` version to `1.7.1`, then run:

```powershell
npm install --package-lock-only
```

- [ ] **Step 3: Commit documentation and version**

```powershell
git add docs/WALLPAPER_MANUAL_TEST_CHECKLIST.md package.json package-lock.json
git commit -m "chore: document wallpaper validation"
```

### Task 7: Browser QA and final verification

**Files:** All UI plan files

- [ ] **Step 1: Start the development server**

```powershell
npm run dev
```

Open the printed local URL. Use a different port if 3000 is occupied.

- [ ] **Step 2: Verify desktop and mobile viewports**

Capture and inspect at least:

- 390 x 844 mobile;
- 768 x 1024 tablet;
- 1440 x 900 desktop.

Verify no horizontal overflow, clipped controls, unreadable text, blank background, broken image, or fixed-dialog transparency. Test minimum and maximum overlay values with a bright detailed image.

- [ ] **Step 3: Run all automated and security gates**

```powershell
git diff --check main...HEAD
npm test
npx tsc --noEmit
npm run build
rg -n "service_role|SERVICE_ROLE|supabase_service|VITE_SUPABASE_ANON_KEY=.*ey" . --glob "!node_modules/**" --glob "!dist/**"
```

- [ ] **Step 4: Confirm scope and push**

```powershell
git status --short
git diff --stat main...HEAD
git log --oneline main..HEAD
git push -u origin feature/v1.7.1-wallpaper-ui
```

Expected: no DailyRecord, status, date, stats, or cloud-record merge logic changed. `DESIGN.md`, `read_projects.cjs`, and `.superpowers/` remain untracked.
