# v1.2 Cloud Sync Technical Decision

Status: Approved for planning
Date: 2026-06-25
App version baseline: v1.1.1
Baseline commit: a9e0448

## 1. Decision Summary

IELTS TimeBox Tracker v1.2 will use Supabase for cloud sync.

The chosen architecture is:

```text
Supabase Auth + Email Magic Link
Supabase Postgres + Row Level Security
LocalStorage-first app state
DailyRecord cloud sync by natural date
```

LocalStorage remains the primary local cache. Supabase is added as cross-device sync and cloud backup. The existing LocalStorage data model must not be deleted or replaced in v1.2.

The first implementation must favor data safety over convenience. No automatic destructive overwrite is allowed.

## 2. Goals

v1.2 cloud sync must support:

- Using the app on both phone and computer.
- Keeping existing LocalStorage data.
- Signing in with the same email on multiple devices.
- Uploading existing local records after first sign-in.
- Downloading cloud records to a new device.
- Editing records offline through LocalStorage.
- Syncing changed records after network recovery.
- Preventing one user's records from being visible to another user.
- Showing sync status in Settings.

## 3. Non-Goals

v1.2 must not include:

- Firebase.
- Supabase anonymous-only sync as the final identity model.
- Public shared records.
- Multi-user collaboration.
- Admin dashboard.
- Full UI redesign.
- PWA/offline service worker work.
- Rewriting Green / Yellow / Red / Pending logic.
- Rewriting Stats or streak algorithms.
- Removing JSON export/import.
- Removing LocalStorage.

## 4. Why Supabase

Supabase is selected because:

- The user has used Supabase before for another cloud-sync tool.
- The project is already deployed through GitHub and Vercel.
- Supabase Auth supports email-based login flows.
- Supabase Postgres supports Row Level Security.
- Supabase JavaScript client supports upsert operations, which fit per-date DailyRecord sync.

References:

- Supabase Auth: https://supabase.com/docs/guides/auth
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase JavaScript upsert: https://supabase.com/docs/reference/javascript/upsert

## 5. Identity Decision

Use Email Magic Link login through Supabase Auth.

Do not use pure anonymous sync for v1.2. Supabase anonymous users can work for temporary sessions, but they are not a stable cross-device identity. If browser storage is cleared or a device changes, the same anonymous identity may not be recoverable.

For this project, the user wants phone and computer sync. A stable user identity is required. Email Magic Link is the lightest acceptable login model.

## 6. Data Ownership and Security

All cloud tables must use Row Level Security.

The app must use only:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

The frontend must never use:

```text
service_role key
database password
private Supabase secrets
```

Each synced row must include:

```text
user_id = auth.uid()
```

RLS policies must restrict every select, insert, update, and delete operation to the authenticated owner.

## 7. Proposed Supabase Tables

### 7.1 daily_records

This is the required v1.2 table.

```sql
create table public.daily_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date_key text not null,
  record_json jsonb not null,
  schema_version integer not null default 1,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  device_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, date_key)
);
```

`date_key` must be normalized `YYYY-MM-DD`.

`record_json` stores the current `DailyRecord` payload without forcing a large schema rewrite. This keeps v1.2 focused and reduces migration risk.

### 7.2 user_settings

This table is optional in early v1.2. The current app has an `AppSettings` type, but Settings does not yet expose full settings editing. Cloud settings sync can wait until after DailyRecord sync is stable.

If implemented later:

```sql
create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  settings_json jsonb not null,
  schema_version integer not null default 1,
  updated_at timestamptz not null,
  device_id text not null
);
```

## 8. RLS Policy Requirements

RLS must be enabled:

```sql
alter table public.daily_records enable row level security;
```

Required policies:

```sql
create policy "daily_records_select_own"
on public.daily_records
for select
using ((select auth.uid()) = user_id);

create policy "daily_records_insert_own"
on public.daily_records
for insert
with check ((select auth.uid()) = user_id);

create policy "daily_records_update_own"
on public.daily_records
for update
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "daily_records_delete_own"
on public.daily_records
for delete
using ((select auth.uid()) = user_id);
```

Delete operations should usually be avoided by the app. The preferred app-level behavior is tombstone sync through `deleted_at`.

## 9. Local Data Compatibility

Current local storage:

```text
key: ielts_timebox_state_v2
shape: AppState
```

Current corrupt backup key:

```text
ielts_timebox_tracker_corrupt_backup_v1
```

v1.2 must preserve both behaviors.

`useAppData` currently owns:

- load from LocalStorage
- corrupted JSON backup
- updateRecord
- deleteRecord
- importData
- clearData

The first cloud-sync implementation should extend this architecture rather than replacing it.

## 10. Sync Model

The app should sync by day.

One normalized date corresponds to one `DailyRecord` row:

```text
date_key = normalizeDateString(record.date)
```

Sync unit:

```text
DailyRecord
```

Conflict rule:

```text
Last Write Wins by DailyRecord.updatedAt
```

This is acceptable for v1.2 because:

- The app is single-user.
- DailyRecord is naturally one record per day.
- Simultaneous editing on two devices is expected to be rare.
- Field-level merge would be more complex and riskier.

## 11. Delete Sync

Do not hard-delete records immediately.

Use tombstones:

```text
deleted_at = timestamp
```

When a user deletes a local record:

1. Keep a tombstone locally in sync metadata.
2. Upsert the tombstone to Supabase.
3. Other devices that pull the tombstone remove the local visible record.

The current `AppState.records` does not have a tombstone structure. v1.2 implementation must introduce sync metadata carefully, without breaking existing pages.

