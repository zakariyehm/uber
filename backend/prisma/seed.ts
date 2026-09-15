import bcrypt from 'bcryptjs';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  const rider = await prisma.user.upsert({
    where: { phone: '+252610000001' },
    update: {},
    create: {
      role: UserRole.RIDER,
      phone: '+252610000001',
      passwordHash,
      firstName: 'Amina',
      lastName: 'Ali',
      riderProfile: {
        create: { displayName: 'Amina Ali' },
      },
    },
  });

  const driver = await prisma.user.upsert({
    where: { phone: '+252610000002' },
    update: {},
    create: {
      role: UserRole.DRIVER,
      phone: '+252610000002',
      passwordHash,
      firstName: 'Zakariye',
      lastName: 'Driver',
      driverProfile: {
        create: { displayName: 'Driver Zakariyee' },
      },
      wallet: {
        create: {},
      },
    },
  });

  console.log('Seeded users:', {
    rider: { id: rider.id, phone: rider.phone, password: 'password123' },
    driver: { id: driver.id, phone: driver.phone, password: 'password123' },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
