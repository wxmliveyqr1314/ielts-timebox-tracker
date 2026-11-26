import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { syncRewardSettings } from './rewardSync';

// Execute the actual migration in PostgreSQL/WASM, with Supabase's auth context emulated.
describe('reward migration and RLS', () => {
  let db: PGlite;
  const userA = '11111111-1111-4111-8111-111111111111';
  const userB = '22222222-2222-4222-8222-222222222222';
  const userC = '33333333-3333-4333-8333-333333333333';
  const early = '2026-11-26T04:00:00Z';
  const later = '2026-11-26T05:00:00Z';
  const goal = { id: 'goal', title: '吃火锅', targetPoints: 20, createdAt: early };
  const migration = readFileSync(new URL('../../supabase/migrations/20261126_reward_goal_sync.sql', import.meta.url), 'utf8');

  beforeAll(async () => {
    db = await PGlite.create();
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
        'select nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';
      grant usage on schema auth to authenticated, anon;
      grant execute on function auth.uid() to authenticated, anon;
      insert into auth.users values ('${userA}'), ('${userB}'), ('${userC}');
    `);
    await db.exec(migration);
    await db.exec(migration); // Applying twice must not change data or fail.
  }, 30000);
  afterAll(async () => { await db?.close(); });

  async function login(user: string, role = 'authenticated') {
    await db.exec(`reset role; set role ${role};`);
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user]);
  }
  async function call(value: unknown, timestamp: string | null, device: string) {
    return (await db.query<any>('select * from public.sync_reward_settings($1::jsonb, $2::timestamptz, $3::text)',
      [value === null ? null : JSON.stringify(value), timestamp, device])).rows;
  }

  it('empty devices read without inserting or deleting', async () => {
    await login(userA);
    expect(await call(null, null, 'a')).toEqual([]);
    expect((await call(goal, early, 'a'))[0].goal_json).toEqual(goal);
    expect((await call(null, null, 'b'))[0].goal_json).toEqual(goal);
  });

  it('returns the newer winner when a stale request arrives last', async () => {
    await login(userA);
    const updated = { ...goal, title: '新奖励' };
    await call(updated, later, 'b');
    expect((await call(goal, early, 'z'))[0].goal_json).toEqual(updated);
    expect((await call(updated, later, 'b'))[0].goal_json).toEqual(updated);
  });

  it('resolves equal times deterministically and lets clear beat an active goal', async () => {
    await login(userA);
    const updated = { ...goal, title: '第三个目标' };
    expect((await call(updated, later, 'c'))[0].device_id).toBe('c');
    expect((await call(goal, later, 'a'))[0].goal_json).toEqual(updated);
    expect((await call(null, later, 'a'))[0].goal_json).toBeNull();
    expect((await call(goal, later, 'z'))[0].goal_json).toBeNull();
    expect((await call(goal, early, 'z'))[0].goal_json).toBeNull();
  });

  it('isolates accounts and disallows direct writes to another user', async () => {
    await login(userB);
    expect(await call(null, null, 'a')).toEqual([]);
    expect((await db.query('select * from public.reward_settings')).rows).toEqual([]);
    await expect(db.query('insert into public.reward_settings(user_id, updated_at, device_id) values ($1,$2,$3)',
      [userA, later, 'a'])).rejects.toThrow(/row-level security/);
    await call(goal, early, 'a');
    const own = (await db.query<any>('select * from public.reward_settings')).rows;
    expect(own).toHaveLength(1);
    expect(own[0].user_id).toBe(userB);
    await expect(db.query('delete from public.reward_settings')).rejects.toThrow(/permission denied/);
  });

  it('rejects malformed writes while preserving the existing goal', async () => {
    await login(userB);
    for (const invalid of [{}, { ...goal, targetPoints: -1 }, { ...goal, note: null },
      { ...goal, createdAt: 'bad' }, { ...goal, completedAt: 'infinity' }]) {
      await expect(call(invalid, later, 'b')).rejects.toThrow();
    }
    await expect(call(goal, later, '')).rejects.toThrow();
    expect((await call(null, null, 'b'))[0].goal_json).toEqual(goal);
  });

  it('denies anonymous callers and authenticated callers without an identity', async () => {
    await login('', 'anon');
    await expect(call(null, null, 'a')).rejects.toThrow(/permission denied/);
    await expect(db.query('select * from public.reward_settings')).rejects.toThrow(/permission denied/);
    await login('');
    await expect(call(null, null, 'a')).rejects.toThrow(/Authentication required/);
  });

  it('round-trips two devices through the real RPC, including clear and recreate', async () => {
    await login(userC);
    const transport = { rpc: async (_name: string, input: any) => ({
      data: (await call(input.p_goal, input.p_updated_at, input.p_device_id)).map(row => ({
        ...row, updated_at: row.updated_at.toISOString(),
      })), error: null,
    }) } as any;
    let a = (await syncRewardSettings({ schemaVersion: 1, activeGoal: goal }, 'a', transport)).rewards;
    let b = (await syncRewardSettings(undefined, 'b', transport)).rewards;
    expect(b).toEqual(a);
    a = { ...a!, activeGoal: { ...goal, title: '新目标' }, updatedAt: later, updatedBy: undefined };
    a = (await syncRewardSettings(a, 'a', transport)).rewards;
    b = { schemaVersion: 1, updatedAt: '2026-11-26T06:00:00Z' };
    b = (await syncRewardSettings(b, 'b', transport)).rewards;
    a = (await syncRewardSettings(a, 'a', transport)).rewards;
    expect(a).toEqual(b);
    expect(a?.activeGoal).toBeUndefined();
    a = { schemaVersion: 1, activeGoal: { ...goal, id: 'new-id' }, updatedAt: '2026-11-26T07:00:00Z' };
    a = (await syncRewardSettings(a, 'a', transport)).rewards;
    b = (await syncRewardSettings(b, 'b', transport)).rewards;
    expect(b).toEqual(a);
    expect(b?.activeGoal?.id).toBe('new-id');
  });
});
