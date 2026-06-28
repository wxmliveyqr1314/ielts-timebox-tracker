# v1.9 Release Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add repeatable CI, isolated Playwright smoke coverage, conservative production chunking, and accurate release documentation without changing IELTS TimeBox Tracker business behavior.

**Architecture:** Keep Vitest as the main behavioral suite and add a small Chromium-only Playwright layer for browser integration. GitHub Actions runs the same unit, type, build, and browser gates available locally. Vite separates a few stable vendor groups while all application state, cloud synchronization, and wallpaper behavior remain unchanged.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Vitest 4, Playwright Test, GitHub Actions, npm.

---

## Guardrails

- Work from a fresh branch named `feature/v1.9-release-hardening` based on current `origin/main`.
- Do not modify status calculation, streak calculation, focus recommendation, cloud merge, tombstone, Supabase policy, or wallpaper ownership logic.
- Do not add production credentials to GitHub Actions.
- Do not commit `.env`, Playwright reports, traces, screenshots, `qa.cjs`, `DESIGN.md`, or `read_projects.cjs`.
- Do not claim visual or browser validation unless the Playwright assertions actually ran.
- Commit each task separately using the specified commit message.

## File Map

- Modify `package.json`: scripts, version, and Playwright development dependency.
- Modify `package-lock.json`: npm-generated dependency and version lock.
- Modify `.gitignore`: ignore Playwright outputs and temporary QA artifacts.
- Create `playwright.config.ts`: Chromium smoke-project configuration.
- Create `e2e/fixtures.ts`: deterministic DailyRecord and wallpaper browser fixtures.
- Create `e2e/app-smoke.spec.ts`: navigation, History, Stats, Settings, and console checks.
- Create `e2e/wallpaper-smoke.spec.ts`: IndexedDB wallpaper activation and mobile overflow checks.
- Create `.github/workflows/quality.yml`: pull-request and main-branch quality gates.
- Modify `vite.config.ts`: conservative vendor chunk groups.
- Create `docs/V1_9_RELEASE_CHECKLIST.md`: release verification record.
- Rewrite `docs/PROJECT_HANDOFF.md`: current UTF-8 project handoff for v1.9.

---

### Task 1: Prepare The Branch And Playwright Tooling

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.gitignore`
- Create: `playwright.config.ts`

- [ ] **Step 1: Start from current main**

Run:

```powershell
git switch main
git pull origin main
git switch -c feature/v1.9-release-hardening
git status --short
```

Expected: branch is `feature/v1.9-release-hardening`; only the known local untracked files may appear.

- [ ] **Step 2: Install Playwright Test as a development dependency**

Run:

```powershell
npm install -D @playwright/test
```

Expected: only `package.json` and `package-lock.json` change.

- [ ] **Step 3: Add stable package scripts**

Update the `scripts` object in `package.json` to include:

```json
{
  "dev": "vite --port=3000 --host=0.0.0.0",
  "build": "vite build",
  "preview": "vite preview",
  "clean": "rm -rf dist server.js",
  "lint": "tsc --noEmit",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:e2e": "playwright test",
  "check": "npm test && npm run typecheck && npm run build"
}
```

Keep `lint` as a compatibility alias. Do not introduce ESLint in v1.9.

- [ ] **Step 4: Create the Playwright configuration**

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [["line"], ["html", { open: "never" }]]
    : "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
```

The test command expects `dist` to exist. Both local instructions and CI must run `npm run build` before `npm run test:e2e`.

- [ ] **Step 5: Ignore browser artifacts and temporary QA files**

Append to `.gitignore`:

```gitignore
playwright-report/
test-results/
blob-report/
qa.cjs
*-mobile.png
*-tablet.png
*-desktop.png
```

- [ ] **Step 6: Verify configuration discovery**

Run:

```powershell
npx playwright test --list
```

Expected at this stage: zero tests listed, configuration loads without a TypeScript error.

- [ ] **Step 7: Commit tooling**

