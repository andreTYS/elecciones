import { Router, Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { authenticate } from '../../middlewares/auth';
import { uploadLimiter } from '../../middlewares/rateLimiter';
import { getSubtreeIds } from '../../middlewares/cascade';
import { procesarActa } from '../../services/gemini.service';
import { emitActaConfirmada, emitStatsUpdate } from '../../services/socket.service';
import { sha256 } from '../../utils/crypto';
import { audit } from '../../utils/audit';
import { logger } from '../../utils/logger';

const router = Router();
router.use(authenticate);

// Multer en memoria: validamos magic bytes antes de tocar disco
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
});

function detectImageType(buf: Buffer): 'jpeg' | 'png' | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  return null;
}

// ── OCR asincrono ──────────────────────────────────────────────────────────

async function runOCR(actaId: number, imageBuffer: Buffer) {
  try {
    await prisma.acta.update({ where: { id: actaId }, data: { estadoOCR: 'PROCESANDO' } });
    const candidatos = await prisma.candidato.findMany({ where: { activo: true } });
    const result = await procesarActa(imageBuffer.toString('base64'), candidatos);

    if (result.error) {
      await prisma.acta.update({
        where: { id: actaId },
        data: { estadoOCR: 'ERROR', observaciones: result.error },
      });
      return;
    }

    // Mapear candidatos extraidos a los registrados (por nombre o agrupacion)
    const votosData = result.candidatos.flatMap((oc) => {
      const cand = candidatos.find(
        (c) =>
          c.nombre.toLowerCase() === oc.nombre.toLowerCase() ||
          c.agrupacion.toLowerCase() === oc.agrupacion.toLowerCase()
      );
      return cand ? [{ actaId, candidatoId: cand.id, votos: oc.votos, confianza: oc.confianza }] : [];
    });

    const requiereRevision = result.confianzaGlobal < 0.8 || result.alertas.length > 0;

    await prisma.$transaction([
      prisma.votoActa.deleteMany({ where: { actaId } }),
      prisma.votoActa.createMany({ data: votosData }),
      prisma.acta.update({
        where: { id: actaId },
        data: {
          estadoOCR: requiereRevision ? 'REQUIERE_REVISION' : 'COMPLETADO',
          confianzaOCR: result.confianzaGlobal,
          votosNulos: result.nulos,
          votosBlancos: result.blancos,
          totalVotantes: result.totalVotantes ?? 0,
          observaciones: result.observaciones,
        },
      }),
      prisma.alerta.createMany({
        data: result.alertas.map((a) => ({ actaId, tipo: 'OCR', mensaje: a })),
      }),
    ]);
  } catch (e) {
    logger.error(`OCR acta ${actaId} falló: ${(e as Error).message}`);
    await prisma.acta
      .update({ where: { id: actaId }, data: { estadoOCR: 'ERROR', observaciones: (e as Error).message } })
      .catch(() => undefined);
  }
}

// POST /api/actas/upload → subir foto, inicia OCR async
router.post('/upload', uploadLimiter, upload.single('imagen'), async (req: Request, res: Response) => {
  const me = req.user!;
  const { mesaId } = z.object({ mesaId: z.coerce.number().int() }).parse(req.body);

  if (!req.file) return res.status(400).json({ error: 'Imagen requerida (campo "imagen")' });
  const tipo = detectImageType(req.file.buffer);
  if (!tipo) return res.status(400).json({ error: 'Formato inválido: solo JPEG o PNG (verificación de magic bytes)' });

  const mesa = await prisma.mesa.findUnique({ where: { id: mesaId } });
  if (!mesa) return res.status(404).json({ error: 'Mesa no encontrada' });
  if (me.rol === 'PERSONERO' && mesa.personeroId !== me.id) {
    return res.status(403).json({ error: 'No eres el personero de esta mesa' });
  }
  if (mesa.estadoInstalada !== true) {
    return res.status(400).json({ error: 'Primero confirma que la mesa está instalada' });
  }

  // Guardar con nombre UUID (nunca el nombre original)
  const uuid = crypto.randomUUID();
  const filename = `${uuid}.${tipo === 'jpeg' ? 'jpg' : 'png'}`;
  const actasDir = path.join(env.UPLOAD_DIR, 'actas');
  fs.mkdirSync(actasDir, { recursive: true });
  fs.writeFileSync(path.join(actasDir, filename), req.file.buffer);

  const acta = await prisma.acta.create({
    data: {
      mesaId,
      personeroId: me.id,
      imagenUrl: `actas/${filename}`,
      imagenHash: sha256(req.file.buffer),
      estadoOCR: 'PENDIENTE',
    },
  });

  await audit({ userId: me.id, accion: 'UPLOAD_ACTA', entidad: 'Acta', entidadId: acta.id, ip: req.ip });

  // OCR en segundo plano
  void runOCR(acta.id, req.file.buffer);

  return res.status(202).json({ actaId: acta.id, estadoOCR: 'PENDIENTE' });
});

