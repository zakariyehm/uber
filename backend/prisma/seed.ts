import bcrypt from 'bcryptjs';
import { PrismaClient, UserRole, VehicleType } from '@prisma/client';

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
        create: { displayName: 'Driver Zakariyee', vehicleType: VehicleType.MOTORCYCLE },
      },
      wallet: {
        create: {},
      },
    },
  });

  const ownerPasswordHash = await bcrypt.hash('RaacOwner!2026', 10);
  const owner = await prisma.user.upsert({
    where: { phone: '+252610000000' },
    update: {
      email: 'owner@raac.app',
      role: UserRole.ADMIN,
      passwordHash: ownerPasswordHash,
      isActive: true,
      firstName: 'Raac',
      lastName: 'Owner',
    },
    create: {
      role: UserRole.ADMIN,
      phone: '+252610000000',
      email: 'owner@raac.app',
      passwordHash: ownerPasswordHash,
      firstName: 'Raac',
      lastName: 'Owner',
    },
  });

  console.log('Seeded users:', {
    rider: { id: rider.id, phone: rider.phone, password: 'password123' },
    driver: { id: driver.id, phone: driver.phone, password: 'password123' },
    owner: {
      id: owner.id,
      phone: owner.phone,
      email: owner.email,
      password: 'RaacOwner!2026',
    },
  });

  const { ensureDefaultMethods } = await import('../src/modules/catalog/catalog.service.ts');
  await ensureDefaultMethods();
  console.log('Seeded Moto methods: Moto Fekon, Moto Bajaj, Moto Bicycle');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
