// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsPage } from './SettingsPage';
import { useAppData } from '../hooks/useAppData';

const cloud = vi.hoisted(() => ({ rpc: vi.fn(), fetch: vi.fn() }));
vi.mock('../utils/supabaseClient', () => ({
  supabase: { rpc: cloud.rpc, from: () => ({ select: () => ({ eq: cloud.fetch }) }) },
}));
const key = 'ielts_timebox_state_v2';
const goal = { id: 'local', title: '原来的奖励', targetPoints: 20, createdAt: '2026-07-10T00:00:00Z' };
const remote = { ...goal, id: 'remote', title: '另一台设备的目标' };
const row = { schema_version: 1, goal_json: remote, updated_at: '2026-11-26T00:00:00Z', device_id: 'b' };
const auth = { session: { user: { id: 'test-user' } }, configured: true, email: 'test@example.test', loading: false,
  sendMagicLink: vi.fn(), verifyEmailOtp: vi.fn(), signOut: vi.fn() } as any;
const wallpaper = { ready: true, busy: null, overlayOpacity: 50 } as any;

function Harness() {
  const appData = useAppData();
  return <SettingsPage appData={appData} auth={auth} wallpaper={wallpaper} online={true} />;
}
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(key, JSON.stringify({ records: {}, rewards: { schemaVersion: 1, activeGoal: goal },
    sync: { schemaVersion: 1, deviceId: 'a', lastSyncAt: '2026-07-10T00:00:00Z' } }));
  cloud.fetch.mockResolvedValue({ data: [], error: null });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('Settings manual reward sync', () => {
  it('downloads a cloud goal with the existing button and persists it', async () => {
    cloud.rpc.mockResolvedValue({ data: [row], error: null });
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: '立即同步' }));
    await waitFor(() => expect(screen.getByLabelText('奖励名称')).toHaveProperty('value', remote.title));
    expect(screen.getByText(/奖励目标已下载/)).toBeDefined();
    expect(JSON.parse(localStorage.getItem(key)!).rewards.activeGoal.id).toBe('remote');
  });

  it('explains a missing migration while keeping the old full-sync timestamp', async () => {
    cloud.rpc.mockResolvedValue({ error: { code: 'PGRST202' } });
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: '立即同步' }));
    await screen.findByText(/奖励目标云同步尚未启用/);
    const data = JSON.parse(localStorage.getItem(key)!);
    expect(data.rewards.activeGoal).toEqual(goal);
    expect(data.sync.lastSyncAt).toBe('2026-07-10T00:00:00Z');
  });

  it.each(['draft', 'save', 'clear'])('preserves a local %s made while the request is pending', async (action) => {
    let finish!: (value: any) => void;
    cloud.rpc.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: '立即同步' }));
    await waitFor(() => expect(cloud.rpc).toHaveBeenCalled());
    fireEvent.change(screen.getByLabelText('奖励名称'), { target: { value: '我正在编辑的奖励' } });
    if (action === 'save') fireEvent.click(screen.getByRole('button', { name: '保存奖励目标' }));
    if (action === 'clear') fireEvent.click(screen.getByRole('button', { name: '清除奖励目标' }));
    await act(async () => { finish({ data: [row], error: null }); });
    const data = JSON.parse(localStorage.getItem(key)!);
    if (action === 'draft') {
      expect(data.rewards.activeGoal).toEqual(remote);
      expect(screen.getByLabelText('奖励名称')).toHaveProperty('value', '我正在编辑的奖励');
      expect(screen.getByText(/未保存的输入已保留/)).toBeDefined();
    } else if (action === 'save') {
      expect(data.rewards.activeGoal.title).toBe('我正在编辑的奖励');
    } else {
      expect(data.rewards.activeGoal).toBeUndefined();
      expect(data.rewards.updatedAt).toBeTruthy();
    }
  });
});
