import type { Session, User } from '@supabase/supabase-js';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { env } from '../../lib/env';
import { getSupabaseClient } from '../../lib/supabase';
import { useAppStore } from '../../stores';
import {
  AuthProfile,
  ensureAuthenticatedWorkspace,
  Kennel,
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
  kennel: Kennel | null;
  isLoading: boolean;
  isWorkspaceLoading: boolean;
  isSupabaseConfigured: boolean;
  workspaceError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<{ needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  refreshWorkspace: (kennelName?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const isSupabaseReady = env.isSupabaseConfigured && env.validationErrors.length === 0;

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [kennel, setKennel] = useState<Kennel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const setActiveKennelId = useAppStore((state) => state.setActiveKennelId);

  const clearWorkspace = useCallback(() => {
    setProfile(null);
    setKennel(null);
    setActiveKennelId(null);
  }, [setActiveKennelId]);

  const loadWorkspace = useCallback(
    async (user: User | null, kennelName?: string) => {
      if (!user || !isSupabaseReady) {
        clearWorkspace();
        return;
      }

      setIsWorkspaceLoading(true);

      try {
        const workspace = await ensureAuthenticatedWorkspace(user, { kennelName });
        setProfile(workspace.profile);
        setKennel(workspace.kennel);
        setActiveKennelId(workspace.kennel?.id ?? null);
        setWorkspaceError(null);
      } catch (error) {
        setWorkspaceError(getErrorMessage(error));
      } finally {
        setIsWorkspaceLoading(false);
      }
    },
    [clearWorkspace, setActiveKennelId],
  );

  useEffect(() => {
    if (!isSupabaseReady) {
      setIsLoading(false);
      clearWorkspace();
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
          setWorkspaceError(error.message);
          return;
        }

        setSession(data.session);
        await loadWorkspace(data.session?.user ?? null);
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
      void loadWorkspace(nextSession?.user ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [clearWorkspace, loadWorkspace]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const data = await signInWithPassword({ email, password });
      setSession(data.session);
      await loadWorkspace(data.session?.user ?? null);
    },
    [loadWorkspace],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const result = await signUpWithPassword(input);
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      await loadWorkspace(data.session?.user ?? null, input.kennelName);

      return result;
    },
    [loadWorkspace],
  );

  const signOut = useCallback(async () => {
    await signOutOfSupabase();
    setSession(null);
    clearWorkspace();
  }, [clearWorkspace]);

  const refreshWorkspace = useCallback(
    async (kennelName?: string) => {
      await loadWorkspace(session?.user ?? null, kennelName);
    },
    [loadWorkspace, session?.user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      kennel,
      isLoading,
      isWorkspaceLoading,
      isSupabaseConfigured: isSupabaseReady,
      workspaceError,
      signIn,
      register,
      signOut,
      refreshWorkspace,
    }),
    [
      session,
      profile,
      kennel,
      isLoading,
      isWorkspaceLoading,
      workspaceError,
      signIn,
      register,
      signOut,
      refreshWorkspace,
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

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong while preparing the account workspace.';
}
