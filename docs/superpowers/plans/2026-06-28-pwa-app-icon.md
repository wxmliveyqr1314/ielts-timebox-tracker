# v2.0 PWA And App Icon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make TimeBox Tracker installable with a polished TimeBox icon, standalone presentation, offline application-shell support, and explicit offline protection for cloud operations.

**Architecture:** `vite-plugin-pwa` generates the manifest and Workbox service worker while the existing LocalStorage and IndexedDB stores remain the only offline user-data sources. A shared online-status hook drives a compact offline notice and disables network-only actions. Icon PNGs are deterministically generated from a committed SVG master with Sharp.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, vite-plugin-pwa, Workbox, Sharp, Vitest, Playwright, GitHub Actions.

---

## Guardrails

- Create `feature/v2.0-pwa-app-icon` from current `origin/main`.
- Do not alter DailyRecord, AppState, status, streak, focus recommendation, sync merge, tombstones, or Supabase policies.
- Do not runtime-cache Supabase, authentication, Storage API, or cloud user-data requests.
- Do not add automatic synchronization, background sync, push notifications, or native wrappers.
- Do not clear LocalStorage or IndexedDB during service-worker installation or activation.
- Do not commit generated test reports, screenshots, `.env`, `DESIGN.md`, or `read_projects.cjs`.
- Use the exact TimeBox Frame geometry and colors from the approved design.
- Commit after each task with the specified message and stop after pushing for Codex review.

## File Map

- Modify `package.json` and `package-lock.json`: PWA/icon dependencies, scripts, and v2.0 version.
- Create `public/icon-source.svg`: canonical vector artwork.
- Create generated `public/favicon.svg`, PNG favicons, Apple icon, PWA icons, and maskable icon.
- Create `scripts/generate-pwa-icons.mjs`: deterministic raster generation.
- Create `scripts/verify-pwa-icons.mjs`: dimensions and file validation.
- Modify `vite.config.ts`: VitePWA manifest and safe Workbox settings.
- Modify `index.html`: correct title, description, theme, favicon, and Apple metadata.
- Create `src/hooks/useOnlineStatus.ts` and test: shared connectivity state.
- Modify `src/App.tsx` and `src/components/layout/AppLayout.tsx`: offline indicator.
- Modify `src/pages/SettingsPage.tsx`: offline guards for authentication and manual sync.
- Modify `src/components/settings/WallpaperSettings.tsx` and test: offline guards for cloud wallpaper mutations.
- Create `e2e/pwa-offline.spec.ts`: manifest, service worker, offline reload, data retention, and overflow coverage.
- Modify `.github/workflows/quality.yml`: icon verification and PWA browser coverage.
- Create `docs/V2_0_PWA_RELEASE_CHECKLIST.md` and update `docs/PROJECT_HANDOFF.md`.

---

### Task 1: Prepare The Branch And Icon Tooling

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `public/icon-source.svg`
- Create: `scripts/generate-pwa-icons.mjs`
- Create: `scripts/verify-pwa-icons.mjs`

- [ ] **Step 1: Create the implementation branch**

```powershell
git switch main
git pull origin main
git switch -c feature/v2.0-pwa-app-icon
git status --short
```

Expected: the new branch is active; known local untracked files remain uncommitted.

- [ ] **Step 2: Install build-only dependencies**

```powershell
npm install -D vite-plugin-pwa sharp
```

Expected: `package.json` and `package-lock.json` change; no production dependency is added.

- [ ] **Step 3: Add reproducible icon scripts**

Add these scripts to `package.json` without removing existing scripts:

```json
{
  "icons:generate": "node scripts/generate-pwa-icons.mjs",
  "icons:check": "node scripts/verify-pwa-icons.mjs"
}
```

- [ ] **Step 4: Create the approved vector master**

Create `public/icon-source.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" role="img" aria-labelledby="title">
  <title id="title">TimeBox</title>
  <defs>
    <linearGradient id="base" x1="120" y1="80" x2="900" y2="940" gradientUnits="userSpaceOnUse">
      <stop stop-color="#3829D9"/>
      <stop offset="1" stop-color="#695CFF"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" rx="224" fill="url(#base)"/>
  <rect x="132" y="132" width="760" height="760" rx="152" fill="none" stroke="#FFFFFF" stroke-opacity="0.28" stroke-width="32"/>
  <path d="M260 278H764V390H574V748H450V390H260V278Z" fill="#FFFFFF"/>
  <circle cx="790" cy="230" r="54" fill="#F4C95D"/>
</svg>
```

- [ ] **Step 5: Create the raster generation script**

Create `scripts/generate-pwa-icons.mjs`:

