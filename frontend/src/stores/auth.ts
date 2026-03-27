import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  companyName?: string;
  subscriptionStatus: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED';
  trialEndsAt?: string;
  subscriptionEndsAt?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  refresh: () => Promise<string | null>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      setAuth: (user, accessToken, refreshToken) => {
        set({ user, accessToken, refreshToken });
      },

      logout: () => {
        const { refreshToken } = get();
        if (refreshToken) {
          axios.post('/api/auth/logout', { refreshToken }).catch(() => {});
        }
        set({ user: null, accessToken: null, refreshToken: null });
      },

      refresh: async () => {
        const { refreshToken } = get();
        if (!refreshToken) {
          set({ user: null, accessToken: null, refreshToken: null });
          return null;
        }
        try {
          const res = await axios.post('/api/auth/refresh', { refreshToken });
          set({
            accessToken: res.data.accessToken,
            refreshToken: res.data.refreshToken,
          });
          return res.data.accessToken as string;
        } catch {
          set({ user: null, accessToken: null, refreshToken: null });
          return null;
        }
      },
    }),
    {
      name: 'truckguard-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    },
  ),
);
