import { Prisma, ServiceCategory } from '@prisma/client';
import { prisma } from '../../lib/prisma.ts';

const MOTO_DEFAULTS = [
  {
    slug: 'moto-fekon',
    name: 'Moto Fekon',
    icon: 'motorbike',
    timeLabel: '10-15 minutes',
    price: 1,
    sortOrder: 1,
  },
  {
    slug: 'moto-bajaj',
    name: 'Moto Bajaj',
    icon: 'motorbike',
    timeLabel: '15-20 minutes',
    price: 2.5,
    sortOrder: 2,
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
  isActive: boolean;
  sortOrder: number;
}) {
  return {
    id: row.id,
    category: row.category,
    slug: row.slug,
    name: row.name,
    icon: row.icon,
    time: row.timeLabel,
    timeLabel: row.timeLabel,
    price: moneyStr(row.price),
    displayPrice: `$${moneyStr(row.price)}`,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
  };
}

function parseCategory(value?: string) {
  if (value === 'DELIVERY_STATE') return ServiceCategory.DELIVERY_STATE;
  return ServiceCategory.MOTO;
}

export async function ensureDefaultMethods() {
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
}) {
  const category = parseCategory(input.category);
  let slug = slugify(input.name);
  const existing = await prisma.serviceMethod.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now().toString().slice(-4)}`;

  const count = await prisma.serviceMethod.count({ where: { category } });
  const row = await prisma.serviceMethod.create({
    data: {
      category,
      slug,
      name: input.name.trim(),
      icon: input.icon || 'motorbike',
      timeLabel: input.timeLabel.trim(),
      price: input.price,
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
    },
  });
  return toDto(updated);
}
