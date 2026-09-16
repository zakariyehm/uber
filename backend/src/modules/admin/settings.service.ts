import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.ts';
import { redis } from '../../lib/redis.ts';

export const DEFAULT_PLATFORM_FEE_RATE = 0.05;
const SETTING_ID = 'default';
const REDIS_KEY = 'raac:platform:driverFee';

export type PlatformFeeSettings = {
  driverFeeRate: number;
  driverFeePercent: number;
  updatedAt: string;
  live: true;
};

let liveFee: PlatformFeeSettings | null = null;

function toPercent(rate: number) {
  return Math.round(rate * 10000) / 100;
}

function toRate(percent: number) {
  return Math.round(percent * 100) / 10000;
}

function toSettings(rate: number, updatedAt: Date | string): PlatformFeeSettings {
  const driverFeeRate = toRate(toPercent(rate));
  return {
    driverFeeRate,
    driverFeePercent: toPercent(driverFeeRate),
    updatedAt: typeof updatedAt === 'string' ? updatedAt : updatedAt.toISOString(),
    live: true,
  };
}

function setLiveFee(next: PlatformFeeSettings) {
  liveFee = next;
}

async function publishLiveFee(next: PlatformFeeSettings) {
  setLiveFee(next);
  try {
    if (redis.status === 'ready') {
      await redis.set(REDIS_KEY, JSON.stringify(next));
    }
  } catch {
    // Redis is optional; DB + process memory still apply immediately.
  }
}

export function getLivePlatformFee(): PlatformFeeSettings {
  return (
    liveFee ??
    toSettings(DEFAULT_PLATFORM_FEE_RATE, new Date())
  );
}

async function readRedisFee(): Promise<PlatformFeeSettings | null> {
  try {
    if (redis.status !== 'ready') return null;
    const raw = await redis.get(REDIS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PlatformFeeSettings>;
    if (typeof parsed.driverFeeRate !== 'number' || !Number.isFinite(parsed.driverFeeRate)) {
      return null;
    }
    return toSettings(parsed.driverFeeRate, parsed.updatedAt || new Date());
  } catch {
    return null;
  }
}

function decimalRate(rate: number) {
  return new Prisma.Decimal(toRate(toPercent(rate)).toFixed(4));
}

export async function getPlatformSettings() {
  const row = await prisma.platformSetting.upsert({
    where: { id: SETTING_ID },
    update: {},
    create: { id: SETTING_ID, driverFeeRate: decimalRate(DEFAULT_PLATFORM_FEE_RATE) },
  });
  const settings = toSettings(Number(row.driverFeeRate), row.updatedAt);
  await publishLiveFee(settings);
  return settings;
}

export async function patchPlatformSettings(input: { driverFeePercent: number }) {
  const normalized = Math.round(Number(input.driverFeePercent) * 100) / 100;
  if (!Number.isFinite(normalized) || normalized < 0 || normalized > 30) {
    const error = new Error('Fee must be between 0% and 30%') as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }

  const driverFeeRate = toRate(normalized);
  const row = await prisma.platformSetting.upsert({
    where: { id: SETTING_ID },
    update: { driverFeeRate: decimalRate(driverFeeRate) },
    create: { id: SETTING_ID, driverFeeRate: decimalRate(driverFeeRate) },
  });
  const settings = toSettings(Number(row.driverFeeRate), row.updatedAt);
  await publishLiveFee(settings);
  return settings;
}

export async function getDriverFeeRate() {
  if (liveFee) return liveFee.driverFeeRate;

  const cached = await readRedisFee();
  if (cached) {
    setLiveFee(cached);
    return cached.driverFeeRate;
  }

  try {
    return (await getPlatformSettings()).driverFeeRate;
  } catch (error) {
    console.error('Could not load driver fee; using default 5%', error);
    return DEFAULT_PLATFORM_FEE_RATE;
  }
}