```powershell
git add package.json package-lock.json .gitignore playwright.config.ts
git commit -m "test: add Playwright smoke test tooling"
```

---

### Task 2: Add Deterministic Browser Fixtures

**Files:**
- Create: `e2e/fixtures.ts`

- [ ] **Step 1: Add typed application fixtures**

Create `e2e/fixtures.ts` with exports for `APP_STATE_KEY`, `WALLPAPER_META_KEY`, `TEST_APP_STATE`, `seedAppState`, and `seedWallpaper`.

Use the production keys:

```ts
import { Page } from "@playwright/test";
import { AppState, DailyRecord, DayStatus } from "../src/types";

export const APP_STATE_KEY = "ielts_timebox_state_v2";
export const WALLPAPER_META_KEY = "ielts_timebox_wallpaper_meta_v1";

function makeRecord(date: string, status: DayStatus): DailyRecord {
  const task = (
    id: string,
    category: DailyRecord["tasks"][number]["category"],
    minutes: number,
  ): DailyRecord["tasks"][number] => ({
    id: `${date}-${id}`,
    title: `${id} practice`,
    category,
    plannedMinutes: minutes,
    actualMinutes: minutes,
    completed: true,
    isCore: category !== "passive_listening",
    isEveningTask: category !== "passive_listening",
    notes: "E2E fixture",
  });

  return {
    date,
    weekday: "Friday",
    exercised: false,
    startTime: "19:00",
    energyLevel: "normal",
    dayType: "listening_focus",
    workdayBonus: { passiveListeningMinutes: 0 },
    tasks: [
      task("Momo", "momo", 20),
      task("Dictation", "dictation_new", 30),
      task("Reading", "reading_scan", 20),
      task("Speaking", "speaking_shadowing", 10),
      task("Passive listening", "passive_listening", 15),
    ],
    stoppedAfter2230: true,
    noCompensatoryStayingUp: true,
    bedtime: "22:20",
    tomorrowFirstStep: "Review one sentence",
    notes: "E2E fixture",
    status,
    createdAt: `${date}T00:00:00.000Z`,
    updatedAt: `${date}T12:00:00.000Z`,
  };
}

export const TEST_APP_STATE: AppState = {
  records: {
    "2026-06-27": makeRecord("2026-06-27", "green"),
    "2026-06-26": makeRecord("2026-06-26", "yellow"),
    "2026-06-25": makeRecord("2026-06-25", "red"),
    "2026-06-24": makeRecord("2026-06-24", "pending"),
  },
};

export async function seedAppState(page: Page): Promise<void> {
  await page.addInitScript(
    ({ key, state }) => localStorage.setItem(key, JSON.stringify(state)),
    { key: APP_STATE_KEY, state: TEST_APP_STATE },
  );
}
```

- [ ] **Step 2: Add an isolated IndexedDB wallpaper fixture**

Append this implementation to `e2e/fixtures.ts`:

```ts
export async function seedWallpaper(page: Page): Promise<void> {
  await page.evaluate(async ({ metaKey }) => {
    localStorage.setItem(metaKey, JSON.stringify({
      schemaVersion: 1,
      ownerUserId: null,
      cloudPath: null,
      enabled: true,
      overlayOpacity: 42,
      wallpaperUpdatedAt: "2026-06-28T00:00:00.000Z",
    }));

    const svg = [
      '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1800">',
      '<rect width="1200" height="1800" fill="#264653"/>',
      '<circle cx="900" cy="350" r="260" fill="#e9c46a"/>',
      '<rect y="1050" width="1200" height="750" fill="#2a9d8f"/>',
      '</svg>',
    ].join("");
    const blob = new Blob([svg], { type: "image/svg+xml" });

    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("ielts_timebox_wallpaper_v1", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("wallpaper");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction("wallpaper", "readwrite");
        transaction.objectStore("wallpaper").put(blob, "active");
        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
        transaction.onerror = () => reject(transaction.error);
      };
    });
  }, { metaKey: WALLPAPER_META_KEY });
}
```

- [ ] **Step 3: Type-check fixtures**

