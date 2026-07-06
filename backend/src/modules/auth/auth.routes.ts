import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { signAccessToken, newRefreshToken } from '../../utils/jwt';
import { sha256 } from '../../utils/crypto';
import { loginLimiter } from '../../middlewares/rateLimiter';
import { authenticate } from '../../middlewares/auth';
import { audit } from '../../utils/audit';
import { env, isProd } from '../../config/env';

const router = Router();

const REFRESH_COOKIE = 'vc_refresh';
const refreshCookieOpts = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'strict' as const,
  path: '/api/auth',
  maxAge: env.REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
};

async function issueSession(userId: number, ip?: string) {
  const refresh = newRefreshToken();
  await prisma.sesion.create({
    data: {
      userId,
      refreshToken: sha256(refresh),
      ip,
      expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000),
    },
  });
  return refresh;
}

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  const { username, password } = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !user.activo) return res.status(401).json({ error: 'Credenciales inválidas' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

  const { token: accessToken } = signAccessToken(user);
  const refresh = await issueSession(user.id, req.ip);
  res.cookie(REFRESH_COOKIE, refresh, refreshCookieOpts);

  await audit({ userId: user.id, accion: 'LOGIN', entidad: 'Sesion', ip: req.ip });

  return res.json({
    accessToken,
    user: {
      id: user.id,
      rol: user.rol,
      nombre: user.nombre,
      username: user.username,
      distritoId: user.distritoId,
      modulosPermitidos: user.modulosPermitidos,
    },
  });
});

// POST /api/auth/refresh — rotacion one-time-use
router.post('/refresh', async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (!token) return res.status(401).json({ error: 'Refresh token requerido' });

  const hashed = sha256(token);
  const sesion = await prisma.sesion.findUnique({ where: { refreshToken: hashed }, include: { user: true } });

  if (!sesion || sesion.expiresAt < new Date() || !sesion.user.activo) {
    res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
    return res.status(401).json({ error: 'Sesión expirada' });
  }

  // rotacion: invalidar el token usado y emitir uno nuevo
  await prisma.sesion.delete({ where: { id: sesion.id } });
  const refresh = await issueSession(sesion.userId, req.ip);
  res.cookie(REFRESH_COOKIE, refresh, refreshCookieOpts);

  const { token: accessToken } = signAccessToken(sesion.user);
  return res.json({ accessToken });
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (token) await prisma.sesion.deleteMany({ where: { refreshToken: sha256(token) } });
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });

  // blacklist del access token vigente (15 min TTL)
  await redis.setex(`bl:${req.user!.jti}`, 15 * 60, '1').catch(() => undefined);
  await audit({ userId: req.user!.id, accion: 'LOGOUT', entidad: 'Sesion', ip: req.ip });

  return res.json({ success: true });
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true, nombre: true, username: true, rol: true, distritoId: true,
      modulosPermitidos: true, colorPartido: true, numeroPartido: true,
    },
  });
  return res.json({ user });
});

export default router;
