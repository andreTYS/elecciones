import rateLimit from 'express-rate-limit';
import { Request } from 'express';

const keyByUserOrIp = (req: Request) => (req.user ? `u:${req.user.id}` : `ip:${req.ip}`);

export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes, intenta más tarde' },
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de login. Espera 15 minutos' },
});

export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: keyByUserOrIp,
  message: { error: 'Límite de subida de actas alcanzado (10/hora)' },
});

export const geminiKeyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  keyGenerator: keyByUserOrIp,
  message: { error: 'Límite de cambios de API Key alcanzado (3/hora)' },
});

export const exportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyGenerator: keyByUserOrIp,
  message: { error: 'Límite de exportación alcanzado (5/hora)' },
});
