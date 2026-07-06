import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { prisma } from '../config/database';

let io: Server | null = null;

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: env.CORS_ORIGIN.split(','), credentials: true },
    path: '/socket.io',
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) return next(new Error('Token requerido'));
      const payload = verifyAccessToken(token);
      socket.data.user = payload;
      return next();
    } catch {
      return next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as { sub: number; rol: string; nombre: string };
    socket.join('global');
    switch (user.rol) {
      case 'SUPER_ADMIN':
        socket.join(['super', 'admins']);
        break;
      case 'ADMIN_MORTAL':
        socket.join('admins');
        break;
      case 'COORDINADOR':
        socket.join(`coordinador:${user.sub}`);
        break;
    }
    logger.debug(`Socket conectado: ${user.nombre} (${user.rol})`);
  });

  return io;
}

export function getIO(): Server {
  if (!io) throw new Error('Socket.IO no inicializado');
  return io;
}

// ── Emisores de eventos ────────────────────────────────────────────────────

export function emitActaConfirmada(payload: object) {
  getIO().to('global').emit('acta:confirmada', payload);
}

export function emitIncidenciaNueva(coordinadorId: number | null, payload: object) {
  const io = getIO();
  if (coordinadorId) io.to(`coordinador:${coordinadorId}`).emit('incidencia:nueva', payload);
  io.to('admins').to('super').emit('incidencia:nueva', payload);
}

export function emitMesaEstado(payload: object) {
  getIO().to('global').emit('mesa:estado', payload);
}

export function emitUrgenciaNueva(payload: object) {
  getIO().to('super').emit('urgencia:nueva', payload);
}

export async function emitStatsUpdate() {
  try {
    const [totalMesas, mesasInstaladas, actasConfirmadas, incidencias, votos] = await Promise.all([
      prisma.mesa.count(),
      prisma.mesa.count({ where: { estadoInstalada: true } }),
      prisma.acta.count({ where: { confirmada: true } }),
      prisma.incidencia.count({ where: { resuelta: false } }),
      prisma.votoActa.aggregate({ _sum: { votos: true }, where: { acta: { confirmada: true } } }),
    ]);
    getIO().to('global').emit('stats:update', {
      totalMesas,
      mesasInstaladas,
      actasConfirmadas,
      totalVotos: votos._sum.votos ?? 0,
      pctAvance: totalMesas > 0 ? Math.round((actasConfirmadas / totalMesas) * 100) : 0,
      incidencias,
    });
  } catch (e) {
    logger.warn(`stats:update falló: ${(e as Error).message}`);
  }
}
