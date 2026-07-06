import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Datos inválidos', detalles: err.flatten().fieldErrors });
  }
  const message = err instanceof Error ? err.message : 'Error desconocido';
  logger.error(`Error no controlado: ${message}`);
  return res.status(500).json({ error: 'Error interno del servidor' });
}