Run:

```powershell
npm run typecheck
```

Expected: exit code 0.

- [ ] **Step 4: Commit fixtures**

```powershell
git add e2e/fixtures.ts
git commit -m "test: add isolated browser fixtures"
```

---

### Task 3: Add Core Application Smoke Tests

**Files:**
- Create: `e2e/app-smoke.spec.ts`

- [ ] **Step 1: Write the smoke tests**

Create `e2e/app-smoke.spec.ts`:

```ts
import { expect, test } from "@playwright/test";
import { seedAppState } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await seedAppState(page);
});

test("navigates the four main pages without runtime errors", async ({ page }) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/");
  await expect(page.getByRole("button", { name: "Daily" })).toBeVisible();

  await page.getByRole("button", { name: "History" }).click();
  await expect(page.getByRole("heading", { name: "History" })).toBeVisible();

  await page.getByRole("button", { name: "Stats" }).click();
  await expect(page.getByRole("heading", { name: "Stats" })).toBeVisible();

  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.getByText("Local-First Backup")).toBeVisible();

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test("renders deterministic History and Stats data", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "History" }).click();

  await expect(page.getByText("4", { exact: true }).first()).toBeVisible();
  for (const status of ["GREEN", "YELLOW", "RED", "PENDING"]) {
    await expect(page.getByText(status, { exact: true }).first()).toBeVisible();
  }

  await page.getByRole("button", { name: /expand jun 27, 2026/i }).click();
  await expect(page.getByPlaceholder(/task notes/i).first()).toBeVisible();

  await page.getByRole("button", { name: "Stats" }).click();
  await expect(page.getByText("Status distribution")).toBeVisible();
  await expect(page.getByText("5h 20m")).toBeVisible();
  await expect(page.getByText("No stats yet")).toHaveCount(0);
  await expect(page.locator("main")).not.toContainText(/NaN|Infinity/);
});
```

- [ ] **Step 2: Build and run the new tests**

Run:

```powershell
npm run build
npx playwright install chromium
npm run test:e2e -- e2e/app-smoke.spec.ts
```

Expected: two tests pass. If an exact accessible name differs, inspect the rendered accessibility tree and use the actual semantic label; do not replace assertions with arbitrary timeouts.

- [ ] **Step 3: Commit smoke tests**

```powershell
git add e2e/app-smoke.spec.ts
git commit -m "test: add core application smoke tests"
```

---

### Task 4: Add Wallpaper And Mobile Overflow Smoke Test

**Files:**
- Create: `e2e/wallpaper-smoke.spec.ts`

- [ ] **Step 1: Write the wallpaper browser test**

Create `e2e/wallpaper-smoke.spec.ts`:

```ts
import { expect, test } from "@playwright/test";
import { seedAppState, seedWallpaper } from "./fixtures";

test("restores the local wallpaper without mobile horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAppState(page);
  await page.goto("/");
  await seedWallpaper(page);
  await page.reload();

  const content = page.locator('[data-wallpaper-active="true"]');
  await expect(content).toBeVisible();
  await expect(page.locator(".fixed-wallpaper-layer")).toBeVisible();

  await page.getByRole("button", { name: "History" }).click();
  await expect(page.getByRole("heading", { name: "History" })).toBeVisible();

  const overflow = await page.evaluate(() => ({
    body: document.body.scrollWidth - document.body.clientWidth,
    document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  expect(overflow.body).toBeLessThanOrEqual(0);
  expect(overflow.document).toBeLessThanOrEqual(0);
});
```

- [ ] **Step 2: Run the complete browser suite**

Run:

```powershell
npm run build
npm run test:e2e
```

Expected: all three smoke tests pass. A wallpaper test that merely sees normal page content is not sufficient; both the data attribute and wallpaper layer must be present.

- [ ] **Step 3: Commit wallpaper test**

```powershell
git add e2e/wallpaper-smoke.spec.ts
git commit -m "test: verify wallpaper and mobile overflow"
```

---

