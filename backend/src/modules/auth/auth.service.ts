import bcrypt from 'bcryptjs';
import { UserRole, VehicleType } from '@prisma/client';
import { prisma } from '../../lib/prisma.ts';
import { normalizePhone } from '../../utils/dates.ts';
import { parseVehicleType } from '../../utils/vehicle-type.ts';

export class AuthError extends Error {
  driverName?: string;

  constructor(
    message: string,
    public code: string,
    public statusCode = 401
  ) {
    super(message);
  }
}

export async function registerUser(input: {
  phone: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role: 'RIDER' | 'DRIVER';
  vehicleType?: string;
}) {
  const phone = normalizePhone(input.phone);
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    throw new AuthError('An account already exists with this phone number', 'auth/phone-already-in-use', 409);
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const role = input.role === 'DRIVER' ? UserRole.DRIVER : UserRole.RIDER;
  const displayName = [input.firstName, input.lastName].filter(Boolean).join(' ') || null;
  const vehicleType = parseVehicleType(input.vehicleType);

  const user = await prisma.user.create({
    data: {
      phone,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      role,
      riderProfile: role === UserRole.RIDER ? { create: { displayName } } : undefined,
      driverProfile:
        role === UserRole.DRIVER ? { create: { displayName, vehicleType } } : undefined,
      wallet: role === UserRole.DRIVER ? { create: {} } : undefined,
      riderWallet: role === UserRole.RIDER ? { create: {} } : undefined,
    },
    include: { driverProfile: true, riderProfile: true },
  });

  return user;
}

export async function loginUser(input: { phone?: string; email?: string; password: string }) {
  const phone = input.phone ? normalizePhone(input.phone) : null;
  const email = input.email?.trim().toLowerCase() || null;

  const user = phone
    ? await prisma.user.findUnique({
        where: { phone },
        include: { driverProfile: true, riderProfile: true },
      })
    : email
      ? await prisma.user.findUnique({
          where: { email },
          include: { driverProfile: true, riderProfile: true },
        })
      : null;

  if (!user) {
    throw new AuthError(
      'No account was found for this phone number.',
      'auth/user-not-found'
    );
  }

  const ok = user.passwordHash ? await bcrypt.compare(input.password, user.passwordHash) : false;
  if (!ok) {
    throw new AuthError(
      'Incorrect password or phone number. Please check and try again.',
      'auth/wrong-password'
    );
  }

  if (!user.isActive) {
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    const kind =
      user.role === UserRole.DRIVER ? 'driver' : user.role === UserRole.RIDER ? 'rider' : 'account';
    const error = new AuthError(
      name
        ? `${name}, your ${kind} account is disabled. Contact Raac operations to restore access.`
        : `Your ${kind} account is disabled. Contact Raac operations to restore access.`,
      'auth/user-disabled',
      403
    );
    if (name) error.driverName = name;
    throw error;
  }

  return user;
}

export function toPublicUser(user: {
  id: string;
  role: UserRole;
  phone: string;
  email?: string | null;
  firstName: string | null;
  lastName: string | null;
  gender?: string | null;
  state?: string | null;
  driverProfile?: { vehicleType?: VehicleType | string | null } | null;
}) {
  return {
    id: user.id,
    role: user.role,
    phone: user.phone,
    email: user.email ?? null,
    firstName: user.firstName,
    lastName: user.lastName,
    gender: user.gender ?? null,
    state: user.state ?? null,
    vehicleType:
      user.role === UserRole.DRIVER
        ? parseVehicleType(user.driverProfile?.vehicleType)
        : undefined,
  };
}
