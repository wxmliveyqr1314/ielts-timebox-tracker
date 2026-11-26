# v2.7 Reward goal cloud sync

## Behavior and compatibility

- The existing manual Sync now action synchronizes daily records and the single active reward goal. Offline saves remain local. No automatic reward sync is added.
- Add optional `updatedAt` and `updatedBy` fields to `RewardSettings`. A timestamp without an active goal is a persistent clear marker. Local save/clear timestamps strictly increase, including after clock rollback. Goal identity and creation time survive edits.
- Legacy active goals use their original `createdAt` on first sync, never the sync time. Legacy empty settings mean unknown, not a deletion. Missing rewards can safely download a cloud goal or clear marker.
- Points continue to be derived from daily records. Planning, status, history, wallpaper, and scoring are unchanged. JSON backups include the optional sync metadata.

## Cloud storage and conflict resolution

- Add an independent `public.reward_settings` table: one row per authenticated user, nullable goal JSON, schema version, modification timestamp, originating device ID. A null goal is a tombstone, not a deleted row.
- Enable RLS for own-user SELECT/INSERT/UPDATE. No anonymous access or client DELETE. An invoker-rights RPC gets the user from `auth.uid()`; the caller cannot choose another user.
- The RPC atomically conditionally upserts by modification timestamp. Equal timestamps prefer clear over an active goal, then the larger device ID using C collation. It returns the persisted winner, including when a stale write loses. This protects against concurrent select/upsert races.
- Timestamp ordering follows the current application's client-clock model. Incorrect device clocks can affect conflict priority; edits after receiving a future timestamp still increment it.
- Validate local and returned cloud envelopes before replacement. Invalid rewards never erase valid local data. Existing daily-record synchronization remains usable if the reward migration is missing.

## Integration and failures

- Keep daily-record synchronization separate internally; combine its outcome with reward synchronization in a coordinator. Apply successful portions when the other portion fails, explain the failed portion in Chinese, and record a full-sync timestamp only when both succeed.
- A missing RPC/table produces a specific setup message rather than a false success. No service-role credentials enter the frontend.
- Reconcile responses against the snapshot taken at sync start in the state hook, preserving any local saves, clears, imports, record edits, or deletions made during the request. Changes made during a request need another manual sync.
- Preserve an unsaved reward form draft when a cloud result arrives and explain that it can be saved and synced again.

## Implementation and release tasks

1. Add versioned SQL migration and database verification script for atomic ordering, tombstones, validation, idempotency, and user isolation.
2. Implement reward normalization, transport, coordinator, timestamped local mutations, and snapshot reconciliation.
3. Wire Chinese feedback into Settings and Data Health; retain offline behavior.
4. Cover legacy migration, two devices, offline edits, clear propagation, equal timestamps, partial failures, and requests overlapping local edits in unit/component and persistence E2E tests.
5. Run focused tests, full unit/component suite, typecheck, build, persistence E2E, and diff review. Update README/handoff and release as v2.7.0 through a PR.
6. Apply the additive SQL to Supabase before claiming cloud availability. If account/browser access blocks this, provide the exact tested migration and deployment status; never claim the production database is configured without evidence.

## References

- [Supabase database functions and invoker security](https://supabase.com/docs/guides/database/functions)
- [PostgreSQL conditional ON CONFLICT](https://www.postgresql.org/docs/17/sql-insert.html)
