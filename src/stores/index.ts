import { create } from 'zustand';

interface AppState {
  activeKennelId: string | null;
  setActiveKennelId: (kennelId: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeKennelId: null,
  setActiveKennelId: (activeKennelId) => set({ activeKennelId }),
}));
