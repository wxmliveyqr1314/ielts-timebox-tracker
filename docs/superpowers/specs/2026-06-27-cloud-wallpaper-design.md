# v1.7 Cloud Wallpaper Design

Status: Approved

Date: 2026-06-27

## 1. Objective

Add a user-selectable wallpaper to IELTS TimeBox Tracker. The wallpaper must:

- sync across signed-in devices through Supabase;
- remain visible offline or after sign-out by using the last successful local cache;
- preserve text and control readability;
- remain isolated from DailyRecord data, record cloud sync, JSON backup, and status calculations;
- fail safely to the existing default background.

## 2. Scope

### Included

- Upload one JPEG, PNG, or WebP image from Settings.
- Compress and resize the image in the browser before upload.
- Store the image in a private Supabase Storage bucket named `wallpapers`.
- Store wallpaper preferences in a dedicated `user_preferences` table.
- Apply the wallpaper immediately after a successful `Upload & Apply` action.
- Enable or disable the wallpaper without deleting it.
- Adjust a readability overlay from 25% to 70%, defaulting to 42%.
- Remove the cloud wallpaper with explicit confirmation.
- Cache the processed image Blob in IndexedDB for offline and signed-out display.
- Keep lightweight local wallpaper metadata in a separate localStorage key.

### Excluded

- Multiple wallpaper libraries, playlists, rotation, or scheduled changes.
- Public wallpaper sharing.
- AI-generated wallpapers.
- Automatic DailyRecord synchronization or realtime subscriptions.
- Storing image data in `AppState`, `daily_records`, JSON exports, or localStorage.
- A general application redesign.

## 3. User Experience

Settings gains an `Appearance / Wallpaper` section containing:

1. A preview of the active or selected wallpaper.
2. `Choose image` for JPEG, PNG, and WebP files.
3. `Upload & Apply`, enabled only for an authenticated user with a valid selected image.
4. A `Wallpaper` on/off toggle. Disabling does not delete the file.
5. A `Readability overlay` slider from 25 to 70.
6. `Remove wallpaper`, shown only when a wallpaper exists and protected by a confirmation dialog.
7. Compact status and error feedback for compression, upload, preference save, download, cache, and removal.

Selecting a file only creates a local preview. The cloud and active wallpaper do not change until `Upload & Apply` succeeds.

If the user is signed out, the last cached wallpaper may continue to display. Upload, cloud preference changes, and cloud removal are disabled until sign-in.

## 4. Visual Direction

The wallpaper appears only behind the scrollable content area. The application header and bottom navigation remain solid surfaces to preserve orientation and contrast.

The content area must not use one large opaque panel. Wallpaper remains visible through gaps and localized translucent surfaces:

- global wallpaper overlay default: 42%;
- user-adjustable overlay range: 25% to 70%;
- task and information surfaces: approximately 66% dark opacity with restrained backdrop blur;
- dialogs remain opaque and do not expose wallpaper behind critical confirmation text;
- text uses sufficient contrast and may use subtle shadow only where it sits directly over the wallpaper.

When no wallpaper is active or available, the current default background and existing component styling remain intact.

## 5. Architecture

### 5.1 Module boundaries

- `wallpaperStorage`: Supabase upload, authenticated download, preference read/write, and object removal.
- `wallpaperImage`: file validation, image decoding, resizing, WebP encoding, and size enforcement.
- `wallpaperCache`: IndexedDB Blob cache and separate local metadata persistence.
- `useWallpaper`: initialization, active URL lifecycle, cloud refresh, upload/apply, toggle, overlay update, and removal orchestration.
- `WallpaperSettings`: Settings controls and status feedback.
- `AppLayout`: presentation only; receives resolved wallpaper state and applies background/overlay styling.

These units must not import DailyRecord merge utilities or mutate `AppState`.

### 5.2 Application flow

At startup:

1. Read local wallpaper metadata.
2. Read the cached Blob from IndexedDB.
3. If valid and enabled, create an Object URL and render it immediately.
4. If authenticated, fetch `user_preferences`.
5. If cloud metadata is newer or references a different path, download the private object with the authenticated Supabase client, update the cache, and replace the Object URL.
6. Revoke replaced Object URLs to avoid memory leaks.

This automatic preference refresh is separate from the manual DailyRecord `Sync now` action.

## 6. Cloud Data Model

Create one row per user in `public.user_preferences`:

| Column | Type | Rule |
| --- | --- | --- |
| `user_id` | `uuid` | Primary key; references `auth.users(id)` with cascade delete |
| `wallpaper_path` | `text` | Nullable private Storage object path |
| `wallpaper_enabled` | `boolean` | Not null, default `false` |
| `overlay_opacity` | `smallint` | Not null, default `42`, constrained to 25-70 |
| `wallpaper_updated_at` | `timestamptz` | Nullable; changes when image content changes |
| `updated_at` | `timestamptz` | Not null; changes for any preference update |

Enable RLS. Authenticated users may select, insert, and update only the row where `user_id = auth.uid()`. Client-side delete of the row is unnecessary; removing a wallpaper clears its wallpaper fields.

## 7. Storage Model and Security

Create a private files bucket named `wallpapers` with:

- allowed MIME types: `image/jpeg`, `image/png`, and `image/webp`;
- a bucket file-size limit appropriate for processed output, no greater than 3 MB;
- object paths shaped as `{userId}/{timestamp}.webp`.

