import { create } from "zustand";

interface User {
  id: string;
  name: string;
  role: "USER" | "ADMIN";
  avatar: string | null;
}

interface AppState {
  user: User | null;
  setUser: (user: User | null) => void;
  aiDrawerOpen: boolean;
  toggleAiDrawer: () => void;
  setAiDrawerOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  aiDrawerOpen: false,
  toggleAiDrawer: () => set((s) => ({ aiDrawerOpen: !s.aiDrawerOpen })),
  setAiDrawerOpen: (open) => set({ aiDrawerOpen: open }),
}));
