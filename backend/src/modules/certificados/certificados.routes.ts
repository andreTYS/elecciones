import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { authenticate } from '../../middlewares/auth';
import { requireMinLevel } from '../../middlewares/rbac';
import { getSubtreeIds } from '../../middlewares/cascade';
import { generarCertificadoPDF } from '../../services/cert.service';
import { audit } from '../../utils/audit';

const router = Router();
router.use(authenticate);

// POST /api/certificados/:userId → generar PDF (Coordinador+, para su personero)
router.post('/:userId', requireMinLevel(2), async (req: Request, res: Response) => {
  const me = req.user!;
  const userId = Number(req.params.userId);

  const personero = await prisma.user.findUnique({
    where: { id: userId },
    include: { mesasAsignadas: { include: { centroVotacion: true } } },
  });
  if (!personero || personero.rol !== 'PERSONERO') {
    return res.status(404).json({ error: 'Personero no encontrado' });
  }
  if (me.rol === 'COORDINADOR') {
    const subtree = await getSubtreeIds(me.id, false);
    if (!subtree.includes(userId)) return res.status(403).json({ error: 'Personero fuera de tu cargo' });
  }

  const mesa = personero.mesasAsignadas[0];
  const pdfUrl = await generarCertificadoPDF({
    nombrePersonero: personero.nombre,
    dni: personero.dni,
    mesa: mesa?.numero,
    local: mesa?.centroVotacion.nombre,
    emitidoPor: me.nombre,
  });

  const cert = await prisma.certificado.create({
    data: { userId, pdfUrl, emitidoPor: me.id },
  });
  await audit({ userId: me.id, accion: 'EMITIR_CERTIFICADO', entidad: 'Certificado', entidadId: cert.id, ip: req.ip });
  return res.status(201).json({ certificado: cert });
});

// GET /api/certificados → lista segun jerarquia
router.get('/', async (req: Request, res: Response) => {
  const me = req.user!;
  let where = {};
  if (me.rol === 'PERSONERO') where = { userId: me.id };
  else if (me.rol === 'COORDINADOR') where = { userId: { in: await getSubtreeIds(me.id, true) } };

  const certificados = await prisma.certificado.findMany({
    where,
    include: { user: { select: { id: true, nombre: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return res.json({ certificados });
});

// GET /api/certificados/:id → descargar PDF
router.get('/:id', async (req: Request, res: Response) => {
  const me = req.user!;
  const cert = await prisma.certificado.findUnique({ where: { id: Number(req.params.id) } });
  if (!cert) return res.status(404).json({ error: 'Certificado no encontrado' });

  // Puede descargar: el propio personero, quien lo emitio, o un superior en jerarquia
  if (me.rol === 'PERSONERO' && cert.userId !== me.id) {
    return res.status(403).json({ error: 'No autorizado' });
  }
  if (me.rol === 'COORDINADOR') {
    const subtree = await getSubtreeIds(me.id, true);
    if (!subtree.includes(cert.userId) && cert.emitidoPor !== me.id) {
      return res.status(403).json({ error: 'No autorizado' });
    }
  }

  const filePath = path.resolve(env.UPLOAD_DIR, cert.pdfUrl);
  if (!filePath.startsWith(path.resolve(env.UPLOAD_DIR)) || !fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Archivo no encontrado' });
  }
  return res.download(filePath, `certificado-${cert.id}.pdf`);
});

export default router;
