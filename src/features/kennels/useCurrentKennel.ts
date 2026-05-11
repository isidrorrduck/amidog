import { useKennels } from './KennelProvider';

export function useCurrentKennel() {
  const { currentKennel, currentMembership, currentWorkspace, isKennelLoading, kennelError } = useKennels();

  return {
    currentKennel,
    currentMembership,
    currentWorkspace,
    isKennelLoading,
    kennelError,
  };
}
