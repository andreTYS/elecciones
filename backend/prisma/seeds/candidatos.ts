import { PrismaClient } from '@prisma/client';

export async function seedCandidatos(prisma: PrismaClient) {
  const demo = [
    { nombre: 'Candidato A', agrupacion: 'Movimiento Regional Moquegua', numero: 1, color: '1B3A6B' },
    { nombre: 'Candidato B', agrupacion: 'Partido Nacional Unido', numero: 2, color: 'C9920A' },
    { nombre: 'Candidato C', agrupacion: 'Fuerza Regional', numero: 3, color: '16A34A' },
    { nombre: 'Candidato D', agrupacion: 'Alianza Democrática', numero: 4, color: 'DC2626' },
  ];

  for (const c of demo) {
    const existe = await prisma.candidato.findFirst({ where: { numero: c.numero } });
    if (!existe) await prisma.candidato.create({ data: c });
  }
  console.log('✅ Candidatos demo sembrados');
}
