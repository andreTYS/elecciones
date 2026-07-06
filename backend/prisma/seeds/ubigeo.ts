import { PrismaClient } from '@prisma/client';

// Datos geograficos INEI — Region Moquegua (ubigeo 18)
export async function seedUbigeo(prisma: PrismaClient) {
  const moquegua = await prisma.region.upsert({
    where: { ubigeo: '18' },
    update: {},
    create: { ubigeo: '18', nombre: 'Moquegua' },
  });

  const provincias: { ubigeo: string; nombre: string; distritos: [string, string][] }[] = [
    {
      ubigeo: '1801',
      nombre: 'Mariscal Nieto',
      distritos: [
        ['180101', 'Moquegua'],
        ['180102', 'Carumas'],
        ['180103', 'Cuchumbaya'],
        ['180104', 'Samegua'],
        ['180105', 'San Cristóbal'],
        ['180106', 'Torata'],
      ],
    },
    {
      ubigeo: '1802',
      nombre: 'General Sánchez Cerro',
      distritos: [
        ['180201', 'Omate'],
        ['180202', 'Chojata'],
        ['180203', 'Coalaque'],
        ['180204', 'Ichuña'],
        ['180205', 'La Capilla'],
        ['180206', 'Lloque'],
        ['180207', 'Matalaque'],
        ['180208', 'Puquina'],
        ['180209', 'Quinistaquillas'],
        ['180210', 'Ubinas'],
        ['180211', 'Yunga'],
      ],
    },
    {
      ubigeo: '1803',
      nombre: 'Ilo',
      distritos: [
        ['180301', 'Ilo'],
        ['180302', 'El Algarrobal'],
        ['180303', 'Pacocha'],
      ],
    },
  ];

  for (const prov of provincias) {
    const provincia = await prisma.provincia.upsert({
      where: { ubigeo: prov.ubigeo },
      update: {},
      create: { ubigeo: prov.ubigeo, nombre: prov.nombre, regionId: moquegua.id },
    });
    for (const [ubigeo, nombre] of prov.distritos) {
      await prisma.distrito.upsert({
        where: { ubigeo },
        update: {},
        create: { ubigeo, nombre, provinciaId: provincia.id },
      });
    }
  }

  console.log('✅ Ubigeo Moquegua sembrado (3 provincias, 20 distritos)');
}
