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

export async function loginUser(input: {
  phone?: string;
  email?: string;
  password: string;
  accountKind?: 'STORE';
}) {
  const rawPhone = input.phone ? normalizePhone(input.phone) : null;
  const email = input.email?.trim().toLowerCase() || null;

  const somaliaForm = (phone: string) => {
    let digits = phone.replace(/\D/g, '');
    if (digits.startsWith('252')) digits = digits.slice(3);
    if (digits.startsWith('0')) digits = digits.slice(1);
    return digits ? `+252${digits}` : phone;
  };

  const user = rawPhone
    ? (await prisma.user.findUnique({
        where: { phone: rawPhone },
        include: { driverProfile: true, riderProfile: { include: { store: true, storeBranch: true } } },
      })) ||
      (await prisma.user.findUnique({
        where: { phone: somaliaForm(rawPhone) },
        include: { driverProfile: true, riderProfile: { include: { store: true, storeBranch: true } } },
      }))
    : email
      ? await prisma.user.findUnique({
          where: { email },
          include: { driverProfile: true, riderProfile: { include: { store: true, storeBranch: true } } },
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

  if (input.accountKind === 'STORE') {
    const isStoreStaff =
      user.role === UserRole.RIDER &&
      user.riderProfile?.riderKind === 'STORE' &&
      Boolean(user.riderProfile.storeId);
    if (!isStoreStaff) {
      throw new AuthError(
        'This number is not registered as store staff. Only staff numbers from store register can sign in here.',
        'auth/not-store-staff',
        403
      );
    }
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
  riderProfile?: {
    riderKind?: string | null;
    storeId?: string | null;
    store?: {
      id: string;
      name: string;
      category: string;
      phone?: string | null;
      district?: string | null;
      address?: string | null;
    } | null;
    storeBranch?: {
      id: string;
      name: string;
      district: string;
      address: string;
    } | null;
  } | null;
}) {
  const store = user.riderProfile?.store;
  const branch = user.riderProfile?.storeBranch;
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
    riderKind:
      user.role === UserRole.RIDER
        ? user.riderProfile?.riderKind === 'STORE'
          ? 'STORE'
          : 'PERSONAL'
        : undefined,
    storeId: user.role === UserRole.RIDER ? user.riderProfile?.storeId ?? null : undefined,
    store:
      user.role === UserRole.RIDER && store
        ? {
            id: store.id,
            name: store.name,
            category: store.category,
            phone: store.phone ?? null,
            district: store.district ?? null,
            address: store.address ?? null,
            branch: branch
              ? {
                  id: branch.id,
                  name: branch.name,
                  district: branch.district,
                  address: branch.address,
                }
              : null,
          }
        : null,
  };
}