```js
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");
const source = path.join(publicDir, "icon-source.svg");

await mkdir(publicDir, { recursive: true });
await copyFile(source, path.join(publicDir, "favicon.svg"));

async function standard(size, name) {
  await sharp(source).resize(size, size).png().toFile(path.join(publicDir, name));
}

async function filled(size, name) {
  await sharp(source)
    .resize(size, size)
    .flatten({ background: "#4F46E5" })
    .png()
    .toFile(path.join(publicDir, name));
}

await Promise.all([
  standard(16, "favicon-16x16.png"),
  standard(32, "favicon-32x32.png"),
  filled(180, "apple-touch-icon.png"),
  standard(192, "pwa-192x192.png"),
  standard(512, "pwa-512x512.png"),
  filled(512, "maskable-512x512.png"),
]);
```

- [ ] **Step 6: Create strict icon verification**

Create `scripts/verify-pwa-icons.mjs`:

```js
import { access, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");
const expected = new Map([
  ["favicon-16x16.png", 16],
  ["favicon-32x32.png", 32],
  ["apple-touch-icon.png", 180],
  ["pwa-192x192.png", 192],
  ["pwa-512x512.png", 512],
  ["maskable-512x512.png", 512],
]);

await access(path.join(publicDir, "icon-source.svg"));
await access(path.join(publicDir, "favicon.svg"));

for (const [name, size] of expected) {
  const file = path.join(publicDir, name);
  const fileStat = await stat(file);
  if (fileStat.size === 0) throw new Error(`${name} is empty`);
  const metadata = await sharp(file).metadata();
  if (metadata.width !== size || metadata.height !== size) {
    throw new Error(`${name} must be ${size}x${size}`);
  }
}

console.log(`Verified ${expected.size} PNG icons.`);
```

- [ ] **Step 7: Generate and verify assets**

```powershell
npm run icons:generate
npm run icons:check
```

Expected: six PNGs plus two SVG files exist and the verifier reports six valid PNG icons.

- [ ] **Step 8: Visually inspect the master and two raster sizes**

Open `public/icon-source.svg`, `public/apple-touch-icon.png`, and `public/favicon-32x32.png`. Confirm the white T, inner frame, and amber dot remain legible and no artwork is clipped.

- [ ] **Step 9: Commit icon tooling and assets**

```powershell
git add package.json package-lock.json public scripts/generate-pwa-icons.mjs scripts/verify-pwa-icons.mjs
git commit -m "feat: add TimeBox app icon assets"
```

---

### Task 2: Add Manifest And Safe Service Worker

**Files:**
- Modify: `vite.config.ts`
- Modify: `index.html`

- [ ] **Step 1: Configure VitePWA**

Import `VitePWA` from `vite-plugin-pwa` and append this plugin after the existing React and Tailwind plugins:

```ts
VitePWA({
  registerType: "autoUpdate",
  injectRegister: "auto",
  includeAssets: [
    "favicon.svg",
    "favicon-16x16.png",
    "favicon-32x32.png",
    "apple-touch-icon.png",
  ],
  manifest: {
    name: "TimeBox Tracker",
    short_name: "TimeBox",
    description: "Local-first IELTS study planning, tracking, and progress review.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#F8FAFC",
    theme_color: "#4F46E5",
    icons: [
      { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
      { src: "/maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  },
  workbox: {
    cleanupOutdatedCaches: true,
    globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
    navigateFallback: "/index.html",
    runtimeCaching: [],
  },
  devOptions: { enabled: false },
})
```

Do not add Supabase URL patterns or a catch-all runtime cache.

- [ ] **Step 2: Correct the HTML identity metadata**

Replace the current generic title and add these entries inside `index.html` `<head>`:

```html
<meta name="theme-color" content="#4F46E5" />
<meta name="description" content="Local-first IELTS study planning, tracking, and progress review." />
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="icon" href="/favicon-32x32.png" sizes="32x32" type="image/png" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="TimeBox" />
<title>TimeBox Tracker</title>
```

- [ ] **Step 3: Build and inspect generated PWA output**

```powershell
npm run build
Get-ChildItem dist
Get-Content -Raw dist/manifest.webmanifest
rg -n "supabase|auth|rest/v1|storage/v1" dist/sw.js
```

Expected:

- `manifest.webmanifest`, `sw.js`, and Workbox assets exist;
- manifest values and icon paths match the design;
- the service worker contains no Supabase runtime-caching route.

- [ ] **Step 4: Verify existing browser tests**

```powershell
npm run test:e2e
```

Expected: all existing v1.9 browser tests pass.