Recommended local extension:

```ts
interface AppState {
  records: Record<string, DailyRecord>;
  settings?: AppSettings;
  sync?: {
    schemaVersion: 1;
    deviceId: string;
    deletedRecords?: Record<string, string>;
    lastSyncAt?: string;
  };
}
```

`deletedRecords` maps:

```text
date_key -> deleted_at ISO timestamp
```

This extension is backward compatible because `sync` is optional.

## 12. First Sign-In Migration

When the user signs in for the first time:

1. Read LocalStorage.
2. Fetch cloud `daily_records`.
3. If cloud is empty:
   - Upload all valid local records.
   - Mark sync as completed.
4. If cloud has data:
   - Do not silently overwrite.
   - Show a confirmation prompt before merging.
5. Merge by `date_key`:
   - Local exists, cloud missing: upload local.
   - Cloud exists, local missing: download cloud.
   - Both exist: compare `DailyRecord.updatedAt`; newer wins.
   - Cloud tombstone newer than local record: delete local visible record.
   - Local tombstone newer than cloud record: upload tombstone.
6. Write merged result back to LocalStorage.

Before first migration, the Settings page should encourage JSON export backup.

## 13. Offline Behavior

The app must remain usable offline.

When offline or Supabase sync fails:

- Daily / History edits still update LocalStorage.
- The UI shows a non-blocking sync error or pending state.
- The app retries sync later or when the user clicks "Sync now".

Cloud sync must never block local task editing.

## 14. Settings UI Scope

v1.2 should add a small Cloud Sync panel to Settings.

Suggested states:

```text
Local only
Signed out
Signing in
Signed in
Syncing
Synced
Sync error
Offline
```

Suggested controls:

- Email input.
- Send Magic Link button.
- Sync now button.
- Sign out button.
- Last sync time.
- Current account email.

Do not redesign the whole Settings page in v1.2.

## 15. Environment Variables

Required Vercel variables:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Required local `.env` variables:

```text
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Do not commit real `.env` files.

Update `.env.example` only with placeholder keys when implementation begins.

## 16. Recommended Implementation Phases

### v1.2.1 Supabase Client and Auth Shell

Add:

- `@supabase/supabase-js`
- Supabase client module
- Auth state hook
- Settings Cloud Sync panel
- Email Magic Link send action
- Sign out action

No record sync yet.

Acceptance:

- App builds without Supabase env values by showing a clear "not configured" state.
- With env values, user can sign in.
- LocalStorage behavior unchanged.

### v1.2.2 Database Schema and Manual Sync

Add:

- SQL migration instructions for `daily_records`.
- RLS policies.
- Manual "Sync now" for upload/download/merge.
- First sign-in migration flow.

Acceptance:

- Existing local records upload safely.
- New device can download records after login.
- No silent destructive overwrite.

### v1.2.3 Delete Tombstones and Conflict Handling

Add:

- Local sync metadata.
- `deletedRecords` tombstones.
- Last Write Wins conflict tests.
- Multi-device conflict test cases.

Acceptance:

- Deleted records do not reappear from another device.
- Newer edits win by `updatedAt`.

### v1.2.4 Sync Polish and Regression Testing

Add:

- Better sync status messages.
- Offline/error states.
- Browser validation on desktop and mobile width.
- Backup-before-migration guidance.

Acceptance:

- Offline edits are preserved.
- Network recovery can sync.
- Daily / History / Stats behavior remains stable.

## 17. Required Tests

Minimum automated tests:

- Merge local-only record.
- Merge cloud-only record.
- Local newer than cloud.
- Cloud newer than local.
- Tombstone newer than record.
- Invalid date ignored.
- Normalized `YYYY-M-D` and `YYYY-MM-DD` treated as same date.
- Merge does not mutate inputs.
- No LocalStorage overwrite on failed cloud fetch.

Manual tests:

- Empty browser profile.
- Existing LocalStorage data.
- First login with cloud empty.
- First login with cloud already populated.
- Two devices editing different days.
- Two devices editing same day.
- Delete on one device, sync on another.
- Offline edit then reconnect.
- Sign out and sign in again.
- Vercel production env configured.

## 18. Antigravity Execution Rules

Antigravity must not implement all of v1.2 at once.

Each phase must use a separate branch:

```text
feature/v1.2.1-supabase-auth
feature/v1.2.2-cloud-record-sync
feature/v1.2.3-sync-conflicts-and-deletes
feature/v1.2.4-sync-polish
```

For every branch:

- Start from latest `main`.
- Do not commit `DESIGN.md`.
- Do not commit `read_projects.cjs`.
- Do not commit `.env`.
- Do not use `git add .` without checking diff.
- Run `npm test`.
- Run `npx tsc --noEmit`.
- Run `npm run build`.
- Provide browser validation if UI changes.

## 19. Codex Review Checklist

Codex must review:

- Branch name and base commit.
- Real diff, not only Antigravity summary.
- No committed secrets.
- RLS SQL present and correct before cloud data writes.
- Supabase service role key absent from frontend.
- LocalStorage compatibility retained.
- JSON corruption protection retained.
- Import/export retained.
- Daily / History / Stats still read same data source.
- No silent data overwrite.
- Merge tests cover conflicts.
- Delete tombstones prevent resurrection.
- Vercel env variable requirements documented.

## 20. Final Decision

v1.2 will proceed with Supabase Email Magic Link and LocalStorage-first sync.

Implementation must be incremental. The next executable task is v1.2.1: Supabase client and auth shell only.

