import { useAuth } from './useAuth';

/** Control de acceso en cascada: nivel >= minimo requerido */
export function useRBAC() {
  const { user, nivel } = useAuth();

  const canAccess = (minLevel: number) => nivel >= minLevel;

  const hasModulo = (modulo: string) => {
    if (!user) return false;
    if (user.rol === 'SUPER_ADMIN') return true;
    const mods = user.modulosPermitidos;
    // Sin restriccion configurada → acceso segun nivel
    if (!mods || !Array.isArray(mods) || mods.length === 0) return true;
    return mods.includes(modulo);
  };

  return { canAccess, hasModulo, nivel, rol: user?.rol };
}