- [ ] **Step 5: Commit PWA shell**

```powershell
git add vite.config.ts index.html
git commit -m "feat: add installable PWA shell"
```

---

### Task 3: Add Shared Online Status And Offline Notice

**Files:**
- Create: `src/hooks/useOnlineStatus.ts`
- Create: `src/hooks/useOnlineStatus.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/layout/AppLayout.tsx`

- [ ] **Step 1: Write failing hook tests**

Create `src/hooks/useOnlineStatus.test.tsx` using the jsdom environment. Test initial `navigator.onLine`, an `offline` event changing the value to false, an `online` event restoring true, and listener cleanup on unmount.

Use this core test shape:

```tsx
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
```

- [ ] **Step 2: Run the test and verify failure**

```powershell
npx vitest run src/hooks/useOnlineStatus.test.tsx
```

Expected: FAIL because `useOnlineStatus.ts` does not exist.

- [ ] **Step 3: Implement the hook**

Create `src/hooks/useOnlineStatus.ts`:

```ts
import { useEffect, useState } from "react";

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return online;
}
```

- [ ] **Step 4: Pass status through the application shell**

In `src/App.tsx`, call `const online = useOnlineStatus()` and pass `online` to `AppLayout` and `SettingsPage`.

Extend `AppLayout` with an `online: boolean` prop. Inside the scrollable foreground container, before `{children}`, render:

```tsx
{!online && (
  <div role="status" className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
    Offline. Local records remain available; cloud actions are paused.
  </div>
)}
```

- [ ] **Step 5: Run tests and type checking**

```powershell
npx vitest run src/hooks/useOnlineStatus.test.tsx
npm run typecheck
```

Expected: hook tests pass and TypeScript exits 0.

- [ ] **Step 6: Commit connectivity state**

```powershell
git add src/hooks/useOnlineStatus.ts src/hooks/useOnlineStatus.test.tsx src/App.tsx src/components/layout/AppLayout.tsx
git commit -m "feat: show shared offline status"
```

---

### Task 4: Guard Authentication And Manual Sync Offline

**Files:**
- Modify: `src/pages/SettingsPage.tsx`
- Create: `src/pages/SettingsPage.offline.test.tsx`

- [ ] **Step 1: Add a focused component test**

Create `src/pages/SettingsPage.offline.test.tsx` with mocked auth and wallpaper values. Render `SettingsPage` with `online={false}` and assert:

- the offline cloud explanation is visible;
- Send Magic Link is disabled after entering an email;
- Verify Code is disabled;
- Sync now is disabled when a signed-in session is supplied;
- no auth or sync function is called.

Use the production component props instead of mocking internal modules except for the supplied auth and wallpaper objects.

- [ ] **Step 2: Run the test and verify failure**

```powershell
npx vitest run src/pages/SettingsPage.offline.test.tsx
```

Expected: FAIL because `SettingsPage` does not accept `online` and controls are not guarded.

- [ ] **Step 3: Add the online prop and handler guards**

Add `online: boolean` to `SettingsPage` props.

At the top of `handleMagicLink`, `handleVerifyOtp`, and `handleSync`, return an explicit offline notice before any Supabase call:

```ts
if (!online) {
  setAuthNotice({ type: "error", message: "You are offline. Reconnect to use cloud account features." });
  return;
}
```

For `handleSync`, use `setSyncResult("You are offline. Local data is safe; reconnect before syncing.")` instead of `setAuthNotice`.

- [ ] **Step 4: Disable network-only controls**

Add `!online` to the disabled conditions for:

- Send Magic Link;
- Verify Code;
- Sync now.

Render this message inside the Cloud Sync area when offline:

```tsx
{!online && (
  <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 p-3 text-xs text-amber-300">
    Cloud account and sync actions are unavailable offline. Local data remains available.
  </div>
)}
```

Pass `online` to `WallpaperSettings`.

Do not trigger sync from an `online` event or effect.

- [ ] **Step 5: Run focused and existing tests**

```powershell
npx vitest run src/pages/SettingsPage.offline.test.tsx src/components/settings/WallpaperSettings.test.tsx
npm run typecheck
```

Expected: tests pass and no existing prop types break.

- [ ] **Step 6: Commit offline cloud guards**

```powershell
git add src/pages/SettingsPage.tsx src/pages/SettingsPage.offline.test.tsx
git commit -m "feat: guard cloud actions while offline"
```

---

### Task 5: Guard Cloud Wallpaper Mutations Offline

**Files:**
- Modify: `src/components/settings/WallpaperSettings.tsx`
- Modify: `src/components/settings/WallpaperSettings.test.tsx`

