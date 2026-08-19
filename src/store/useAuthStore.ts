import { create } from 'zustand';
import { User, AuthService } from '../services/auth.service';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  login: (u: string, p: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  updateAvatar: (avatarPath: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  login: async (username, password) => {
    const user = await AuthService.login(username, password);
    if (user) {
      set({ user });
      return true;
    }
    return false;
  },
  logout: async () => {
    await AuthService.logout();
    set({ user: null });
  },
  checkSession: async () => {
    set({ isLoading: true });
    const user = await AuthService.getCurrentUser();
    set({ user, isLoading: false });
  },
  updateAvatar: async (avatarPath: string) => {
    const currentUser = get().user;
    if (currentUser) {
      set({ user: { ...currentUser, avatar_path: avatarPath } });
    }
  },
}));
