import { Request, Response, NextFunction } from 'express';
import { Rol } from '@prisma/client';
import { nivel } from '../utils/roles';

// Solo estos roles exactos
export function requireRole(roles: Rol[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });
    if (!roles.includes(req.user.rol)) return res.status(403).json({ error: 'Permiso denegado' });
    return next();
  };
}

// Cascada: cualquier rol con nivel >= al minimo requerido
export function requireMinLevel(minLevel: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });
    if (nivel(req.user.rol) < minLevel) return res.status(403).json({ error: 'Nivel insuficiente' });
    return next();
  };
}
