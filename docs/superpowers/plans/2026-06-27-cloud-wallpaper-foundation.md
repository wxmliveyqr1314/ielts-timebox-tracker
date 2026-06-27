# Cloud Wallpaper Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and test the private Supabase Storage, preference repository, image processing, and IndexedDB cache required for a cloud-synced wallpaper without changing the visible application.

**Architecture:** Binary image data is processed in the browser, stored in a private `wallpapers` bucket, and cached locally in IndexedDB. Cloud preference metadata lives in `user_preferences`; lightweight local metadata uses its own localStorage key. All modules remain independent of `AppState` and DailyRecord sync.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Vitest 4, Supabase JS 2, IndexedDB, Canvas APIs, fake-indexeddb.

---

## File Map

- Create `supabase/migrations/20260627_cloud_wallpaper.sql`: bucket, table, constraints, and RLS policies.
- Create `src/types/wallpaper.ts`: wallpaper-only domain types.
- Create `src/utils/wallpaperMetadata.ts`: local metadata validation, defaults, and opacity clamping.
- Create `src/utils/wallpaperMetadata.test.ts`: metadata unit tests.
- Create `src/utils/wallpaperImage.ts`: validation, bounded resize, and WebP encoding.
- Create `src/utils/wallpaperImage.test.ts`: pure validation and geometry tests.
- Create `src/utils/wallpaperCache.ts`: IndexedDB Blob cache and localStorage metadata adapter.
- Create `src/utils/wallpaperCache.test.ts`: cache tests with fake-indexeddb.
- Create `src/utils/wallpaperCloud.ts`: Supabase preference and Storage adapter.
- Create `src/utils/wallpaperCloud.test.ts`: mocked Supabase tests.
- Create `src/utils/wallpaperService.ts`: safe upload/replace/remove orchestration.
- Create `src/utils/wallpaperService.test.ts`: rollback and cleanup tests.
- Modify `package.json` and `package-lock.json`: add `fake-indexeddb` as a dev dependency.

### Task 1: Prepare the foundation branch

**Files:** None

- [ ] **Step 1: Start from the latest merged main**

```powershell
git switch main
git pull origin main
git switch -c feature/v1.7-cloud-wallpaper-foundation
git status --short --branch
```

Expected: branch is `feature/v1.7-cloud-wallpaper-foundation`; `DESIGN.md`, `read_projects.cjs`, and `.superpowers/` may remain untracked and must not be staged.

- [ ] **Step 2: Record the baseline**

```powershell
npm test
npx tsc --noEmit
npm run build
```

Expected: all existing tests pass, TypeScript exits 0, and Vite builds successfully.

### Task 2: Add Supabase schema and RLS migration

**Files:**
- Create: `supabase/migrations/20260627_cloud_wallpaper.sql`

- [ ] **Step 1: Create the migration with the complete schema**

```sql
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  wallpaper_path text,
  wallpaper_enabled boolean not null default false,
  overlay_opacity smallint not null default 42 check (overlay_opacity between 25 and 70),
  wallpaper_updated_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

drop policy if exists "user_preferences_select_own" on public.user_preferences;
drop policy if exists "user_preferences_insert_own" on public.user_preferences;
drop policy if exists "user_preferences_update_own" on public.user_preferences;

create policy "user_preferences_select_own"
on public.user_preferences for select to authenticated
using ((select auth.uid()) = user_id);

create policy "user_preferences_insert_own"
on public.user_preferences for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "user_preferences_update_own"
on public.user_preferences for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'wallpapers',
  'wallpapers',
  false,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "wallpapers_select_own" on storage.objects;
drop policy if exists "wallpapers_insert_own" on storage.objects;
drop policy if exists "wallpapers_update_own" on storage.objects;
drop policy if exists "wallpapers_delete_own" on storage.objects;

create policy "wallpapers_select_own"
on storage.objects for select to authenticated
using (
  bucket_id = 'wallpapers'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "wallpapers_insert_own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'wallpapers'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "wallpapers_update_own"
on storage.objects for update to authenticated
using (
  bucket_id = 'wallpapers'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'wallpapers'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "wallpapers_delete_own"
on storage.objects for delete to authenticated
using (
  bucket_id = 'wallpapers'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
```