### Task 5: Add GitHub Actions Quality Gates

**Files:**
- Create: `.github/workflows/quality.yml`

- [ ] **Step 1: Create the workflow**

Create `.github/workflows/quality.yml`:

```yaml
name: Quality

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  quality:
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Use Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Unit tests
        run: npm test

      - name: Type check
        run: npm run typecheck

      - name: Production build
        run: npm run build

      - name: Install Chromium
        run: npx playwright install --with-deps chromium

      - name: Browser smoke tests
        run: npm run test:e2e

      - name: Upload Playwright report
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          if-no-files-found: ignore
          retention-days: 7
```

- [ ] **Step 2: Validate the workflow's local command sequence**

Run:

```powershell
npm ci
npm test
npm run typecheck
npm run build
npm run test:e2e
```

Expected: every command exits 0 without Supabase credentials.

- [ ] **Step 3: Commit CI**

```powershell
git add .github/workflows/quality.yml
git commit -m "ci: add pull request quality gates"
```

---

### Task 6: Split Stable Production Vendor Chunks

**Files:**
- Modify: `vite.config.ts`

- [ ] **Step 1: Capture the current build output**

Run:

```powershell
npm run build
```

Expected before the change: the current main JavaScript entry is approximately 560 kB and Vite reports a chunk-size warning.

- [ ] **Step 2: Add conservative manual chunks**

Add this `build` section to the returned Vite configuration in `vite.config.ts`:

```ts
build: {
  rollupOptions: {
    output: {
      manualChunks(id) {
        if (!id.includes("node_modules")) return undefined;
        if (id.includes("react") || id.includes("scheduler")) return "react-vendor";
        if (id.includes("@supabase")) return "supabase-vendor";
        if (
          id.includes("lucide-react") ||
          id.includes("date-fns") ||
          id.includes("motion")
        ) return "ui-vendor";
        return "vendor";
      },
    },
  },
},
```

Do not add a blanket `chunkSizeWarningLimit` increase to hide the warning.

- [ ] **Step 3: Verify build structure and runtime**

Run:

```powershell
npm run build
npm run test:e2e
```

Expected: build succeeds, no circular-chunk warning appears, no unexplained chunk exceeds 500 kB, and all browser smoke tests pass.

- [ ] **Step 4: Commit chunking**

```powershell
git add vite.config.ts
git commit -m "perf: split stable production vendor chunks"
```

---

### Task 7: Finalize Version And Release Documentation

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `docs/V1_9_RELEASE_CHECKLIST.md`
- Rewrite: `docs/PROJECT_HANDOFF.md`

- [ ] **Step 1: Bump package version**

Run:

```powershell
npm version 1.9.0 --no-git-tag-version
```

Expected: `package.json` and the root package entries in `package-lock.json` show `1.9.0`.

- [ ] **Step 2: Create the release checklist**

Create `docs/V1_9_RELEASE_CHECKLIST.md`:

```markdown
# v1.9 Release Checklist

- [ ] `git diff --check origin/main...HEAD` has no output.
- [ ] `npm ci` succeeds from the committed lockfile.
- [ ] `npm test` passes all unit tests.
- [ ] `npm run typecheck` exits with zero errors.
- [ ] `npm run build` succeeds without unexplained chunk warnings.
- [ ] `npm run test:e2e` passes the Chromium smoke suite.
- [ ] GitHub Actions Quality check is green on the pull request.
- [ ] Daily, History, Stats, and Settings open in the deployed build.
- [ ] Local wallpaper activation works at 390 px without horizontal overflow.
- [ ] Manual cloud sync still requires an explicit user action.
- [ ] Settings displays `v1.9.0` and the deployed commit hash.
- [ ] No `.env`, credentials, screenshots, traces, reports, or temporary QA scripts are committed.
```

Leave GitHub Actions and deployed-build items unchecked until they are genuinely verified.

- [ ] **Step 3: Rewrite the handoff document as current UTF-8 text**

Replace the mojibake content in `docs/PROJECT_HANDOFF.md` with a concise current handoff containing these factual sections:

