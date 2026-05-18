import type { Session, User } from '@supabase/supabase-js';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { env } from '../../lib/env';
import { getSupabaseClient } from '../../lib/supabase';
import { ensureInitialKennel } from '../kennels/kennelService';
import {
  AuthProfile,
  ensureAuthenticatedProfile,
  signInWithPassword,
  signOut as signOutOfSupabase,
  signUpWithPassword,
} from './authService';

interface AuthProviderProps {
  children: ReactNode;
}

interface RegisterInput {
  email: string;
  password: string;
  kennelName: string;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: AuthProfile | null;
  isLoading: boolean;
  isProfileLoading: boolean;
  isSupabaseConfigured: boolean;
  profileError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<{ needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const isSupabaseReady = env.isSupabaseConfigured && env.validationErrors.length === 0;

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const clearProfile = useCallback(() => {
    setProfile(null);
  }, []);

  const loadProfile = useCallback(
    async (user: User | null) => {
      if (!user || !isSupabaseReady) {
        clearProfile();
        return;
      }

      setIsProfileLoading(true);

      try {
        const nextProfile = await ensureAuthenticatedProfile(user);
        setProfile(nextProfile);
        setProfileError(null);
      } catch (error) {
        setProfileError(getErrorMessage(error));
      } finally {
        setIsProfileLoading(false);
      }
    },
    [clearProfile],
  );

  useEffect(() => {
    if (!isSupabaseReady) {
      setIsLoading(false);
      clearProfile();
      return;
    }

    const supabase = getSupabaseClient();
    let isMounted = true;

    supabase.auth
      .getSession()
      .then(async ({ data, error }) => {
        if (!isMounted) {
          return;
        }

        if (error) {
          setProfileError(getErrorMessage(error));
          return;
        }

        setSession(data.session);
        await loadProfile(data.session?.user ?? null);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      void loadProfile(nextSession?.user ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [clearProfile, loadProfile]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const data = await signInWithPassword({ email, password });
      setSession(data.session);
      await loadProfile(data.session?.user ?? null);
    },
    [loadProfile],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const result = await signUpWithPassword(input);
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getSession();

      if (data.session?.user) {
        await ensureInitialKennel(data.session.user, input.kennelName);
      }

      setSession(data.session);
      await loadProfile(data.session?.user ?? null);

      return result;
    },
    [loadProfile],
  );

  const signOut = useCallback(async () => {
    await signOutOfSupabase();
    setSession(null);
    clearProfile();
  }, [clearProfile]);

  const refreshProfile = useCallback(
    async () => {
      await loadProfile(session?.user ?? null);
    },
    [loadProfile, session?.user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      isLoading,
      isProfileLoading,
      isSupabaseConfigured: isSupabaseReady,
      profileError,
      signIn,
      register,
      signOut,
      refreshProfile,
    }),
    [
      session,
      profile,
      isLoading,
      isProfileLoading,
      profileError,
      signIn,
      register,
      signOut,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
}

function getErrorMessage(_error: unknown) {
  return 'Algo ha ido mal al preparar el espacio de la cuenta.';
}
