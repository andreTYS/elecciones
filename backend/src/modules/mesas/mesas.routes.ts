import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { authenticate } from '../../middlewares/auth';
import { requireMinLevel } from '../../middlewares/rbac';
import { emitMesaEstado, emitStatsUpdate } from '../../services/socket.service';
import { audit } from '../../utils/audit';
import { nivel } from '../../utils/roles';

const router = Router();
router.use(authenticate);

const mesaInclude = {
  centroVotacion: {
    select: { id: true, nombre: true, codigo: true, distrito: { select: { id: true, nombre: true } } },
  },
  personero: { select: { id: true, nombre: true } },
  actas: { select: { id: true, estadoOCR: true, confirmada: true } },
} as const;

// GET /api/mesas → filtrado por permisos del rol
router.get('/', async (req: Request, res: Response) => {
  const me = req.user!;
  let where: Prisma.MesaWhereInput = {};

  if (me.rol === 'PERSONERO') {
    where = { personeroId: me.id };
  } else if (me.rol === 'COORDINADOR') {
    where = { centroVotacion: { coordinadorId: me.id } };
  } else {
    // Admins: filtros opcionales
    const { centroId, distritoId } = req.query;
    if (centroId) where.centroVotacionId = Number(centroId);
    if (distritoId) where.centroVotacion = { distritoId: Number(distritoId) };
  }

  const mesas = await prisma.mesa.findMany({ where, include: mesaInclude, orderBy: { numero: 'asc' } });
  return res.json({ mesas });
});

// PUT /api/mesas/:id/estado → confirmar instalacion (Personero de la mesa)
router.put('/:id/estado', async (req: Request, res: Response) => {
  const me = req.user!;
  const { instalada } = z.object({ instalada: z.boolean() }).parse(req.body);
  const id = Number(req.params.id);

  const mesa = await prisma.mesa.findUnique({ where: { id }, include: mesaInclude });
  if (!mesa) return res.status(404).json({ error: 'Mesa no encontrada' });
  if (me.rol === 'PERSONERO' && mesa.personeroId !== me.id) {
    return res.status(403).json({ error: 'No eres el personero de esta mesa' });
  }

  const hora = new Date();
  const updated = await prisma.mesa.update({
    where: { id },
    data: { estadoInstalada: instalada, horaConfirmacion: hora },
    include: mesaInclude,
  });

  emitMesaEstado({
    mesaId: id,
    numero: updated.numero,
    instalada,
    personero: me.nombre,
    local: updated.centroVotacion.nombre,
    distrito: updated.centroVotacion.distrito.nombre,
    hora: hora.toISOString(),
  });
  void emitStatsUpdate();
  await audit({ userId: me.id, accion: 'MESA_ESTADO', entidad: 'Mesa', entidadId: id, detalle: { instalada }, ip: req.ip });

  return res.json({ mesa: updated });
});

// PUT /api/mesas/:id/personero → asignar personero (Coordinador+)
router.put('/:id/personero', requireMinLevel(2), async (req: Request, res: Response) => {
  const me = req.user!;
  const { personeroId } = z.object({ personeroId: z.number().int().nullable() }).parse(req.body);
  const id = Number(req.params.id);

  const mesa = await prisma.mesa.findUnique({ where: { id }, include: { centroVotacion: true } });
  if (!mesa) return res.status(404).json({ error: 'Mesa no encontrada' });

  // Coordinador: solo mesas de sus locales y personeros bajo su cargo
  if (me.rol === 'COORDINADOR') {
    if (mesa.centroVotacion.coordinadorId !== me.id) {
      return res.status(403).json({ error: 'Mesa fuera de tus locales asignados' });
    }
    if (personeroId) {
      const p = await prisma.user.findUnique({ where: { id: personeroId } });
      if (!p || p.rol !== 'PERSONERO' || p.supervisorId !== me.id) {
        return res.status(403).json({ error: 'Personero no está bajo tu cargo' });
      }
    }
  }

  const updated = await prisma.mesa.update({ where: { id }, data: { personeroId }, include: mesaInclude });
  await audit({ userId: me.id, accion: 'ASIGNAR_PERSONERO', entidad: 'Mesa', entidadId: id, detalle: { personeroId }, ip: req.ip });
  return res.json({ mesa: updated });
});

export default router;

// ── Centros de votacion ────────────────────────────────────────────────────

export const centrosRouter = Router();
centrosRouter.use(authenticate);

// GET /api/centros
centrosRouter.get('/', async (req: Request, res: Response) => {
  const me = req.user!;
  const where: Prisma.CentroVotacionWhereInput =
    me.rol === 'COORDINADOR' ? { coordinadorId: me.id } : {};
  const centros = await prisma.centroVotacion.findMany({
    where,
    include: {
      distrito: { select: { id: true, nombre: true, provincia: { select: { id: true, nombre: true } } } },
      coordinador: { select: { id: true, nombre: true } },
      _count: { select: { mesas: true } },
    },
    orderBy: { nombre: 'asc' },
  });
  return res.json({ centros });
});

// PUT /api/centros/:id/coordinador → asignar local a Coordinador (Admin Mortal+)
centrosRouter.put('/:id/coordinador', requireMinLevel(3), async (req: Request, res: Response) => {
  const { coordinadorId } = z.object({ coordinadorId: z.number().int().nullable() }).parse(req.body);
  if (coordinadorId) {
    const coord = await prisma.user.findUnique({ where: { id: coordinadorId } });
    if (!coord || nivel(coord.rol) !== 2) return res.status(400).json({ error: 'El usuario no es Coordinador' });
  }
  const centro = await prisma.centroVotacion.update({
    where: { id: Number(req.params.id) },
    data: { coordinadorId },
  });
  await audit({ userId: req.user!.id, accion: 'ASIGNAR_LOCAL', entidad: 'CentroVotacion', entidadId: centro.id, detalle: { coordinadorId }, ip: req.ip });
  return res.json({ centro });
});

// GET /api/centros/geo → arbol Region→Provincia→Distrito para filtros
centrosRouter.get('/geo', async (_req: Request, res: Response) => {
  const regiones = await prisma.region.findMany({
    include: { provincias: { include: { distritos: { select: { id: true, nombre: true, ubigeo: true } } } } },
  });
  return res.json({ regiones });
});
