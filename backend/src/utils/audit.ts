import { prisma } from '../config/database';
import { logger } from './logger';

export async function audit(params: {
  userId?: number;
  accion: string;
  entidad: string;
  entidadId?: number;
  detalle?: object;
  ip?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        accion: params.accion,
        entidad: params.entidad,
        entidadId: params.entidadId,
        detalle: params.detalle as object | undefined,
        ip: params.ip,
      },
    });
  } catch (e) {
    logger.warn(`AuditLog falló: ${(e as Error).message}`);
  }
}
