import { Request, Response, NextFunction } from 'express';
import { Rol } from '@prisma/client';
import { verifyAccessToken } from '../utils/jwt';
import { redis } from '../config/redis';

export interface AuthUser {
  id: number;
  rol: Rol;
  nombre: string;
  jti: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : (req.query.token as string | undefined);
    if (!token) return res.status(401).json({ error: 'Token requerido' });

    const payload = verifyAccessToken(token);

    // Blacklist en Redis (tokens revocados por logout)
    const blacklisted = await redis.get(`bl:${payload.jti}`).catch(() => null);
    if (blacklisted) return res.status(401).json({ error: 'Token revocado' });

    req.user = { id: payload.sub, rol: payload.rol, nombre: payload.nombre, jti: payload.jti };
    return next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}
