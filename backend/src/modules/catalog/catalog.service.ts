import { Prisma, ServiceCategory, VehicleType } from '@prisma/client';
import { prisma } from '../../lib/prisma.ts';
import { iconForVehicleType, parseVehicleType } from '../../utils/vehicle-type.ts';

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

export async function ensureDefaultMethods() {
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

export async function listPublicMethods(categoryRaw?: string) {
  await ensureDefaultMethods();
  const category = parseCategory(categoryRaw);
  const rows = await prisma.serviceMethod.findMany({
    where: { category, isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
  return rows.map(toDto);
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

function slugify(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
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
  let slug = slugify(input.name);
  const existing = await prisma.serviceMethod.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now().toString().slice(-4)}`;

  const count = await prisma.serviceMethod.count({ where: { category } });
  const row = await prisma.serviceMethod.create({
    data: {
      category,
      slug,
      name: input.name.trim(),
      icon: input.icon || iconForVehicleType(vehicleType),
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
