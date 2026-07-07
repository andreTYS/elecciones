import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Prisma, Severidad } from '@prisma/client';
import { prisma } from '../../config/database';
import { authenticate } from '../../middlewares/auth';
import { requireMinLevel } from '../../middlewares/rbac';
import { getSubtreeIds } from '../../middlewares/cascade';
import { emitIncidenciaNueva, emitStatsUpdate } from '../../services/socket.service';
import { audit } from '../../utils/audit';

const router = Router();
router.use(authenticate);

const crearSchema = z.object({
  tipo: z.string().min(2),
  descripcion: z.string().min(5),
  severidad: z.nativeEnum(Severidad).default('MEDIA'),
});

// POST /api/incidencias → crear (Personero, disponible en todo momento)
router.post('/', async (req: Request, res: Response) => {
  const me = req.user!;
  const data = crearSchema.parse(req.body);

  const personero = await prisma.user.findUnique({ where: { id: me.id } });
  if (!personero) return res.status(401).json({ error: 'Usuario no encontrado' });

  const incidencia = await prisma.incidencia.create({
    data: {
      tipo: data.tipo,
      descripcion: data.descripcion,
      severidad: data.severidad,
      personeroId: me.id,
      coordinadorId: personero.supervisorId, // llega al coordinador a cargo
    },
    include: { personero: { select: { nombre: true, mesasAsignadas: { select: { numero: true, centroVotacion: { select: { nombre: true, distrito: { select: { nombre: true } } } } } } } } },
  });

  const mesa = incidencia.personero.mesasAsignadas[0];
  emitIncidenciaNueva(personero.supervisorId, {
    id: incidencia.id,
    tipo: incidencia.tipo,
    descripcion: incidencia.descripcion,
    severidad: incidencia.severidad,
    personero: incidencia.personero.nombre,
    mesa: mesa?.numero ?? null,
    distrito: mesa?.centroVotacion.distrito.nombre ?? null,
    hora: incidencia.createdAt.toISOString(),
  });
  void emitStatsUpdate();
  await audit({ userId: me.id, accion: 'CREATE', entidad: 'Incidencia', entidadId: incidencia.id, ip: req.ip });

  return res.status(201).json({ incidencia });
});

// GET /api/incidencias → Coordinador ve las suyas, Admin ve todas
router.get('/', requireMinLevel(2), async (req: Request, res: Response) => {
  const me = req.user!;
  let where: Prisma.IncidenciaWhereInput = {};
  if (me.rol === 'COORDINADOR') {
    where = {
      OR: [{ coordinadorId: me.id }, { personeroId: { in: await getSubtreeIds(me.id, false) } }],
    };
  }
  const incidencias = await prisma.incidencia.findMany({
    where,
    include: {
      personero: { select: { id: true, nombre: true } },
      coordinador: { select: { id: true, nombre: true } },
    },
    orderBy: [{ resuelta: 'asc' }, { createdAt: 'desc' }],
  });
  return res.json({ incidencias });
});

// PUT /api/incidencias/:id/resolver → Coordinador+
router.put('/:id/resolver', requireMinLevel(2), async (req: Request, res: Response) => {
  const me = req.user!;
  const id = Number(req.params.id);

  const incidencia = await prisma.incidencia.findUnique({ where: { id } });
  if (!incidencia) return res.status(404).json({ error: 'Incidencia no encontrada' });
  if (me.rol === 'COORDINADOR' && incidencia.coordinadorId !== me.id) {
    return res.status(403).json({ error: 'Incidencia fuera de tu jerarquía' });
  }

  const updated = await prisma.incidencia.update({ where: { id }, data: { resuelta: true } });
  void emitStatsUpdate();
  await audit({ userId: me.id, accion: 'RESOLVER', entidad: 'Incidencia', entidadId: id, ip: req.ip });
  return res.json({ incidencia: updated });
});

export default router;