- [ ] **Step 2: Review the migration for unsafe access**

Run:

```powershell
rg -n "service_role|public = true|with check \(true\)|using \(true\)" supabase/migrations/20260627_cloud_wallpaper.sql
```

Expected: no matches.

- [ ] **Step 3: Commit the migration**

```powershell
git add supabase/migrations/20260627_cloud_wallpaper.sql
git commit -m "chore: add cloud wallpaper schema"
```

### Task 3: Define wallpaper types and metadata rules with TDD

**Files:**
- Create: `src/types/wallpaper.ts`
- Create: `src/utils/wallpaperMetadata.ts`
- Create: `src/utils/wallpaperMetadata.test.ts`

- [ ] **Step 1: Write failing metadata tests**

```ts
import { describe, expect, it } from "vitest";
import { clampOverlayOpacity, parseWallpaperLocalMeta } from "./wallpaperMetadata";

describe("wallpaper metadata", () => {
  it("clamps overlay opacity to the approved range", () => {
    expect(clampOverlayOpacity(10)).toBe(25);
    expect(clampOverlayOpacity(42)).toBe(42);
    expect(clampOverlayOpacity(90)).toBe(70);
  });

  it("accepts valid versioned local metadata", () => {
    expect(parseWallpaperLocalMeta({
      schemaVersion: 1,
      ownerUserId: "user-1",
      cloudPath: "user-1/123.webp",
      enabled: true,
      overlayOpacity: 48,
      wallpaperUpdatedAt: "2026-06-27T08:00:00.000Z",
    })).toEqual({
      schemaVersion: 1,
      ownerUserId: "user-1",
      cloudPath: "user-1/123.webp",
      enabled: true,
      overlayOpacity: 48,
      wallpaperUpdatedAt: "2026-06-27T08:00:00.000Z",
    });
  });

  it("returns null for malformed metadata", () => {
    expect(parseWallpaperLocalMeta({ schemaVersion: 1, enabled: "yes" })).toBeNull();
    expect(parseWallpaperLocalMeta(null)).toBeNull();
  });
});
```

- [ ] **Step 2: Verify the tests fail**

Run: `npx vitest run src/utils/wallpaperMetadata.test.ts`

Expected: FAIL because `wallpaperMetadata.ts` does not exist.

- [ ] **Step 3: Implement domain types and metadata parsing**

```ts
// src/types/wallpaper.ts
export interface WallpaperPreference {
  userId: string;
  wallpaperPath: string | null;
  wallpaperEnabled: boolean;
  overlayOpacity: number;
  wallpaperUpdatedAt: string | null;
  updatedAt: string;
}

export interface WallpaperLocalMeta {
  schemaVersion: 1;
  ownerUserId: string | null;
  cloudPath: string | null;
  enabled: boolean;
  overlayOpacity: number;
  wallpaperUpdatedAt: string | null;
}

export interface ProcessedWallpaper {
  blob: Blob;
  width: number;
  height: number;
}
```

