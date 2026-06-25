import { describe, it, expect } from 'vitest';

describe('supabaseClient behavior without env', () => {
  it('does not crash when environment variables are missing', async () => {
    const client = await import('./supabaseClient');
    expect(client).toBeDefined();
    expect(client.isSupabaseConfigured).toBe(false);
    expect(client.supabase).toBeNull();
  });
});
