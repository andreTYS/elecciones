import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { authenticate } from '../../middlewares/auth';
import { requireRole } from '../../middlewares/rbac';
import { emitUrgenciaNueva } from '../../services/socket.service';
import { audit } from '../../utils/audit';

const router = Router();
router.use(authenticate);

// POST /api/urgencias → crear (Admin Mortal; Super tambien puede)
router.post('/', requireRole(['ADMIN_MORTAL', 'SUPER_ADMIN']), async (req: Request, res: Response) => {
  const { tipo, detalle } = z.object({ tipo: z.string().min(2), detalle: z.string().min(5) }).parse(req.body);
  const urgencia = await prisma.urgencia.create({ data: { tipo, detalle, emisorId: req.user!.id } });

  emitUrgenciaNueva({
    id: urgencia.id,
    tipo,
    detalle,
    emisor: req.user!.nombre,
    hora: urgencia.createdAt.toISOString(),
  });
  await audit({ userId: req.user!.id, accion: 'CREATE', entidad: 'Urgencia', entidadId: urgencia.id, ip: req.ip });
  return res.status(201).json({ urgencia });
});

// GET /api/urgencias → listar (Admin Super; Admin Mortal ve las propias)
router.get('/', requireRole(['ADMIN_MORTAL', 'SUPER_ADMIN']), async (req: Request, res: Response) => {
  const me = req.user!;
  const where = me.rol === 'SUPER_ADMIN' ? {} : { emisorId: me.id };
  const urgencias = await prisma.urgencia.findMany({ where, orderBy: [{ resuelta: 'asc' }, { createdAt: 'desc' }] });
  return res.json({ urgencias });
});

// PUT /api/urgencias/:id → resolver (Admin Super)
router.put('/:id', requireRole(['SUPER_ADMIN']), async (req: Request, res: Response) => {
  const urgencia = await prisma.urgencia.update({
    where: { id: Number(req.params.id) },
    data: { resuelta: true },
  });
  await audit({ userId: req.user!.id, accion: 'RESOLVER', entidad: 'Urgencia', entidadId: urgencia.id, ip: req.ip });
  return res.json({ urgencia });
});

export default router;