```ts
// src/utils/wallpaperMetadata.ts
import { WallpaperLocalMeta } from "../types/wallpaper";

export const WALLPAPER_META_KEY = "ielts_timebox_wallpaper_meta_v1";
export const DEFAULT_OVERLAY_OPACITY = 42;

export function clampOverlayOpacity(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_OVERLAY_OPACITY;
  return Math.min(70, Math.max(25, Math.round(value)));
}

export function parseWallpaperLocalMeta(value: unknown): WallpaperLocalMeta | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (v.schemaVersion !== 1 || typeof v.enabled !== "boolean") return null;
  if (typeof v.overlayOpacity !== "number") return null;
  if (v.ownerUserId !== null && typeof v.ownerUserId !== "string") return null;
  if (v.cloudPath !== null && typeof v.cloudPath !== "string") return null;
  if (v.wallpaperUpdatedAt !== null && typeof v.wallpaperUpdatedAt !== "string") return null;
  return {
    schemaVersion: 1,
    ownerUserId: v.ownerUserId as string | null,
    cloudPath: v.cloudPath as string | null,
    enabled: v.enabled,
    overlayOpacity: clampOverlayOpacity(v.overlayOpacity),
    wallpaperUpdatedAt: v.wallpaperUpdatedAt as string | null,
  };
}
```

- [ ] **Step 4: Run tests and commit**

```powershell
npx vitest run src/utils/wallpaperMetadata.test.ts
git add src/types/wallpaper.ts src/utils/wallpaperMetadata.ts src/utils/wallpaperMetadata.test.ts
git commit -m "feat: add wallpaper metadata model"
```

Expected: tests PASS.

### Task 4: Add bounded image processing with TDD

**Files:**
- Create: `src/utils/wallpaperImage.ts`
- Create: `src/utils/wallpaperImage.test.ts`

- [ ] **Step 1: Write failing pure tests**

```ts
import { describe, expect, it } from "vitest";
import { calculateWallpaperSize, validateWallpaperFile } from "./wallpaperImage";

describe("wallpaper image rules", () => {
  it("preserves aspect ratio inside 2560 pixels", () => {
    expect(calculateWallpaperSize(4000, 2000)).toEqual({ width: 2560, height: 1280 });
    expect(calculateWallpaperSize(1200, 1800)).toEqual({ width: 1200, height: 1800 });
  });

  it("rejects unsupported and oversized source files", () => {
    expect(validateWallpaperFile({ type: "image/gif", size: 1000 })).toContain("JPEG, PNG, or WebP");
    expect(validateWallpaperFile({ type: "image/jpeg", size: 16 * 1024 * 1024 })).toContain("15 MB");
    expect(validateWallpaperFile({ type: "image/png", size: 1000 })).toBeNull();
  });
});
```

- [ ] **Step 2: Verify the tests fail**

Run: `npx vitest run src/utils/wallpaperImage.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement validation, geometry, and processing**

Implement these exact exports:

```ts
import { ProcessedWallpaper } from "../types/wallpaper";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 3 * 1024 * 1024;
const MAX_EDGE = 2560;
const MAX_PIXELS = 40_000_000;

export function validateWallpaperFile(file: Pick<File, "type" | "size">): string | null {
  if (!ALLOWED_TYPES.has(file.type)) return "Choose a JPEG, PNG, or WebP image.";
  if (file.size > MAX_SOURCE_BYTES) return "The source image must be 15 MB or smaller.";
  return null;
}

export function calculateWallpaperSize(width: number, height: number) {
  if (width <= 0 || height <= 0 || width * height > MAX_PIXELS) {
    throw new Error("The image dimensions are not supported.");
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("Could not encode the wallpaper.")),
      "image/webp",
      quality,
    );
  });
}

export async function processWallpaperImage(file: File): Promise<ProcessedWallpaper> {
  const validationError = validateWallpaperFile(file);
  if (validationError) throw new Error(validationError);
  const bitmap = await createImageBitmap(file);
  try {
    let { width, height } = calculateWallpaperSize(bitmap.width, bitmap.height);
    for (const quality of [0.82, 0.74, 0.66]) {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas is unavailable in this browser.");
      context.drawImage(bitmap, 0, 0, width, height);
      const blob = await canvasToBlob(canvas, quality);
      if (blob.size <= MAX_OUTPUT_BYTES) return { blob, width, height };
      width = Math.max(1, Math.round(width * 0.85));
      height = Math.max(1, Math.round(height * 0.85));
    }
    throw new Error("The processed wallpaper is still larger than 3 MB.");
  } finally {
    bitmap.close();
  }
}
```

- [ ] **Step 4: Run focused and full tests, then commit**

```powershell
npx vitest run src/utils/wallpaperImage.test.ts
npm test
git add src/utils/wallpaperImage.ts src/utils/wallpaperImage.test.ts
git commit -m "feat: add wallpaper image processing"
```

Expected: all tests PASS.

### Task 5: Add IndexedDB and metadata cache with TDD

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/utils/wallpaperCache.ts`
- Create: `src/utils/wallpaperCache.test.ts`

