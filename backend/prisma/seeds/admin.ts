import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

async function upsertUser(
  prisma: PrismaClient,
  data: {
    nombre: string;
    username: string;
    password: string;
    rol: 'SUPER_ADMIN' | 'ADMIN_MORTAL' | 'COORDINADOR' | 'PERSONERO';
    supervisorId?: number;
    distritoId?: number;
    modulosPermitidos?: string[];
  }
) {
  const { password, ...rest } = data;
  return prisma.user.upsert({
    where: { username: data.username },
    update: {},
    create: { ...rest, passwordHash: await bcrypt.hash(password, 12) },
  });
}

export async function seedUsers(prisma: PrismaClient) {
  // Admin Super inicial
  const superAdmin = await upsertUser(prisma, {
    nombre: 'Super Administrador',
    username: 'superadmin',
    password: process.env.SEED_SUPERADMIN_PASS || 'VotoControl2026!',
    rol: 'SUPER_ADMIN',
  });

  // Solo crear datos demo fuera de produccion (o si se fuerza)
  if (process.env.NODE_ENV === 'production' && process.env.SEED_DEMO !== 'true') {
    console.log('✅ Super admin sembrado (demo omitido en producción)');
    return;
  }

  const distritoMoquegua = await prisma.distrito.findUnique({ where: { ubigeo: '180101' } });

  const admin = await upsertUser(prisma, {
    nombre: 'Admin Mortal Demo',
    username: 'admin01',
    password: 'admin2026',
    rol: 'ADMIN_MORTAL',
    supervisorId: superAdmin.id,
    modulosPermitidos: ['usuarios', 'mesas', 'actas', 'incidencias', 'alimentacion', 'certificados', 'metricas', 'dashboard', 'urgencias', 'export'],
  });

  const coordinador = await upsertUser(prisma, {
    nombre: 'Coordinador Demo',
    username: 'coordinador01',
    password: 'coord2026',
    rol: 'COORDINADOR',
    supervisorId: admin.id,
    distritoId: distritoMoquegua?.id,
    modulosPermitidos: ['mesas', 'actas', 'incidencias', 'alimentacion', 'certificados', 'metricas', 'dashboard', 'export'],
  });

  const p1 = await upsertUser(prisma, {
    nombre: 'Personero Uno',
    username: 'personero01',
    password: 'pers2026',
    rol: 'PERSONERO',
    supervisorId: coordinador.id,
    distritoId: distritoMoquegua?.id,
  });
  const p2 = await upsertUser(prisma, {
    nombre: 'Personero Dos',
    username: 'personero02',
    password: 'pers2026',
    rol: 'PERSONERO',
    supervisorId: coordinador.id,
    distritoId: distritoMoquegua?.id,
  });

  // Local + mesas demo
  if (distritoMoquegua) {
    const centro = await prisma.centroVotacion.upsert({
      where: { codigo: 'IE-SB-001' },
      update: { coordinadorId: coordinador.id },
      create: {
        codigo: 'IE-SB-001',
        nombre: 'I.E. Simón Bolívar',
        direccion: 'Av. Bolívar s/n, Moquegua',
        totalMesas: 2,
        distritoId: distritoMoquegua.id,
        coordinadorId: coordinador.id,
      },
    });

    await prisma.mesa.upsert({
      where: { numero_centroVotacionId: { numero: '012345', centroVotacionId: centro.id } },
      update: { personeroId: p1.id },
      create: { numero: '012345', centroVotacionId: centro.id, personeroId: p1.id },
    });
    await prisma.mesa.upsert({
      where: { numero_centroVotacionId: { numero: '012346', centroVotacionId: centro.id } },
      update: { personeroId: p2.id },
      create: { numero: '012346', centroVotacionId: centro.id, personeroId: p2.id },
    });
  }

  console.log('✅ Usuarios demo sembrados (superadmin, admin01, coordinador01, personero01/02)');
}
