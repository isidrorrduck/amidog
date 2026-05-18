import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useAuth } from '../auth/AuthProvider';
import {
  createKennelForProfile,
  getInitialKennelNameFromUser,
  Kennel,
  KennelMember,
  KennelWorkspace,
  listKennelWorkspaces,
} from './kennelService';

interface KennelProviderProps {
  children: ReactNode;
}

interface KennelContextValue {
  currentKennel: Kennel | null;
  currentMembership: KennelMember | null;
  currentWorkspace: KennelWorkspace | null;
  availableKennels: KennelWorkspace[];
  isKennelLoading: boolean;
  isKennelMutating: boolean;
  kennelError: string | null;
  switchKennel: (kennelId: string) => Promise<void>;
  createKennel: (kennelName: string) => Promise<void>;
  refreshKennels: () => Promise<void>;
}

const KennelContext = createContext<KennelContextValue | undefined>(undefined);
const activeKennelStoragePrefix = 'amidog.activeKennelId';

export function KennelProvider({ children }: KennelProviderProps) {
  const { profile, user } = useAuth();
  const [availableKennels, setAvailableKennels] = useState<KennelWorkspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<KennelWorkspace | null>(null);
  const [isKennelLoading, setIsKennelLoading] = useState(false);
  const [isKennelMutating, setIsKennelMutating] = useState(false);
  const [kennelError, setKennelError] = useState<string | null>(null);

  const clearKennels = useCallback(() => {
    setAvailableKennels([]);
    setCurrentWorkspace(null);
    setKennelError(null);
  }, []);

  const persistActiveKennel = useCallback(async (profileId: string, kennelId: string | null) => {
    const storageKey = getActiveKennelStorageKey(profileId);

    if (kennelId) {
      await AsyncStorage.setItem(storageKey, kennelId);
      return;
    }

    await AsyncStorage.removeItem(storageKey);
  }, []);

  const selectInitialWorkspace = useCallback(
    async (profileId: string, workspaces: KennelWorkspace[]) => {
      const storedKennelId = await AsyncStorage.getItem(getActiveKennelStorageKey(profileId));
      const storedWorkspace = workspaces.find((workspace) => workspace.kennel.id === storedKennelId);
      const nextWorkspace = storedWorkspace ?? workspaces[0] ?? null;

      setCurrentWorkspace(nextWorkspace);
      await persistActiveKennel(profileId, nextWorkspace?.kennel.id ?? null);
    },
    [persistActiveKennel],
  );

  const refreshKennels = useCallback(async () => {
    if (!user || !profile) {
      clearKennels();
      return;
    }

    setIsKennelLoading(true);

    try {
      let workspaces = await listKennelWorkspaces(profile.id);
      const initialKennelName = getInitialKennelNameFromUser(user);

      if (workspaces.length === 0 && initialKennelName) {
        await createKennelForProfile(profile.id, initialKennelName);
        workspaces = await listKennelWorkspaces(profile.id);
      }

      setAvailableKennels(workspaces);
      await selectInitialWorkspace(profile.id, workspaces);
      setKennelError(null);
    } catch (error) {
      setKennelError(getErrorMessage(error));
      setAvailableKennels([]);
      setCurrentWorkspace(null);
    } finally {
      setIsKennelLoading(false);
    }
  }, [clearKennels, profile, selectInitialWorkspace, user]);

  useEffect(() => {
    void refreshKennels();
  }, [refreshKennels]);

  const switchKennel = useCallback(
    async (kennelId: string) => {
      if (!profile) {
        throw new Error('Inicia sesión antes de cambiar de criadero.');
      }

      const nextWorkspace = availableKennels.find((workspace) => workspace.kennel.id === kennelId);

      if (!nextWorkspace) {
        throw new Error('No tienes acceso a ese criadero.');
      }

      setCurrentWorkspace(nextWorkspace);
      await persistActiveKennel(profile.id, nextWorkspace.kennel.id);
    },
    [availableKennels, persistActiveKennel, profile],
  );

  const createKennel = useCallback(
    async (kennelName: string) => {
      if (!profile) {
        throw new Error('Inicia sesión antes de crear un criadero.');
      }

      setIsKennelMutating(true);

      try {
        const nextWorkspace = await createKennelForProfile(profile.id, kennelName);
        const workspaces = await listKennelWorkspaces(profile.id);

        setAvailableKennels(workspaces);
        setCurrentWorkspace(nextWorkspace);
        await persistActiveKennel(profile.id, nextWorkspace.kennel.id);
        setKennelError(null);
      } catch (error) {
        setKennelError(getErrorMessage(error));
        throw error;
      } finally {
        setIsKennelMutating(false);
      }
    },
    [persistActiveKennel, profile],
  );

  const value = useMemo<KennelContextValue>(
    () => ({
      currentKennel: currentWorkspace?.kennel ?? null,
      currentMembership: currentWorkspace?.membership ?? null,
      currentWorkspace,
      availableKennels,
      isKennelLoading,
      isKennelMutating,
      kennelError,
      switchKennel,
      createKennel,
      refreshKennels,
    }),
    [
      availableKennels,
      createKennel,
      currentWorkspace,
      isKennelLoading,
      isKennelMutating,
      kennelError,
      refreshKennels,
      switchKennel,
    ],
  );

  return <KennelContext.Provider value={value}>{children}</KennelContext.Provider>;
}

export function useKennels() {
  const context = useContext(KennelContext);

  if (!context) {
    throw new Error('useKennels must be used inside KennelProvider.');
  }

  return context;
}

function getActiveKennelStorageKey(profileId: string) {
  return `${activeKennelStoragePrefix}.${profileId}`;
}

function getErrorMessage(_error: unknown) {
  return 'Algo ha ido mal al cargar los criaderos.';
}
