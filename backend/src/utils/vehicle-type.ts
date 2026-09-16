import { ServiceCategory, VehicleType } from '@prisma/client';
import { prisma } from '../lib/prisma.ts';

export function parseVehicleType(value?: string | null): VehicleType {
  const raw = String(value || '').trim().toUpperCase();
  if (raw === 'BICYCLE' || raw === 'BIKE') return VehicleType.BICYCLE;
  return VehicleType.MOTORCYCLE;
}

export function inferVehicleType(methodName: string): VehicleType {
  const raw = methodName.toLowerCase();
  if (/\bbicycle\b|\bbaaskiil\b|\bbike\b/.test(raw) && !/motorbike|motorcycle/.test(raw)) {
    return VehicleType.BICYCLE;
  }
  return VehicleType.MOTORCYCLE;
}

export function vehicleTypeLabel(type?: string | null) {
  return type === VehicleType.BICYCLE || type === 'BICYCLE' ? 'Bicycle' : 'Motorcycle';
}

export function iconForVehicleType(type?: string | null) {
  return type === VehicleType.BICYCLE || type === 'BICYCLE' ? 'bicycle' : 'motorbike';
}

function methodKey(value: string) {
  return value.trim().toLowerCase();
}

function methodSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Delivery State jobs go to every online driver type. Moto stays type-matched. */
export function looksLikeOpenFleetMethod(deliveryMethod: string): boolean {
  const raw = methodKey(deliveryMethod);
  if (!raw) return false;
  if (raw.includes('delivery state') || raw.startsWith('state-')) return true;
  if (/\bmoto\b|\bbajaj\b|\bfekon\b|\bbicycle\b|\bbaaskiil\b/.test(raw)) return false;
  return true;
}

let catalogCache: { at: number; byKey: Map<string, ServiceCategory> } | null = null;

async function catalogCategoryByMethod(deliveryMethod: string): Promise<ServiceCategory | null> {
  const name = deliveryMethod.trim();
  if (!name) return null;

  if (!catalogCache || Date.now() - catalogCache.at > 30_000) {
    const rows = await prisma.serviceMethod.findMany({
      select: { name: true, slug: true, category: true },
    });
    const byKey = new Map<string, ServiceCategory>();
    for (const row of rows) {
      byKey.set(methodKey(row.name), row.category);
      byKey.set(methodKey(row.slug), row.category);
    }
    catalogCache = { at: Date.now(), byKey };
  }

  const slug = methodSlug(name);
  return (
    catalogCache.byKey.get(methodKey(name)) ||
    catalogCache.byKey.get(slug) ||
    catalogCache.byKey.get(`state-${slug}`) ||
    catalogCache.byKey.get(`moto-${slug}`) ||
    null
  );
}

export async function isOpenFleetMethod(deliveryMethod: string): Promise<boolean> {
  const category = await catalogCategoryByMethod(deliveryMethod);
  if (category) return category === ServiceCategory.DELIVERY_STATE;
  return looksLikeOpenFleetMethod(deliveryMethod);
}

export async function resolveVehicleTypeForMethod(deliveryMethod: string): Promise<VehicleType> {
  const name = deliveryMethod.trim();
  if (!name) return VehicleType.MOTORCYCLE;

  const slug = methodSlug(name);
  const row = await prisma.serviceMethod.findFirst({
    where: {
      OR: [
        { name: { equals: name, mode: 'insensitive' } },
        { slug },
        { slug: slug.startsWith('moto-') ? slug : `moto-${slug}` },
        { slug: slug.startsWith('state-') ? slug : `state-${slug}` },
      ],
    },
    select: { vehicleType: true, category: true },
  });
  if (row?.category === ServiceCategory.DELIVERY_STATE) return VehicleType.MOTORCYCLE;
  if (row) return row.vehicleType;
  return inferVehicleType(name);
}