// GET /api/actas/:id/status → estado del OCR + votos extraidos
router.get('/:id/status', async (req: Request, res: Response) => {
  const acta = await prisma.acta.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      votos: { include: { candidato: { select: { id: true, nombre: true, agrupacion: true, numero: true, color: true } } } },
      alertas: true,
    },
  });
  if (!acta) return res.status(404).json({ error: 'Acta no encontrada' });
  if (req.user!.rol === 'PERSONERO' && acta.personeroId !== req.user!.id) {
    return res.status(403).json({ error: 'Acta de otro personero' });
  }
  return res.json({ acta });
});

const confirmarSchema = z.object({
  votos: z.array(z.object({ candidatoId: z.number().int(), votos: z.number().int().min(0) })),
  votosNulos: z.number().int().min(0),
  votosBlancos: z.number().int().min(0),
  totalVotantes: z.number().int().min(0).optional(),
  observaciones: z.string().optional(),
});

// PUT /api/actas/:id/confirmar → votos corregidos por el personero
router.put('/:id/confirmar', async (req: Request, res: Response) => {
  const me = req.user!;
  const id = Number(req.params.id);
  const data = confirmarSchema.parse(req.body);

  const acta = await prisma.acta.findUnique({
    where: { id },
    include: { mesa: { include: { centroVotacion: { include: { distrito: true } } } } },
  });
  if (!acta) return res.status(404).json({ error: 'Acta no encontrada' });
  if (me.rol === 'PERSONERO' && acta.personeroId !== me.id) {
    return res.status(403).json({ error: 'Acta de otro personero' });
  }
  if (acta.confirmada) return res.status(400).json({ error: 'Acta ya confirmada' });

  const confirmadaAt = new Date();
  await prisma.$transaction([
    prisma.votoActa.deleteMany({ where: { actaId: id } }),
    prisma.votoActa.createMany({
      data: data.votos.map((v) => ({ actaId: id, candidatoId: v.candidatoId, votos: v.votos, confianza: 'confirmada' })),
    }),
    prisma.acta.update({
      where: { id },
      data: {
        votosNulos: data.votosNulos,
        votosBlancos: data.votosBlancos,
        totalVotantes: data.totalVotantes ?? acta.totalVotantes,
        observaciones: data.observaciones ?? acta.observaciones,
        confirmada: true,
        confirmadaAt,
      },
    }),
  ]);

  const candidatos = await prisma.votoActa.findMany({
    where: { actaId: id },
    include: { candidato: { select: { nombre: true, agrupacion: true, color: true } } },
  });

  emitActaConfirmada({
    mesaId: acta.mesaId,
    mesa: acta.mesa.numero,
    distrito: acta.mesa.centroVotacion.distrito.nombre,
    local: acta.mesa.centroVotacion.nombre,
    candidatos: candidatos.map((v) => ({ nombre: v.candidato.nombre, agrupacion: v.candidato.agrupacion, votos: v.votos })),
    totalVotos: candidatos.reduce((s, v) => s + v.votos, 0) + data.votosNulos + data.votosBlancos,
    personero: me.nombre,
    hora: confirmadaAt.toISOString(),
  });
  void emitStatsUpdate();
  await audit({ userId: me.id, accion: 'CONFIRMAR_ACTA', entidad: 'Acta', entidadId: id, ip: req.ip });

  return res.json({ success: true, actaId: id });
});

// GET /api/actas → lista segun jerarquia
router.get('/', async (req: Request, res: Response) => {
  const me = req.user!;
  let where: Prisma.ActaWhereInput = {};
  if (me.rol === 'PERSONERO') where = { personeroId: me.id };
  else if (me.rol === 'COORDINADOR') where = { personeroId: { in: await getSubtreeIds(me.id, false) } };

  const actas = await prisma.acta.findMany({
    where,
    include: {
      mesa: { select: { numero: true, centroVotacion: { select: { nombre: true } } } },
      personero: { select: { id: true, nombre: true } },
      votos: { include: { candidato: { select: { nombre: true, numero: true } } } },
      alertas: { where: { resuelta: false } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return res.json({ actas });
});

export default router;