- [ ] **Step 1: Install the test-only IndexedDB implementation**

Run: `npm install -D fake-indexeddb`

Expected: only `package.json` and `package-lock.json` dependency metadata changes.

- [ ] **Step 2: Write failing cache tests**

```ts
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearWallpaperCache, loadWallpaperBlob, saveWallpaperBlob } from "./wallpaperCache";

describe("wallpaper cache", () => {
  const values = new Map<string, string>();
  beforeEach(async () => {
    values.clear();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    });
    await clearWallpaperCache();
  });

  it("stores and retrieves one wallpaper blob", async () => {
    const blob = new Blob(["image"], { type: "image/webp" });
    await saveWallpaperBlob(blob);
    expect(await loadWallpaperBlob()).toEqual(blob);
  });

  it("clears cached binary data", async () => {
    await saveWallpaperBlob(new Blob(["image"], { type: "image/webp" }));
    await clearWallpaperCache();
    expect(await loadWallpaperBlob()).toBeNull();
  });
});
```

- [ ] **Step 3: Verify failure**

Run: `npx vitest run src/utils/wallpaperCache.test.ts`

Expected: FAIL because the cache module does not exist.

- [ ] **Step 4: Implement a single-record IndexedDB cache**

```ts
import { WallpaperLocalMeta } from "../types/wallpaper";
import { parseWallpaperLocalMeta, WALLPAPER_META_KEY } from "./wallpaperMetadata";

const DB_NAME = "ielts_timebox_wallpaper_v1";
const STORE_NAME = "wallpaper";
const ACTIVE_KEY = "active";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open wallpaper cache."));
  });
}

async function runRequest<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) {
  const db = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = action(db.transaction(STORE_NAME, mode).objectStore(STORE_NAME));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Wallpaper cache request failed."));
    });
  } finally {
    db.close();
  }
}

export const saveWallpaperBlob = (blob: Blob) => runRequest("readwrite", store => store.put(blob, ACTIVE_KEY));
export async function loadWallpaperBlob(): Promise<Blob | null> {
  return (await runRequest<Blob | undefined>("readonly", store => store.get(ACTIVE_KEY))) ?? null;
}
export async function clearWallpaperCache(): Promise<void> {
  await runRequest("readwrite", store => store.delete(ACTIVE_KEY));
  localStorage.removeItem(WALLPAPER_META_KEY);
}
export function loadWallpaperMeta(): WallpaperLocalMeta | null {
  try { return parseWallpaperLocalMeta(JSON.parse(localStorage.getItem(WALLPAPER_META_KEY) ?? "null")); }
  catch { return null; }
}
export function saveWallpaperMeta(meta: WallpaperLocalMeta): void {
  localStorage.setItem(WALLPAPER_META_KEY, JSON.stringify(meta));
}
```

- [ ] **Step 5: Run tests and commit**

```powershell
npx vitest run src/utils/wallpaperCache.test.ts
npm test
git add package.json package-lock.json src/utils/wallpaperCache.ts src/utils/wallpaperCache.test.ts
git commit -m "feat: add offline wallpaper cache"
```

### Task 6: Add the Supabase wallpaper adapter with TDD

**Files:**
- Create: `src/utils/wallpaperCloud.ts`
- Create: `src/utils/wallpaperCloud.test.ts`

