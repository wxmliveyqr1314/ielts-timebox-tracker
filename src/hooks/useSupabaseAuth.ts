import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';
import { Session, User } from '@supabase/supabase-js';

function asError(cause: unknown): Error {
  return cause instanceof Error ? cause : new Error('The login service is unavailable.');
}

export function useSupabaseAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    let active = true;
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!active) return;
      if (error) {
        setError(error.message);
      } else {
        setSession(session);
        setUser(session?.user ?? null);
      }
    }).catch((cause: unknown) => {
      if (active) setError(asError(cause).message);
    }).finally(() => {
      if (active) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session) setError(null);
      }
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const sendMagicLink = async (email: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: new Error('Supabase is not configured.') };
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      setError(error?.message ?? null);
      return { error };
    } catch (cause) {
      const error = asError(cause);
      setError(error.message);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const verifyEmailOtp = async (email: string, token: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: new Error('Supabase is not configured.') };
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: token.trim(),
        type: 'email'
      });
      setError(error?.message ?? null);
      return { data, error };
    } catch (cause) {
      const error = asError(cause);
      setError(error.message);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      setError(error?.message ?? null);
    } catch (cause) {
      setError(asError(cause).message);
    } finally {
      setLoading(false);
    }
  };

  return {
    session,
    user,
    email: user?.email ?? null,
    loading,
    configured: isSupabaseConfigured && Boolean(supabase),
    error,
    sendMagicLink,
    verifyEmailOtp,
    signOut,
  };
}
