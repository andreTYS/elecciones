import { Rol } from '@prisma/client';

// Jerarquia en cascada: nivel superior accede a TODO lo del inferior
export const ROLE_LEVEL: Record<Rol, number> = {
  SUPER_ADMIN: 4,
  ADMIN_MORTAL: 3,
  COORDINADOR: 2,
  PERSONERO: 1,
};

export function nivel(rol: Rol): number {
  return ROLE_LEVEL[rol];
}

// Catalogo de modulos asignables en cascada
export const MODULOS_DISPONIBLES = [
  'usuarios',
  'candidatos',
  'actas',
  'incidencias',
  'alimentacion',
  'certificados',
  'metricas',
  'dashboard',
  'urgencias',
  'export',
  'mesas',
] as const;

export type Modulo = (typeof MODULOS_DISPONIBLES)[number];
