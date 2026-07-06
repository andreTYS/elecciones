import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { globalLimiter } from './middlewares/rateLimiter';
import { errorHandler } from './middlewares/errorHandler';

import authRoutes from './modules/auth/auth.routes';
import configRoutes from './modules/config/config.routes';
import usersRoutes from './modules/users/users.routes';
import candidatosRoutes from './modules/candidatos/candidatos.routes';
import mesasRoutes, { centrosRouter } from './modules/mesas/mesas.routes';
import actasRoutes from './modules/actas/actas.routes';
import incidenciasRoutes from './modules/incidencias/incidencias.routes';
import alimentacionRoutes from './modules/alimentacion/alimentacion.routes';
import certificadosRoutes from './modules/certificados/certificados.routes';
import metricasRoutes from './modules/metricas/metricas.routes';
import urgenciasRoutes from './modules/urgencias/urgencias.routes';
import exportRoutes from './modules/export/export.routes';
import uploadsRoutes from './modules/uploads/uploads.routes';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1); // detras de Traefik
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN.split(','), credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use('/api', globalLimiter);

  app.get('/api/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

  app.use('/api/auth', authRoutes);
  app.use('/api/config', configRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/candidatos', candidatosRoutes);
  app.use('/api/mesas', mesasRoutes);
  app.use('/api/centros', centrosRouter);
  app.use('/api/actas', actasRoutes);
  app.use('/api/incidencias', incidenciasRoutes);
  app.use('/api/alimentacion', alimentacionRoutes);
  app.use('/api/certificados', certificadosRoutes);
  app.use('/api/metricas', metricasRoutes);
  app.use('/api/urgencias', urgenciasRoutes);
  app.use('/api/export', exportRoutes);
  app.use('/api/uploads', uploadsRoutes);

  app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
  app.use(errorHandler);

  return app;
}
