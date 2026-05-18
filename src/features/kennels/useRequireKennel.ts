import { useKennels } from './KennelProvider';

export function useRequireKennel() {
  const { currentWorkspace, isKennelLoading } = useKennels();

  if (!currentWorkspace) {
    throw new Error(
      isKennelLoading
        ? 'El criadero actual todavía se está cargando.'
        : 'Necesitas un criadero activo antes de usar esta función.',
    );
  }

  return currentWorkspace;
}