- [ ] **Step 1: Write mocked adapter tests**

Cover these exact behaviors with Vitest mocks:

```ts
import { describe, expect, it, vi } from "vitest";
import { buildWallpaperPath, mapPreferenceRow } from "./wallpaperCloud";

describe("wallpaper cloud adapter", () => {
  it("builds an owned versioned WebP path", () => {
    expect(buildWallpaperPath("user-1", 123)).toBe("user-1/123.webp");
  });

  it("maps snake-case preference rows", () => {
    expect(mapPreferenceRow({
      user_id: "user-1",
      wallpaper_path: "user-1/123.webp",
      wallpaper_enabled: true,
      overlay_opacity: 42,
      wallpaper_updated_at: "2026-06-27T08:00:00.000Z",
      updated_at: "2026-06-27T08:00:00.000Z",
    })).toMatchObject({ userId: "user-1", wallpaperPath: "user-1/123.webp", wallpaperEnabled: true });
  });
});
```

- [ ] **Step 2: Verify failure**

Run: `npx vitest run src/utils/wallpaperCloud.test.ts`

Expected: FAIL because the adapter does not exist.

- [ ] **Step 3: Implement the adapter exports**

Implement:

```ts
import { SupabaseClient } from "@supabase/supabase-js";
import { WallpaperPreference } from "../types/wallpaper";
import { clampOverlayOpacity } from "./wallpaperMetadata";

const BUCKET = "wallpapers";

export const buildWallpaperPath = (userId: string, timestamp = Date.now()) => `${userId}/${timestamp}.webp`;

export function mapPreferenceRow(row: Record<string, unknown>): WallpaperPreference {
  return {
    userId: String(row.user_id),
    wallpaperPath: typeof row.wallpaper_path === "string" ? row.wallpaper_path : null,
    wallpaperEnabled: row.wallpaper_enabled === true,
    overlayOpacity: clampOverlayOpacity(Number(row.overlay_opacity)),
    wallpaperUpdatedAt: typeof row.wallpaper_updated_at === "string" ? row.wallpaper_updated_at : null,
    updatedAt: String(row.updated_at),
  };
}

export async function fetchWallpaperPreference(client: SupabaseClient, userId: string) {
  const { data, error } = await client.from("user_preferences").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data ? mapPreferenceRow(data) : null;
}

export async function saveWallpaperPreference(client: SupabaseClient, preference: WallpaperPreference) {
  const row = {
    user_id: preference.userId,
    wallpaper_path: preference.wallpaperPath,
    wallpaper_enabled: preference.wallpaperEnabled,
    overlay_opacity: clampOverlayOpacity(preference.overlayOpacity),
    wallpaper_updated_at: preference.wallpaperUpdatedAt,
    updated_at: preference.updatedAt,
  };
  const { error } = await client.from("user_preferences").upsert(row, { onConflict: "user_id" });
  if (error) throw error;
}

export async function uploadWallpaperBlob(client: SupabaseClient, path: string, blob: Blob) {
  const { error } = await client.storage.from(BUCKET).upload(path, blob, { contentType: "image/webp", upsert: false });
  if (error) throw error;
}

export async function downloadWallpaperBlob(client: SupabaseClient, path: string) {
  const { data, error } = await client.storage.from(BUCKET).download(path);
  if (error) throw error;
  return data;
}

export async function removeWallpaperBlob(client: SupabaseClient, path: string) {
  const { error } = await client.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}
```

- [ ] **Step 4: Extend tests with chained mocks**

Add tests proving:

- `fetchWallpaperPreference` returns `null` for no row;
- upload uses bucket `wallpapers`, `image/webp`, and `upsert: false`;
- download returns the Blob;
- remove passes exactly one owned path;
- every Supabase error is thrown rather than swallowed.

- [ ] **Step 5: Run tests and commit**