Storage RLS must allow authenticated users to select, insert, update, and delete only objects where:

- `bucket_id = 'wallpapers'`; and
- the first path folder equals the authenticated user id.

The browser must never receive a service-role key. The existing anon/publishable key and authenticated user JWT are sufficient when RLS is correct.

Do not persist public URLs or signed URLs. Download the private object through the authenticated Supabase client, cache the resulting Blob, and render it through an Object URL.

## 8. Local Cache

Use an IndexedDB database dedicated to wallpaper binary data. Store at most one active Blob per browser profile.

Use a separate localStorage key, such as `ielts_timebox_wallpaper_meta_v1`, for metadata only:

- cloud path;
- enabled state;
- overlay opacity;
- wallpaper update timestamp;
- owning user id when known;
- cache schema version.

Do not place Blob, Base64, signed URL, or temporary preview URL values in localStorage.

The cached wallpaper may remain visible after sign-out, as explicitly approved. When a different user signs in, stop displaying a cache owned by the previous user before starting the cloud lookup. Replace it with the new user's wallpaper after a successful lookup, or keep the default background when no preference exists. This prevents one account's cached wallpaper from being shown inside another account's session.

## 9. Image Processing

Before upload:

1. Validate the browser-reported MIME type and successfully decode the image.
2. Reject unsupported or malformed files.
3. Reject unreasonable source dimensions or pixel count before allocating a large canvas.
4. Resize proportionally so the longest edge is at most 2560 pixels.
5. Encode to WebP, initially around quality 0.82.
6. Reduce dimensions or quality within a bounded number of attempts if output exceeds 3 MB.
7. Fail with a clear message if the processed image still exceeds the limit.

Animated images and SVG are not supported in v1.7.

## 10. Transaction and Failure Behavior

### Upload and replace

1. Process the selected image locally.
2. Upload it to a new versioned path.
3. Upsert `user_preferences` to reference the new path and settings.
4. Cache and apply the new processed Blob.
5. Best-effort remove the previous object through the Storage API.

If upload fails, retain the old wallpaper. If the preference upsert fails, remove the newly uploaded object when possible and retain the old wallpaper. Failure to delete the old object must not roll back the successfully applied replacement; report a non-blocking cleanup warning.

### Remove

1. Confirm the destructive action.
2. Clear `wallpaper_path`, set `wallpaper_enabled = false`, and update timestamps in `user_preferences`.
3. Clear the local Blob and metadata.
4. Revert immediately to the default background.
5. Best-effort remove the old Storage object.

Cloud preference clearing happens before object deletion so other devices stop referencing the image even if Storage cleanup fails.

### Load

- Cloud download failure: retain a valid local cache and show a non-blocking warning in Settings.
- Missing or invalid cache: use the default background.
- Missing table, bucket, or policy: keep the application usable and show a configuration-specific error.
- Expired session: retain the cached wallpaper and request sign-in before cloud actions.

## 11. State and Concurrency

- Disable upload and removal controls while their operation is active.
- Ignore stale asynchronous load results after account changes or component unmount.
- Use `updated_at` and `wallpaper_updated_at` to decide whether cloud metadata or cached metadata is newer.
- A successful explicit user action takes precedence over an older startup refresh response.
- Overlay changes apply immediately. While authenticated, persist them to `user_preferences`; while signed out, keep them local and do not silently overwrite cloud settings later without a signed-in explicit update.

## 12. Testing and Acceptance

### Automated tests

- Valid and invalid MIME types.
- Malformed image rejection.
- Dimension, pixel-count, and output-size limits.
- Overlay clamping and metadata parsing.
- Cached Blob startup fallback.
- Account change cache isolation.
- Upload success, upload failure, preference failure rollback, and old-file cleanup warning.
- Cloud load success and cloud load failure with cache fallback.
- Toggle persistence and remove sequencing.
- Object URL revocation.
- Existing tests remain green.

### Required verification

- `git diff --check`
- `npm test`
- `npx tsc --noEmit`
- `npm run build`
- sensitive-key scan for service-role credentials and hard-coded secrets

### Manual acceptance

1. Upload and apply a wallpaper on device A.
2. Sign in on device B and verify the wallpaper and overlay arrive automatically.
3. Reload device B offline and verify the cached wallpaper remains visible.
4. Sign out and verify the cached wallpaper remains visible while cloud controls are disabled.
5. Replace the wallpaper and verify both devices eventually show the new image.
6. Disable and re-enable the wallpaper without deleting it.
7. Remove the wallpaper and verify both devices return to the default background after refresh.
8. Verify bright and detailed images remain readable at minimum and maximum overlay settings.
9. Verify Daily, History, Stats, Settings, delete flows, record sync, JSON import/export, and Data Health remain functional.

## 13. Delivery Sequence

Implement in two reviewable branches:

1. `feature/v1.7-cloud-wallpaper-foundation`
   - SQL/setup documentation, image processing, private Storage access, preference repository, IndexedDB cache, hook, and automated tests.
2. `feature/v1.7.1-wallpaper-ui`
   - Settings controls, AppLayout background integration, translucent content surfaces, responsive visual QA, and manual acceptance checklist.

Do not combine unrelated redesigns or DailyRecord synchronization changes with either branch.
