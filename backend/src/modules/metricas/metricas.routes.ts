import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { authenticate } from '../../middlewares/auth';
import { requireMinLevel } from '../../middlewares/rbac';

const router = Router();
router.use(authenticate, requireMinLevel(2)); // Coordinador+

function buildActaFilter(q: Record<string, unknown>): Prisma.ActaWhereInput {
  const mesa: Prisma.MesaWhereInput = {};
  const centro: Prisma.CentroVotacionWhereInput = {};
  const distrito: Prisma.DistritoWhereInput = {};

  if (q.mesaId) return { confirmada: true, mesaId: Number(q.mesaId) };
  if (q.centroId) centro.id = Number(q.centroId);
  if (q.distritoId) distrito.id = Number(q.distritoId);
  if (q.provinciaId) distrito.provinciaId = Number(q.provinciaId);
  if (q.regionId) distrito.provincia = { regionId: Number(q.regionId) };

  if (Object.keys(distrito).length) centro.distrito = distrito;
  if (Object.keys(centro).length) mesa.centroVotacion = centro;

  return { confirmada: true, ...(Object.keys(mesa).length ? { mesa } : {}) };
}

// GET /api/metricas/conteo?regionId=&provinciaId=&distritoId=&centroId=&mesaId=&agrupacion=
router.get('/conteo', async (req: Request, res: Response) => {
  const actaWhere = buildActaFilter(req.query as Record<string, unknown>);
  const agrupacion = req.query.agrupacion as string | undefined;

  const grouped = await prisma.votoActa.groupBy({
    by: ['candidatoId'],
    _sum: { votos: true },
    where: {
      acta: actaWhere,
      ...(agrupacion ? { candidato: { agrupacion: { contains: agrupacion, mode: 'insensitive' } } } : {}),
    },
  });

  const candidatos = await prisma.candidato.findMany({ where: { activo: true }, orderBy: { numero: 'asc' } });
  const agg = await prisma.acta.aggregate({
    where: actaWhere,
    _sum: { votosNulos: true, votosBlancos: true },
    _count: true,
  });

  const conteo = candidatos.map((c) => ({
    candidatoId: c.id,
    nombre: c.nombre,
    agrupacion: c.agrupacion,
    numero: c.numero,
    color: c.color,
    votos: grouped.find((g) => g.candidatoId === c.id)?._sum.votos ?? 0,
  }));

  return res.json({
    conteo,
    nulos: agg._sum.votosNulos ?? 0,
    blancos: agg._sum.votosBlancos ?? 0,
    actasConfirmadas: agg._count,
  });
});

// GET /api/metricas/dashboard → stats generales
router.get('/dashboard', async (_req: Request, res: Response) => {
  const [totalMesas, mesasInstaladas, totalActas, actasConfirmadas, incidenciasAbiertas, alertasAbiertas, votos, personeros] =
    await Promise.all([
      prisma.mesa.count(),
      prisma.mesa.count({ where: { estadoInstalada: true } }),
      prisma.acta.count(),
      prisma.acta.count({ where: { confirmada: true } }),
      prisma.incidencia.count({ where: { resuelta: false } }),
      prisma.alerta.count({ where: { resuelta: false } }),
      prisma.votoActa.aggregate({ _sum: { votos: true }, where: { acta: { confirmada: true } } }),
      prisma.user.count({ where: { rol: 'PERSONERO', activo: true } }),
    ]);

  return res.json({
    totalMesas,
    mesasInstaladas,
    totalActas,
    actasConfirmadas,
    pctAvance: totalMesas > 0 ? Math.round((actasConfirmadas / totalMesas) * 100) : 0,
    incidenciasAbiertas,
    alertasAbiertas,
    totalVotos: votos._sum.votos ?? 0,
    personeros,
  });
});

// GET /api/metricas/ranking → ranking de candidatos
router.get('/ranking', async (_req: Request, res: Response) => {
  const grouped = await prisma.votoActa.groupBy({
    by: ['candidatoId'],
    _sum: { votos: true },
    where: { acta: { confirmada: true } },
  });
  const candidatos = await prisma.candidato.findMany({ where: { activo: true } });
  const total = grouped.reduce((s, g) => s + (g._sum.votos ?? 0), 0);

  const ranking = candidatos
    .map((c) => {
      const votos = grouped.find((g) => g.candidatoId === c.id)?._sum.votos ?? 0;
      return {
        candidatoId: c.id, nombre: c.nombre, agrupacion: c.agrupacion, numero: c.numero, color: c.color,
        votos, pct: total > 0 ? +((votos / total) * 100).toFixed(2) : 0,
      };
    })
    .sort((a, b) => b.votos - a.votos);

  return res.json({ ranking, totalVotos: total });
});

// GET /api/metricas/distritos → avance por distrito
router.get('/distritos', async (_req: Request, res: Response) => {
  const rows = await prisma.$queryRaw<
    { distrito: string; totalmesas: bigint; confirmadas: bigint; votos: bigint | null }[]
  >`
    SELECT d.nombre AS distrito,
           COUNT(DISTINCT m.id) AS totalMesas,
           COUNT(DISTINCT a.id) FILTER (WHERE a.confirmada) AS confirmadas,
           COALESCE(SUM(v.votos) FILTER (WHERE a.confirmada), 0) AS votos
    FROM "Distrito" d
    LEFT JOIN "CentroVotacion" c ON c."distritoId" = d.id
    LEFT JOIN "Mesa" m ON m."centroVotacionId" = c.id
    LEFT JOIN "Acta" a ON a."mesaId" = m.id
    LEFT JOIN "VotoActa" v ON v."actaId" = a.id
    GROUP BY d.nombre
    ORDER BY d.nombre
  `;
  return res.json({
    distritos: rows.map((r) => ({
      distrito: r.distrito,
      totalMesas: Number(r.totalmesas),
      actasConfirmadas: Number(r.confirmadas),
      votos: Number(r.votos ?? 0),
      pctAvance: Number(r.totalmesas) > 0 ? Math.round((Number(r.confirmadas) / Number(r.totalmesas)) * 100) : 0,
    })),
  });
});

// GET /api/metricas/tendencia → serie temporal por hora
router.get('/tendencia', async (_req: Request, res: Response) => {
  const rows = await prisma.$queryRaw<{ hora: Date; actas: bigint; votos: bigint | null }[]>`
    SELECT date_trunc('hour', a."confirmadaAt") AS hora,
           COUNT(DISTINCT a.id) AS actas,
           COALESCE(SUM(v.votos), 0) AS votos
    FROM "Acta" a
    LEFT JOIN "VotoActa" v ON v."actaId" = a.id
    WHERE a.confirmada AND a."confirmadaAt" IS NOT NULL
    GROUP BY 1 ORDER BY 1
  `;
  return res.json({
    tendencia: rows.map((r) => ({ hora: r.hora, actas: Number(r.actas), votos: Number(r.votos ?? 0) })),
  });
});

export default router;
