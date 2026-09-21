import { Prisma, ServiceCategory, VehicleType } from '@prisma/client';
import { prisma } from '../../lib/prisma.ts';
import { iconForVehicleType, parseVehicleType } from '../../utils/vehicle-type.ts';

const STATE_DEFAULTS = [
  { name: 'Banadir', timeLabel: 'Same day', price: 3, sortOrder: 1 },
  { name: 'Lower Shabelle', timeLabel: '4-8 hours', price: 3, sortOrder: 2 },
  { name: 'Middle Shabelle', timeLabel: '6-12 hours', price: 3, sortOrder: 3 },
  { name: 'Hiiraan', timeLabel: '1 day', price: 3, sortOrder: 4 },
  { name: 'Bay', timeLabel: '1 day', price: 3, sortOrder: 5 },
  { name: 'Bakool', timeLabel: '1 day', price: 3, sortOrder: 6 },
  { name: 'Galgaduud', timeLabel: '1 day', price: 3, sortOrder: 7 },
  { name: 'Mudug', timeLabel: '1-2 days', price: 3, sortOrder: 8 },
  { name: 'Nugaal', timeLabel: '1-2 days', price: 3, sortOrder: 9 },
  { name: 'Gedo', timeLabel: '1-2 days', price: 3, sortOrder: 10 },
  { name: 'Lower Juba', timeLabel: '1-2 days', price: 3, sortOrder: 11 },
  { name: 'Middle Juba', timeLabel: '1-2 days', price: 3, sortOrder: 12 },
  { name: 'Bari', timeLabel: '2 days', price: 3, sortOrder: 13 },
  { name: 'Sool', timeLabel: '2-3 days', price: 3, sortOrder: 14 },
  { name: 'Sanaag', timeLabel: '2-3 days', price: 3, sortOrder: 15 },
  { name: 'Togdheer', timeLabel: '2-3 days', price: 3, sortOrder: 16 },
  { name: 'Woqooyi Galbeed', timeLabel: '2-3 days', price: 3, sortOrder: 17 },
  { name: 'Awdal', timeLabel: '2-3 days', price: 3, sortOrder: 18 },
];

const MOTO_DEFAULTS = [
  {
    slug: 'moto-fekon',
    name: 'Moto Fekon',
    icon: 'motorbike',
    timeLabel: '10-15 minutes',
    price: 1,
    sortOrder: 1,
    vehicleType: VehicleType.MOTORCYCLE,
  },
  {
    slug: 'moto-bajaj',
    name: 'Moto Bajaj',
    icon: 'motorbike',
    timeLabel: '15-20 minutes',
    price: 2.5,
    sortOrder: 2,
    vehicleType: VehicleType.MOTORCYCLE,
  },
  {
    slug: 'moto-bicycle',
    name: 'Moto Bicycle',
    icon: 'bicycle',
    timeLabel: '15-25 minutes',
    price: 0.8,
    sortOrder: 3,
    vehicleType: VehicleType.BICYCLE,
  },
];

function moneyStr(value: Prisma.Decimal | number) {
  return Number(value).toFixed(2);
}

function toDto(row: {
  id: string;
  category: ServiceCategory;
  slug: string;
  name: string;
  icon: string;
  timeLabel: string;
  price: Prisma.Decimal;
  vehicleType: VehicleType;
  isActive: boolean;
  sortOrder: number;
}) {
  return {
    id: row.id,
    category: row.category,
    slug: row.slug,
    name: row.name,
    icon: row.icon || iconForVehicleType(row.vehicleType),
    time: row.timeLabel,
    timeLabel: row.timeLabel,
    price: moneyStr(row.price),
    displayPrice: `$${moneyStr(row.price)}`,
    vehicleType: row.vehicleType,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
  };
}

function parseCategory(value?: string) {
  if (value === 'DELIVERY_STATE') return ServiceCategory.DELIVERY_STATE;
  return ServiceCategory.MOTO;
}

async function ensureDefaultMotoMethods() {
  const existing = await prisma.serviceMethod.count({ where: { category: ServiceCategory.MOTO } });
  if (existing > 0) return;

  for (const method of MOTO_DEFAULTS) {
    await prisma.serviceMethod.upsert({
      where: { slug: method.slug },
      update: {},
      create: {
        category: ServiceCategory.MOTO,
        ...method,
      },
    });
  }
}

