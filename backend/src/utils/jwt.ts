import jwt from 'jsonwebtoken';
import { Rol } from '@prisma/client';
import { env } from '../config/env';
import { randomToken } from './crypto';

export interface AccessPayload {
  sub: number;
  rol: Rol;
  nombre: string;
  jti: string;
}

export function signAccessToken(user: { id: number; rol: Rol; nombre: string }): { token: string; jti: string } {
  const jti = randomToken(16);
  const token = jwt.sign(
    { sub: user.id, rol: user.rol, nombre: user.nombre, jti },
    env.JWT_SECRET,
    { expiresIn: env.ACCESS_TOKEN_TTL as jwt.SignOptions['expiresIn'] }
  );
  return { token, jti };
}

export function verifyAccessToken(token: string): AccessPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
  return {
    sub: Number(decoded.sub),
    rol: decoded.rol as Rol,
    nombre: decoded.nombre as string,
    jti: decoded.jti as string,
  };
}

// Refresh token: opaco (no JWT), one-time-use, se guarda hash sha256 en Sesion
export function newRefreshToken(): string {
  return randomToken(48);
}