- [ ] **Step 1: Add failing offline assertions**

Extend `WallpaperSettings.test.tsx` with `online={false}`. Assert that the upload input, Upload & Apply, Enable wallpaper, overlay slider, and Remove wallpaper controls are disabled, and that this text appears:

```text
Wallpaper cloud controls are unavailable offline. Your cached wallpaper remains visible.
```

- [ ] **Step 2: Run the focused test and verify failure**

```powershell
npx vitest run src/components/settings/WallpaperSettings.test.tsx
```

Expected: FAIL because `online` is not yet supported.

- [ ] **Step 3: Implement the offline guards**

Add `online: boolean` to `WallpaperSettingsProps` and calculate:

```ts
const cloudControlsDisabled = isBusy || !signedIn || !online;
```

Use it for the file input, Upload & Apply, enable checkbox, overlay slider, Remove wallpaper, and final Remove confirmation. Also guard `handleUpload`, `handleOpacityChange`, and `handleRemove` so programmatic calls cannot reach wallpaper cloud operations while offline.

Render the exact explanatory text above when `!online`.

Do not clear `wallpaper.imageUrl`, disable the rendered background, or remove IndexedDB cache when connectivity changes.

- [ ] **Step 4: Update existing test renders**

Every existing `WallpaperSettings` test that models normal behavior must pass `online={true}` explicitly.

- [ ] **Step 5: Run tests**

```powershell
npx vitest run src/components/settings/WallpaperSettings.test.tsx
npm test
npm run typecheck
```

Expected: all tests pass.

- [ ] **Step 6: Commit wallpaper guards**

```powershell
git add src/components/settings/WallpaperSettings.tsx src/components/settings/WallpaperSettings.test.tsx
git commit -m "feat: protect wallpaper controls offline"
```

---

### Task 6: Add Manifest And Offline Browser Tests

**Files:**
- Create: `e2e/pwa-offline.spec.ts`

- [ ] **Step 1: Add manifest assertions**

Create `e2e/pwa-offline.spec.ts` and fetch the generated manifest from the preview server:

```ts
import { expect, test } from "@playwright/test";
import { seedAppState, seedWallpaper } from "./fixtures";

test("publishes the approved install manifest and icons", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest).toMatchObject({
    name: "TimeBox Tracker",
    short_name: "TimeBox",
    display: "standalone",
    start_url: "/",
    scope: "/",
    theme_color: "#4F46E5",
    background_color: "#F8FAFC",
  });
  expect(manifest.icons).toEqual(expect.arrayContaining([
    expect.objectContaining({ src: "/pwa-192x192.png", sizes: "192x192" }),
    expect.objectContaining({ src: "/pwa-512x512.png", sizes: "512x512" }),
    expect.objectContaining({ src: "/maskable-512x512.png", purpose: "maskable" }),
  ]));

  for (const icon of manifest.icons) {
    expect((await request.get(icon.src)).ok()).toBe(true);
  }
});
```

- [ ] **Step 2: Add true offline-reload coverage**

Append a browser test that:

1. sets a 390 by 844 viewport;
2. calls `seedAppState(page)` before the first navigation;
3. opens `/` online;
4. calls `seedWallpaper(page)` and reloads;
5. waits for `navigator.serviceWorker.ready`;
6. reloads once online so `navigator.serviceWorker.controller` is truthy;
7. calls `context.setOffline(true)`;
8. reloads and asserts the Offline status;
9. navigates to History and Stats and verifies fixture data;
10. navigates to Settings and verifies Magic Link, OTP, Sync now where present, and wallpaper mutations are disabled;
11. verifies the wallpaper layer and no horizontal overflow;
12. restores `context.setOffline(false)` in a `finally` block.

Use these critical assertions:

```ts
await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));
await expect(page.getByRole("status").filter({ hasText: "Offline" })).toBeVisible();
await expect(page.locator('[data-wallpaper-active="true"]')).toBeVisible();
await expect(page.getByText("No stats yet")).toHaveCount(0);
```

Do not replace service-worker readiness with a fixed sleep.

- [ ] **Step 3: Build and run PWA browser tests**

```powershell
npm run icons:check
npm run build
npx playwright test e2e/pwa-offline.spec.ts
```

Expected: manifest and offline tests pass against the production preview.

- [ ] **Step 4: Run all browser tests**

```powershell
npm run test:e2e
```

Expected: existing v1.9 smoke tests and new PWA tests all pass.

- [ ] **Step 5: Commit PWA browser coverage**

```powershell
git add e2e/pwa-offline.spec.ts
git commit -m "test: verify installable offline PWA"
```

---

