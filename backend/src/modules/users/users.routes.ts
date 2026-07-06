import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Rol } from '@prisma/client';
import { prisma } from '../../config/database';
import { authenticate } from '../../middlewares/auth';
import { requireMinLevel } from '../../middlewares/rbac';
import { getSubtreeIds, requireTargetInSubtree } from '../../middlewares/cascade';
import { nivel, MODULOS_DISPONIBLES } from '../../utils/roles';
import { audit } from '../../utils/audit';

const router = Router();
router.use(authenticate, requireMinLevel(2)); // Coordinador+ gestiona usuarios

const userSelect = {
  id: true, nombre: true, dni: true, email: true, username: true, rol: true,
  activo: true, colorPartido: true, numeroPartido: true, distritoId: true,
  supervisorId: true, modulosPermitidos: true, createdAt: true,
  distrito: { select: { id: true, nombre: true } },
  supervisor: { select: { id: true, nombre: true, rol: true } },
} as const;

// GET /api/users → lista segun jerarquia del solicitante
router.get('/', async (req: Request, res: Response) => {
  const me = req.user!;
  const where =
    me.rol === 'SUPER_ADMIN'
      ? {}
      : { id: { in: await getSubtreeIds(me.id, false) } };
  const users = await prisma.user.findMany({ where, select: userSelect, orderBy: { id: 'asc' } });
  return res.json({ users });
});

// GET /api/users/modulos-disponibles → catalogo de modulos
router.get('/modulos-disponibles', (_req, res) => res.json({ modulos: MODULOS_DISPONIBLES }));

const createSchema = z.object({
  nombre: z.string().min(2),
  dni: z.string().regex(/^\d{8}$/).optional(),
  email: z.string().email().optional(),
  username: z.string().min(3).regex(/^[a-zA-Z0-9_.-]+$/),
  password: z.string().min(8),
  rol: z.nativeEnum(Rol),
  colorPartido: z.string().optional(),
  numeroPartido: z.number().int().optional(),
  distritoId: z.number().int().optional(),
  supervisorId: z.number().int().optional(),
  modulosPermitidos: z.array(z.enum(MODULOS_DISPONIBLES)).optional(),
});

// POST /api/users → crear usuario de nivel inferior al propio
router.post('/', async (req: Request, res: Response) => {
  const me = req.user!;
  const data = createSchema.parse(req.body);

  if (nivel(data.rol) >= nivel(me.rol)) {
    return res.status(403).json({ error: 'Solo puedes crear usuarios de nivel inferior al tuyo' });
  }

  // supervisor por defecto: el creador; si se especifica, debe estar en su jerarquia
  let supervisorId = data.supervisorId ?? me.id;
  if (data.supervisorId && me.rol !== 'SUPER_ADMIN') {
    const subtree = await getSubtreeIds(me.id, true);
    if (!subtree.includes(data.supervisorId)) {
      return res.status(403).json({ error: 'Supervisor fuera de tu jerarquía' });
    }
  }
  const supervisor = await prisma.user.findUnique({ where: { id: supervisorId } });
  if (!supervisor || nivel(supervisor.rol) <= nivel(data.rol)) {
    return res.status(400).json({ error: 'El supervisor debe ser de nivel superior al usuario creado' });
  }

  const user = await prisma.user.create({
    data: {
      nombre: data.nombre,
      dni: data.dni,
      email: data.email,
      username: data.username,
      passwordHash: await bcrypt.hash(data.password, 12),
      rol: data.rol,
      colorPartido: data.colorPartido,
      numeroPartido: data.numeroPartido,
      distritoId: data.distritoId,
      supervisorId,
      modulosPermitidos: data.modulosPermitidos ?? undefined,
    },
    select: userSelect,
  });

  await audit({ userId: me.id, accion: 'CREATE', entidad: 'User', entidadId: user.id, ip: req.ip });
  return res.status(201).json({ user });
});

const updateSchema = createSchema.partial().omit({ rol: true, username: true });

// PUT /api/users/:id
router.put('/:id', requireTargetInSubtree(), async (req: Request, res: Response) => {
  const data = updateSchema.parse(req.body);
  const { password, modulosPermitidos, supervisorId, ...rest } = data;

  const user = await prisma.user.update({
    where: { id: Number(req.params.id) },
    data: {
      ...rest,
      ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}),
    },
    select: userSelect,
  });

  await audit({ userId: req.user!.id, accion: 'UPDATE', entidad: 'User', entidadId: user.id, ip: req.ip });
  return res.json({ user });
});

// DELETE /api/users/:id → desactivar (soft delete)
router.delete('/:id', requireTargetInSubtree(), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  await prisma.user.update({ where: { id }, data: { activo: false } });
  await prisma.sesion.deleteMany({ where: { userId: id } });
  await audit({ userId: req.user!.id, accion: 'DEACTIVATE', entidad: 'User', entidadId: id, ip: req.ip });
  return res.json({ success: true });
});

// GET /api/users/:id/modulos
router.get('/:id/modulos', requireTargetInSubtree(), async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: Number(req.params.id) },
    select: { id: true, modulosPermitidos: true },
  });
  return res.json({ modulos: user?.modulosPermitidos ?? [] });
});

// PUT /api/users/:id/modulos → asignar modulos (nivel superior al usuario)
router.put('/:id/modulos', requireTargetInSubtree(), async (req: Request, res: Response) => {
  const { modulos } = z.object({ modulos: z.array(z.enum(MODULOS_DISPONIBLES)) }).parse(req.body);
  const user = await prisma.user.update({
    where: { id: Number(req.params.id) },
    data: { modulosPermitidos: modulos },
    select: { id: true, modulosPermitidos: true },
  });
  await audit({ userId: req.user!.id, accion: 'SET_MODULOS', entidad: 'User', entidadId: user.id, detalle: { modulos }, ip: req.ip });
  return res.json({ modulos: user.modulosPermitidos });
});

export default router;
