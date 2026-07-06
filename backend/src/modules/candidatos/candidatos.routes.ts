import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { authenticate } from '../../middlewares/auth';
import { requireRole } from '../../middlewares/rbac';
import { audit } from '../../utils/audit';

const router = Router();
router.use(authenticate);

// GET /api/candidatos → todos los roles autenticados (necesario para revisar actas)
router.get('/', async (_req: Request, res: Response) => {
  const candidatos = await prisma.candidato.findMany({
    where: { activo: true },
    orderBy: { numero: 'asc' },
  });
  return res.json({ candidatos });
});

// Escritura: SOLO Admin Super
const candidatoSchema = z.object({
  nombre: z.string().min(2),
  agrupacion: z.string().min(2),
  numero: z.number().int().min(1),
  color: z.string().regex(/^#?[0-9a-fA-F]{6}$/).default('1B3A6B'),
});

router.post('/', requireRole(['SUPER_ADMIN']), async (req: Request, res: Response) => {
  const data = candidatoSchema.parse(req.body);
  const candidato = await prisma.candidato.create({ data: { ...data, color: data.color.replace('#', '') } });
  await audit({ userId: req.user!.id, accion: 'CREATE', entidad: 'Candidato', entidadId: candidato.id, ip: req.ip });
  return res.status(201).json({ candidato });
});

router.put('/:id', requireRole(['SUPER_ADMIN']), async (req: Request, res: Response) => {
  const data = candidatoSchema.partial().parse(req.body);
  const candidato = await prisma.candidato.update({
    where: { id: Number(req.params.id) },
    data: { ...data, ...(data.color ? { color: data.color.replace('#', '') } : {}) },
  });
  await audit({ userId: req.user!.id, accion: 'UPDATE', entidad: 'Candidato', entidadId: candidato.id, ip: req.ip });
  return res.json({ candidato });
});

router.delete('/:id', requireRole(['SUPER_ADMIN']), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  await prisma.candidato.update({ where: { id }, data: { activo: false } });
  await audit({ userId: req.user!.id, accion: 'DEACTIVATE', entidad: 'Candidato', entidadId: id, ip: req.ip });
  return res.json({ success: true });
});

export default router;
