import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { authenticate } from '../../middlewares/auth';
import { requireMinLevel } from '../../middlewares/rbac';
import { getSubtreeIds } from '../../middlewares/cascade';
import { audit } from '../../utils/audit';

const router = Router();
router.use(authenticate);

// POST /api/alimentacion → registrar refrigerio (Personero, hora automatica)
router.post('/', async (req: Request, res: Response) => {
  const me = req.user!;
  const { tipo } = z.object({ tipo: z.enum(['desayuno', 'almuerzo', 'cena']) }).parse(req.body);

  const existente = await prisma.alimentacion.findUnique({
    where: { userId_tipo: { userId: me.id, tipo } },
  });
  if (existente) return res.status(409).json({ error: `Ya registraste tu ${tipo}` });

  const registro = await prisma.alimentacion.create({ data: { userId: me.id, tipo } });
  await audit({ userId: me.id, accion: 'REGISTRO_ALIMENTACION', entidad: 'Alimentacion', entidadId: registro.id, detalle: { tipo }, ip: req.ip });
  return res.status(201).json({ registro });
});

// GET /api/alimentacion → propio (personero), del equipo (coordinador+), todos (admin)
router.get('/', async (req: Request, res: Response) => {
  const me = req.user!;
  let where: Prisma.AlimentacionWhereInput = {};
  if (me.rol === 'PERSONERO') where = { userId: me.id };
  else if (me.rol === 'COORDINADOR') where = { userId: { in: await getSubtreeIds(me.id, true) } };

  const registros = await prisma.alimentacion.findMany({
    where,
    include: { user: { select: { id: true, nombre: true, rol: true } } },
    orderBy: { hora: 'desc' },
  });
  return res.json({ registros });
});

// GET /api/alimentacion/panel → resumen por personero (Coordinador+)
router.get('/panel', requireMinLevel(2), async (req: Request, res: Response) => {
  const me = req.user!;
  const userIds = me.rol === 'COORDINADOR' ? await getSubtreeIds(me.id, false) : undefined;

  const personeros = await prisma.user.findMany({
    where: { rol: 'PERSONERO', activo: true, ...(userIds ? { id: { in: userIds } } : {}) },
    select: {
      id: true, nombre: true,
      alimentacion: { select: { tipo: true, hora: true } },
      mesasAsignadas: { select: { numero: true } },
    },
    orderBy: { nombre: 'asc' },
  });

  const panel = personeros.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    mesa: p.mesasAsignadas[0]?.numero ?? null,
    desayuno: p.alimentacion.find((a) => a.tipo === 'desayuno')?.hora ?? null,
    almuerzo: p.alimentacion.find((a) => a.tipo === 'almuerzo')?.hora ?? null,
    cena: p.alimentacion.find((a) => a.tipo === 'cena')?.hora ?? null,
  }));
  return res.json({ panel });
});

export default router;
