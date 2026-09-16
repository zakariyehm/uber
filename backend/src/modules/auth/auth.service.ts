import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma.ts';
import { normalizePhone } from '../../utils/dates.ts';

export class AuthError extends Error {
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
}) {
  const phone = normalizePhone(input.phone);
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    throw new AuthError('An account already exists with this phone number', 'auth/phone-already-in-use', 409);
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const role = input.role === 'DRIVER' ? UserRole.DRIVER : UserRole.RIDER;
  const displayName = [input.firstName, input.lastName].filter(Boolean).join(' ') || null;

  const user = await prisma.user.create({
    data: {
      phone,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      role,
      riderProfile: role === UserRole.RIDER ? { create: { displayName } } : undefined,
      driverProfile: role === UserRole.DRIVER ? { create: { displayName } } : undefined,
      wallet: role === UserRole.DRIVER ? { create: {} } : undefined,
      riderWallet: role === UserRole.RIDER ? { create: {} } : undefined,
    },
  });

  return user;
}

export async function loginUser(phoneRaw: string, password: string) {
  const phone = normalizePhone(phoneRaw);
  const user = await prisma.user.findUnique({
    where: { phone },
    include: { driverProfile: true, riderProfile: true },
  });

  if (!user) {
    throw new AuthError('No account found with this phone number. Please sign up first.', 'auth/user-not-found');
  }

  const ok = user.passwordHash ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!ok) {
    throw new AuthError('Incorrect password. Please try again.', 'auth/wrong-password');
  }

  if (!user.isActive) {
    throw new AuthError('This account is disabled', 'auth/user-disabled');
  }

  return user;
}

export function toPublicUser(user: {
  id: string;
  role: UserRole;
  phone: string;
  firstName: string | null;
  lastName: string | null;
  gender?: string | null;
  state?: string | null;
}) {
  return {
    id: user.id,
    role: user.role,
    phone: user.phone,
    firstName: user.firstName,
    lastName: user.lastName,
    gender: user.gender ?? null,
    state: user.state ?? null,
  };
}