```powershell
npx vitest run src/utils/wallpaperCloud.test.ts
npm test
git add src/utils/wallpaperCloud.ts src/utils/wallpaperCloud.test.ts
git commit -m "feat: add wallpaper cloud adapter"
```

### Task 7: Add safe replace and remove orchestration with TDD

**Files:**
- Create: `src/utils/wallpaperService.ts`
- Create: `src/utils/wallpaperService.test.ts`

- [ ] **Step 1: Write failing service tests**

Create a `makeDeps` helper whose methods are `vi.fn()` implementations of every `WallpaperServiceDeps` member. Use an `order: string[]` array in each test and make each mock push its operation name. Add these exact assertions:

```ts
const image = { blob: new Blob(["new"], { type: "image/webp" }), width: 1200, height: 800 };
const previous = {
  userId: "user-1",
  wallpaperPath: "user-1/old.webp",
  wallpaperEnabled: true,
  overlayOpacity: 42,
  wallpaperUpdatedAt: "2026-06-26T00:00:00.000Z",
  updatedAt: "2026-06-26T00:00:00.000Z",
};

it("uploads, saves preference, caches, then removes the old object", async () => {
  const order: string[] = [];
  const deps = makeDeps({
    upload: vi.fn(async () => { order.push("upload"); }),
    savePreference: vi.fn(async () => { order.push("preference"); }),
    saveCache: vi.fn(async () => { order.push("cache"); }),
    remove: vi.fn(async () => { order.push("remove"); }),
  });
  const result = await replaceWallpaper({ userId: "user-1", image, previous, overlayOpacity: 42, deps });
  expect(order).toEqual(["upload", "preference", "cache", "remove"]);
  expect(result.preference.wallpaperPath).toBe("user-1/1782547200000.webp");
  expect(result.cleanupWarning).toBeNull();
});

it("keeps the old wallpaper when upload fails", async () => {
  const deps = makeDeps({ upload: vi.fn().mockRejectedValue(new Error("offline")) });
  await expect(replaceWallpaper({ userId: "user-1", image, previous, overlayOpacity: 42, deps })).rejects.toThrow("offline");
  expect(deps.savePreference).not.toHaveBeenCalled();
  expect(deps.saveCache).not.toHaveBeenCalled();
  expect(deps.remove).not.toHaveBeenCalled();
});

it("removes the new object when preference save fails", async () => {
  const deps = makeDeps({ savePreference: vi.fn().mockRejectedValue(new Error("db failed")) });
  await expect(replaceWallpaper({ userId: "user-1", image, previous, overlayOpacity: 42, deps })).rejects.toThrow("db failed");
  expect(deps.remove).toHaveBeenCalledWith("user-1/1782547200000.webp");
  expect(deps.saveCache).not.toHaveBeenCalled();
});

it("reports but does not roll back when old-object cleanup fails", async () => {
  const deps = makeDeps({ remove: vi.fn().mockRejectedValue(new Error("cleanup failed")) });
  const result = await replaceWallpaper({ userId: "user-1", image, previous, overlayOpacity: 42, deps });
  expect(result.preference.wallpaperPath).toBe("user-1/1782547200000.webp");
  expect(result.cleanupWarning).toContain("previous file");
});

it("clears preference and local cache before removing the cloud object", async () => {
  const order: string[] = [];
  const deps = makeDeps({
    savePreference: vi.fn(async () => { order.push("preference"); }),
    clearCache: vi.fn(async () => { order.push("cache"); }),
    remove: vi.fn(async () => { order.push("remove"); }),
  });
  const result = await removeWallpaper({ current: previous, deps });
  expect(order).toEqual(["preference", "cache", "remove"]);
  expect(result.preference).toMatchObject({ wallpaperPath: null, wallpaperEnabled: false });
});
```

Configure the helper's deterministic clock as `new Date("2026-06-27T08:00:00.000Z")`. Its `pathFor` mock must return `user-1/1782547200000.webp` for the test user and timestamp so the expected path is stable.

