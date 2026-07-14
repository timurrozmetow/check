import { create } from "zustand";
import type { User } from "@/api/types";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  /** true, пока не выполнена первичная попытка refresh при загрузке приложения */
  initializing: boolean;
  setAuth: (user: User, accessToken: string) => void;
  /** Обновить данные текущего пользователя (напр. после смены аватара). */
  setUser: (user: User) => void;
  setInitialized: () => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  initializing: true,
  setAuth: (user, accessToken) => set({ user, accessToken }),
  setUser: (user) => set({ user }),
  setInitialized: () => set({ initializing: false }),
  clear: () => set({ user: null, accessToken: null }),
}));