```markdown
# IELTS TimeBox Tracker Project Handoff

## Current Release

- Version: v1.9.0
- Frontend: React 19, Vite 6, TypeScript 5.8, Tailwind CSS 4
- Storage: LocalStorage primary, IndexedDB wallpaper cache, manual Supabase synchronization
- Hosting: Vercel

## Product Areas

- Daily planning and Focus Mode recommendation
- History editing and safe deletion
- Stats and streak reporting
- Supabase authentication and manual cloud synchronization
- Local-first cloud wallpaper
- Data health and JSON backup tools

## Quality Commands

- `npm test`: Vitest unit and component tests
- `npm run typecheck`: TypeScript validation
- `npm run build`: production Vite build
- `npm run test:e2e`: Chromium browser smoke tests after a build
- `npm run check`: unit tests, type checking, and production build

## Continuous Integration

`.github/workflows/quality.yml` runs unit tests, type checking, production build, and Playwright smoke tests for pull requests and pushes to main. It uses no production Supabase credentials.

## Data Safety Boundaries

- LocalStorage remains the primary local data source.
- Cloud synchronization is manual only.
- Daily-record deletion uses tombstones.
- Wallpaper blobs are isolated in IndexedDB and cloud paths are user-owned.
- Never commit `.env` files, service-role keys, Playwright artifacts, or exported user data.

## Residual Risks

- Real email delivery, authentication rate limits, production RLS, and multi-device conflicts require manual verification.
- The browser smoke suite uses Chromium only.
- Supabase Free projects may pause after inactivity.

## Development Workflow

1. Create a feature branch from current main.
2. Implement with focused tests and commits.
3. Run `npm run check` and `npm run test:e2e`.
4. Push and open a pull request.
5. Require the GitHub Actions Quality check to pass.
6. Review the real diff and deploy through Vercel.
7. Verify the displayed version and commit hash.
```

- [ ] **Step 4: Run final local gates**

Run:

```powershell
git diff --check origin/main...HEAD
npm ci
npm test
npm run typecheck
npm run build
npm run test:e2e
git status --short
```

Expected: all commands pass; status shows only intended tracked changes plus any known local untracked files that must remain uncommitted.

- [ ] **Step 5: Scan for credentials and forbidden artifacts**

Run:

```powershell
rg -n "service_role|SERVICE_ROLE|supabase_service|VITE_SUPABASE_ANON_KEY=.*ey" . --glob "!node_modules/**" --glob "!dist/**"
git diff --name-only origin/main...HEAD
```

Expected: no real credential values; changed-file output contains no `.env`, screenshots, traces, reports, `qa.cjs`, `DESIGN.md`, or `read_projects.cjs`.

- [ ] **Step 6: Commit release metadata and documentation**

```powershell
git add package.json package-lock.json docs/V1_9_RELEASE_CHECKLIST.md docs/PROJECT_HANDOFF.md
git commit -m "chore: prepare v1.9 release documentation"
```

- [ ] **Step 7: Push for Codex review without creating or merging a PR**

Run:

```powershell
git push -u origin feature/v1.9-release-hardening
git log --oneline origin/main..HEAD
git diff --stat origin/main...HEAD
git status --short
```

Report the branch, commit hashes, changed files, exact test counts, build chunk output, Playwright test count, and any unchecked release items. Stop and wait for Codex review.

---

## Codex Review Gate

Before recommending a pull request, Codex must independently verify:

1. The branch contains no business-logic or storage-schema changes.
2. GitHub Actions has least-privilege permissions and no production secrets.
3. Browser fixtures are isolated and use exact production storage keys.
4. Browser assertions prove fixture data and wallpaper activation rather than relying on screenshots alone.
5. Playwright output and temporary QA files are ignored and uncommitted.
6. Vendor chunking does not hide warnings by raising the threshold.
7. `npm ci`, unit tests, type checking, build, and Playwright all pass.
8. The handoff and release checklist accurately describe the final implementation.