### Task 7: Extend CI And Finalize v2.0 Release Metadata

**Files:**
- Modify: `.github/workflows/quality.yml`
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `docs/V2_0_PWA_RELEASE_CHECKLIST.md`
- Modify: `docs/PROJECT_HANDOFF.md`

- [ ] **Step 1: Verify icons in CI**

Add this step after `npm ci` in `.github/workflows/quality.yml`:

```yaml
      - name: Verify PWA icons
        run: npm run icons:check
```

The existing build and browser smoke steps will exercise manifest generation and offline tests. Do not provide Supabase credentials.

- [ ] **Step 2: Bump the application version**

```powershell
npm version 2.0.0 --no-git-tag-version
```

Expected: both package files report `2.0.0`.

- [ ] **Step 3: Create the PWA release checklist**

Create `docs/V2_0_PWA_RELEASE_CHECKLIST.md`:

```markdown
# v2.0 PWA Release Checklist

- [ ] `npm run icons:check` verifies all committed icon dimensions.
- [ ] `npm test` passes all unit and component tests.
- [ ] `npm run typecheck` exits with zero errors.
- [ ] `npm run build` emits `manifest.webmanifest` and `sw.js`.
- [ ] `npm run test:e2e` passes existing smoke and PWA offline tests.
- [ ] Built service worker has no Supabase runtime-caching route.
- [ ] GitHub Actions Quality check is green.
- [ ] Android or desktop Chromium offers installation.
- [ ] iPhone Safari Add to Home Screen displays the TimeBox icon and label.
- [ ] Installed app opens standalone without the normal browser address bar.
- [ ] Previously visited app reopens offline with local records and cached wallpaper.
- [ ] Offline cloud controls are disabled and reconnecting does not auto-sync.
- [ ] Settings displays `v2.0.0` and the deployed commit hash.
- [ ] No `.env`, credentials, reports, screenshots, or temporary QA scripts are committed.
```

Leave device, GitHub Actions, deployment, and version items unchecked until they are genuinely verified.

- [ ] **Step 4: Update the handoff document**

Update `docs/PROJECT_HANDOFF.md` to state:

- current release is v2.0.0;
- the app is an installable PWA, not a native APK/IPA;
- `vite-plugin-pwa` precaches only the application shell and static assets;
- Supabase traffic is not runtime-cached;
- offline local features and unavailable cloud features;
- icon generation and verification commands;
- PWA offline Playwright coverage;
- real-device installation remains a manual release check.

Do not remove the v1.9 CI, data-safety, or residual-risk sections.

- [ ] **Step 5: Run all quality gates**

```powershell
git diff --check origin/main...HEAD
npm ci
npm run icons:check
npm test
npm run typecheck
npm run build
npm run test:e2e
git status --short
```

Expected: every automated command passes; only intended tracked changes and known ignored local files remain.

- [ ] **Step 6: Inspect the built caching boundary**

```powershell
rg -n "supabase|auth/v1|rest/v1|storage/v1" dist/sw.js
git diff --name-only origin/main...HEAD
```

Expected: no Supabase runtime route appears in the service worker, and no forbidden artifact or secret file appears in the Git diff.

- [ ] **Step 7: Commit release integration**

```powershell
git add .github/workflows/quality.yml package.json package-lock.json docs/V2_0_PWA_RELEASE_CHECKLIST.md docs/PROJECT_HANDOFF.md
git commit -m "chore: prepare v2.0 PWA release"
```

- [ ] **Step 8: Push without creating or merging a PR**

```powershell
git push -u origin feature/v2.0-pwa-app-icon
git log --oneline origin/main..HEAD
git diff --stat origin/main...HEAD
git status --short
```

Report exact Vitest and Playwright counts, icon verification output, build PWA files, service-worker cache inspection, changed files, unchecked manual items, and branch commit hashes. Stop for Codex review.

---

## Codex Review Gate

Before recommending the v2.0 pull request, Codex must independently verify:

1. Icon source and PNG dimensions match the approved TimeBox Frame design.
2. Manifest name, short name, colors, display mode, scope, start URL, and icon purposes are correct.
3. The built service worker precaches static application files and has no Supabase runtime-caching route.
4. LocalStorage and IndexedDB logic is unchanged by service-worker lifecycle code.
5. Offline UI disables network-only actions without deleting local wallpaper or records.
6. Reconnection does not trigger automatic sync.
7. Playwright actually reloads under an offline browser context controlled by the service worker.
8. Existing unit and browser tests remain green.
9. GitHub Actions runs icon verification, build, and all browser tests without secrets.
10. The branch contains no native wrapper, push notification, background sync, or unrelated redesign.
