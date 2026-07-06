import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Rol = 'SUPER_ADMIN' | 'ADMIN_MORTAL' | 'COORDINADOR' | 'PERSONERO';

export const ROLE_LEVEL: Record<Rol, number> = {
  SUPER_ADMIN: 4,
  ADMIN_MORTAL: 3,
  COORDINADOR: 2,
  PERSONERO: 1,
};

export interface AuthUser {
  id: number;
  nombre: string;
  username: string;
  rol: Rol;
  distritoId?: number | null;
  modulosPermitidos?: string[] | null;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  setSession: (token: string, user: AuthUser) => void;
  setAccessToken: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      setSession: (accessToken, user) => set({ accessToken, user }),
      setAccessToken: (accessToken) => set({ accessToken }),
      logout: () => set({ accessToken: null, user: null }),
    }),
    { name: 'vc-auth', partialize: (s) => ({ user: s.user }) } // el token vive solo en memoria
  )
);

export function useAuth() {
  const { user, accessToken, logout } = useAuthStore();
  const nivel = user ? ROLE_LEVEL[user.rol] : 0;
  return { user, accessToken, nivel, logout, isAuth: !!user };
}
