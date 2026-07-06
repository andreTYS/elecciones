import { PrismaClient } from '@prisma/client';
import { seedUbigeo } from './seeds/ubigeo';
import { seedCandidatos } from './seeds/candidatos';
import { seedUsers } from './seeds/admin';

const prisma = new PrismaClient();

async function main() {
  await seedUbigeo(prisma);
  await seedCandidatos(prisma);
  await seedUsers(prisma);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
