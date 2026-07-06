import { Router, Request, Response } from 'express';
import { prisma } from '../../config/database';
import { authenticate } from '../../middlewares/auth';
import { requireMinLevel } from '../../middlewares/rbac';
import { exportLimiter } from '../../middlewares/rateLimiter';
import { getSubtreeIds } from '../../middlewares/cascade';
import { audit } from '../../utils/audit';

const router = Router();
router.use(authenticate, requireMinLevel(2), exportLimiter);

function csvEscape(v: unknown): string {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// GET /api/export/csv → descarga CSV completo (filtrado por jerarquia)
router.get('/csv', async (req: Request, res: Response) => {
  const me = req.user!;
  const where =
    me.rol === 'COORDINADOR'
      ? { confirmada: true, personeroId: { in: await getSubtreeIds(me.id, false) } }
      : { confirmada: true };

  const actas = await prisma.acta.findMany({
    where,
    include: {
      mesa: {
        include: {
          centroVotacion: {
            include: { distrito: { include: { provincia: { include: { region: true } } } } },
          },
        },
      },
      personero: { select: { nombre: true, dni: true } },
      votos: { include: { candidato: true } },
    },
    orderBy: { confirmadaAt: 'asc' },
  });

  const header = [
    'region', 'provincia', 'distrito', 'local', 'mesa', 'candidato', 'agrupacion',
    'numero', 'votos', 'nulos', 'blancos', 'total_votantes', 'personero', 'confirmada_en',
  ].join(',');

  const lines: string[] = [header];
  for (const a of actas) {
    const geo = a.mesa.centroVotacion.distrito;
    for (const v of a.votos) {
      lines.push(
        [
          geo.provincia.region.nombre, geo.provincia.nombre, geo.nombre,
          a.mesa.centroVotacion.nombre, a.mesa.numero,
          v.candidato.nombre, v.candidato.agrupacion, v.candidato.numero, v.votos,
          a.votosNulos, a.votosBlancos, a.totalVotantes,
          a.personero.nombre, a.confirmadaAt?.toISOString() ?? '',
        ].map(csvEscape).join(',')
      );
    }
  }

  await audit({ userId: me.id, accion: 'EXPORT_CSV', entidad: 'Acta', ip: req.ip });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="votocontrol-${Date.now()}.csv"`);
  return res.send('﻿' + lines.join('\n'));
});

export default router;