- [ ] **Step 2: Verify failure**

Run: `npx vitest run src/utils/wallpaperService.test.ts`

Expected: FAIL because the service does not exist.

- [ ] **Step 3: Implement dependency-injected service functions**

```ts
import { ProcessedWallpaper, WallpaperPreference } from "../types/wallpaper";

export interface WallpaperServiceDeps {
  upload(path: string, blob: Blob): Promise<void>;
  savePreference(preference: WallpaperPreference): Promise<void>;
  remove(path: string): Promise<void>;
  saveCache(blob: Blob, preference: WallpaperPreference): Promise<void>;
  clearCache(): Promise<void>;
  now(): Date;
  pathFor(userId: string, timestamp: number): string;
}

export async function replaceWallpaper(args: {
  userId: string;
  image: ProcessedWallpaper;
  previous: WallpaperPreference | null;
  overlayOpacity: number;
  deps: WallpaperServiceDeps;
}) {
  const now = args.deps.now();
  const path = args.deps.pathFor(args.userId, now.getTime());
  await args.deps.upload(path, args.image.blob);
  const preference: WallpaperPreference = {
    userId: args.userId,
    wallpaperPath: path,
    wallpaperEnabled: true,
    overlayOpacity: args.overlayOpacity,
    wallpaperUpdatedAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  try {
    await args.deps.savePreference(preference);
  } catch (error) {
    await args.deps.remove(path).catch(() => undefined);
    throw error;
  }
  await args.deps.saveCache(args.image.blob, preference);
  let cleanupWarning: string | null = null;
  if (args.previous?.wallpaperPath && args.previous.wallpaperPath !== path) {
    try { await args.deps.remove(args.previous.wallpaperPath); }
    catch { cleanupWarning = "The new wallpaper is active, but the previous file could not be removed."; }
  }
  return { preference, cleanupWarning };
}

export async function removeWallpaper(args: {
  current: WallpaperPreference;
  deps: WallpaperServiceDeps;
}) {
  const now = args.deps.now().toISOString();
  const cleared = { ...args.current, wallpaperPath: null, wallpaperEnabled: false, wallpaperUpdatedAt: null, updatedAt: now };
  await args.deps.savePreference(cleared);
  await args.deps.clearCache();
  let cleanupWarning: string | null = null;
  if (args.current.wallpaperPath) {
    try { await args.deps.remove(args.current.wallpaperPath); }
    catch { cleanupWarning = "Wallpaper was disabled, but the cloud file could not be removed."; }
  }
  return { preference: cleared, cleanupWarning };
}
```

- [ ] **Step 4: Run tests and commit**

```powershell
npx vitest run src/utils/wallpaperService.test.ts
npm test
git add src/utils/wallpaperService.ts src/utils/wallpaperService.test.ts
git commit -m "feat: add safe wallpaper operations"
```

### Task 8: Verify and publish the foundation branch

**Files:** All files in this plan

- [ ] **Step 1: Run all quality gates**

```powershell
git diff --check main...HEAD
npm test
npx tsc --noEmit
npm run build
rg -n "service_role|SERVICE_ROLE|supabase_service|VITE_SUPABASE_ANON_KEY=.*ey" . --glob "!node_modules/**" --glob "!dist/**"
```

Expected: formatting, tests, type-check, and build pass; sensitive scan contains no real secret.

- [ ] **Step 2: Confirm commit scope**

```powershell
git status --short
git diff --stat main...HEAD
git log --oneline main..HEAD
```

Expected: only the migration, wallpaper foundation modules/tests, and dependency lock changes are committed. `DESIGN.md`, `read_projects.cjs`, and `.superpowers/` remain untracked.

- [ ] **Step 3: Push for Codex review**

```powershell
git push -u origin feature/v1.7-cloud-wallpaper-foundation
```

Do not begin the UI branch until this branch is reviewed, merged, deployed, and the migration has been run successfully in Supabase.
