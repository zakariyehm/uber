import bcrypt from 'bcryptjs';
import { Gender, UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma.ts';
import { normalizePhone } from '../../utils/dates.ts';
import { AuthError, toPublicUser } from './auth.service.ts';

const OTP_TTL_MS = 5 * 60 * 1000;

function randomCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export async function requestOtp(phoneRaw: string, purpose: 'LOGIN' | 'REGISTER') {
  const phone = normalizePhone(phoneRaw);
  const purposeEnum = purpose === 'REGISTER' ? 'REGISTER' : 'LOGIN';
  const code = randomCode();
  const codeHash = await bcrypt.hash(code, 8);

  await prisma.otpChallenge.updateMany({
    where: { phone, purpose: purposeEnum, verifiedAt: null },
    data: { expiresAt: new Date() },
  });

  await prisma.otpChallenge.create({
    data: {
      phone,
      purpose: purposeEnum,
      codeHash,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  });

  console.log('\n==============================');
  console.log(`  OTP ${purpose}  ${phone}`);
  console.log(`  CODE: ${code}`);
  console.log('==============================\n');

  return {
    phone,
    expiresIn: 300,
    ...(process.env.OTP_RETURN_CODE === 'true' ? { devCode: code } : {}),
  };
}

export async function verifyOtp(phoneRaw: string, code: string, purpose: 'LOGIN' | 'REGISTER') {
  const phone = normalizePhone(phoneRaw);
  const purposeEnum = purpose === 'REGISTER' ? 'REGISTER' : 'LOGIN';

  const challenge = await prisma.otpChallenge.findFirst({
    where: {
      phone,
      purpose: purposeEnum,
      verifiedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!challenge) {
    throw new AuthError('Code expired. Request a new one.', 'auth/otp-expired', 400);
  }

  if (challenge.attempts >= 5) {
    throw new AuthError('Too many attempts. Request a new code.', 'auth/otp-locked', 429);
  }

  const ok = await bcrypt.compare(code, challenge.codeHash);
  await prisma.otpChallenge.update({
    where: { id: challenge.id },
    data: {
      attempts: { increment: 1 },
      verifiedAt: ok ? new Date() : undefined,
    },
  });

  if (!ok) {
    throw new AuthError('Invalid code. Please try again.', 'auth/otp-invalid', 400);
  }

  const user = await prisma.user.findUnique({ where: { phone } });
  return { phone, purpose, user };
}

export async function completeOtpProfile(input: {
  phone: string;
  firstName: string;
  lastName: string;
  state: string;
  gender: 'MALE' | 'FEMALE';
  role?: 'RIDER' | 'DRIVER';
}) {
  const phone = normalizePhone(input.phone);
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    if (existing.role === UserRole.DRIVER) {
      throw new AuthError(
        'Driver accounts are created by Raac operations',
        'auth/driver-invite-only',
        403
      );
    }
    const user = await prisma.user.update({
      where: { id: existing.id },
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        state: input.state,
        gender: input.gender === 'FEMALE' ? Gender.FEMALE : Gender.MALE,
      },
    });
    return toPublicUser(user);
  }

  const displayName = `${input.firstName} ${input.lastName}`.trim();
  const user = await prisma.user.create({
    data: {
      phone,
      role: UserRole.RIDER,
      firstName: input.firstName,
      lastName: input.lastName,
      state: input.state,
      gender: input.gender === 'FEMALE' ? Gender.FEMALE : Gender.MALE,
      riderProfile: { create: { displayName } },
      riderWallet: { create: {} },
    },
  });
  return toPublicUser(user);
}
