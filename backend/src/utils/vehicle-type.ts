import { VehicleType } from '@prisma/client';
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

export async function resolveVehicleTypeForMethod(deliveryMethod: string): Promise<VehicleType> {
  const name = deliveryMethod.trim();
  if (!name) return VehicleType.MOTORCYCLE;

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const row = await prisma.serviceMethod.findFirst({
    where: {
      OR: [
        { name: { equals: name, mode: 'insensitive' } },
        { slug },
        { slug: slug.startsWith('moto-') ? slug : `moto-${slug}` },
      ],
    },
    select: { vehicleType: true },
  });
  if (row) return row.vehicleType;
  return inferVehicleType(name);
}