async function ensureDefaultDeliveryStates() {
  const existing = await prisma.serviceMethod.count({
    where: { category: ServiceCategory.DELIVERY_STATE },
  });
  if (existing > 0) return;

  for (const method of STATE_DEFAULTS) {
    const slug = `state-${method.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
    await prisma.serviceMethod.upsert({
      where: { slug },
      update: {},
      create: {
        category: ServiceCategory.DELIVERY_STATE,
        slug,
        name: method.name,
        icon: 'airplane',
        timeLabel: method.timeLabel,
        price: method.price,
        sortOrder: method.sortOrder,
        vehicleType: VehicleType.MOTORCYCLE,
      },
    });
  }
}

export async function ensureDefaultMethods() {
  await ensureDefaultMotoMethods();
  await ensureDefaultDeliveryStates();
}

export async function listPublicMethods(categoryRaw?: string) {
  await ensureDefaultMethods();
  const category = parseCategory(categoryRaw);
  const rows = await prisma.serviceMethod.findMany({
    where: { category, isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
  return rows.map(toDto);
}

/** Active stores for rider checkout (store sender). */
export async function listPublicStores() {
  const rows = await prisma.store.findMany({
    where: { isActive: true },
    orderBy: [{ name: 'asc' }],
    select: {
      id: true,
      name: true,
      category: true,
      phone: true,
      address: true,
      district: true,
    },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    phone: row.phone,
    address: row.address,
    district: row.district,
  }));
}

export async function listAdminMethods(categoryRaw?: string) {
  await ensureDefaultMethods();
  const category = parseCategory(categoryRaw);
  const rows = await prisma.serviceMethod.findMany({
    where: { category },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
  return { category, methods: rows.map(toDto) };
}

function slugify(name: string, category = ServiceCategory.MOTO) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  if (category === ServiceCategory.DELIVERY_STATE) {
    return base.startsWith('state-') ? base : `state-${base || 'method'}`;
  }
  return base.startsWith('moto-') ? base : `moto-${base || 'method'}`;
}

export async function createServiceMethod(input: {
  category?: string;
  name: string;
  timeLabel: string;
  price: number;
  icon?: string;
  sortOrder?: number;
  vehicleType?: string;
}) {
  const category = parseCategory(input.category);
  const vehicleType = parseVehicleType(input.vehicleType);
  let slug = slugify(input.name, category);
  const existing = await prisma.serviceMethod.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now().toString().slice(-4)}`;

  const count = await prisma.serviceMethod.count({ where: { category } });
  const row = await prisma.serviceMethod.create({
    data: {
      category,
      slug,
      name: input.name.trim(),
      icon: input.icon || (category === ServiceCategory.DELIVERY_STATE ? 'airplane' : iconForVehicleType(vehicleType)),
      timeLabel: input.timeLabel.trim(),
      price: input.price,
      vehicleType,
      sortOrder: input.sortOrder ?? count + 1,
    },
  });
  return toDto(row);
}

export async function patchServiceMethod(
  id: string,
  input: {
    name?: string;
    timeLabel?: string;
    price?: number;
    isActive?: boolean;
    sortOrder?: number;
    vehicleType?: string;
  }
) {
  const row = await prisma.serviceMethod.findUnique({ where: { id } });
  if (!row) {
    const error = new Error('Method not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  const updated = await prisma.serviceMethod.update({
    where: { id },
    data: {
      name: input.name?.trim() || undefined,
      timeLabel: input.timeLabel?.trim() || undefined,
      price: input.price != null ? input.price : undefined,
      isActive: input.isActive,
      sortOrder: input.sortOrder,
      vehicleType: input.vehicleType ? parseVehicleType(input.vehicleType) : undefined,
      icon: input.vehicleType ? iconForVehicleType(input.vehicleType) : undefined,
    },
  });
  return toDto(updated);
}

export async function deleteServiceMethod(id: string) {
  const row = await prisma.serviceMethod.findUnique({ where: { id } });
  if (!row) {
    const error = new Error('Method not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  await prisma.serviceMethod.delete({ where: { id } });
  return { ok: true, id };
}
