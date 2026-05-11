import { useKennels } from './KennelProvider';

export function useRequireKennel() {
  const { currentWorkspace, isKennelLoading } = useKennels();

  if (!currentWorkspace) {
    throw new Error(
      isKennelLoading
        ? 'The current kennel is still loading.'
        : 'A current kennel is required before using this feature.',
    );
  }

  return currentWorkspace;
}
