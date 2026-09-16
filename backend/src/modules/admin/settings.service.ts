import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.ts';
import { redis } from '../../lib/redis.ts';

export const DEFAULT_PLATFORM_FEE_RATE = 0.05;
export const DEFAULT_STATE_DRIVER_PAYOUT = 0.5;
const SETTING_ID = 'default';
const REDIS_KEY = 'raac:platform:settings';
const REDIS_KEY_LEGACY = 'raac:platform:driverFee';

export type PlatformSettings = {
  driverFeeRate: number;
  driverFeePercent: number;
  stateDriverPayout: number;
  updatedAt: string;
  live: true;
};

/** @deprecated use PlatformSettings */
export type PlatformFeeSettings = PlatformSettings;

let liveSettings: PlatformSettings | null = null;

function toPercent(rate: number) {
  return Math.round(rate * 10000) / 100;
}

function toRate(percent: number) {
  return Math.round(percent * 100) / 10000;
}

function moneyPayout(n: number) {
  return Math.round(n * 100) / 100;
}

function toSettings(
  rate: number,
  payout: number,
  updatedAt: Date | string
): PlatformSettings {
  const driverFeeRate = toRate(toPercent(rate));
  return {
    driverFeeRate,
    driverFeePercent: toPercent(driverFeeRate),
    stateDriverPayout: moneyPayout(payout),
    updatedAt: typeof updatedAt === 'string' ? updatedAt : updatedAt.toISOString(),
    live: true,
  };
}

function setLiveSettings(next: PlatformSettings) {
  liveSettings = next;
}

async function publishLiveSettings(next: PlatformSettings) {
  setLiveSettings(next);
  try {
    if (redis.status === 'ready') {
      await redis.set(REDIS_KEY, JSON.stringify(next));
    }
  } catch {
    // Redis is optional; DB + process memory still apply immediately.
  }
}

export function getLivePlatformFee(): PlatformSettings {
  return liveSettings ?? toSettings(DEFAULT_PLATFORM_FEE_RATE, DEFAULT_STATE_DRIVER_PAYOUT, new Date());
}

export function getLiveStateDriverPayout() {
  return getLivePlatformFee().stateDriverPayout;
}

async function readRedisSettings(): Promise<PlatformSettings | null> {
  try {
    if (redis.status !== 'ready') return null;
    const raw = (await redis.get(REDIS_KEY)) || (await redis.get(REDIS_KEY_LEGACY));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PlatformSettings> & { driverFeeRate?: number };
    if (typeof parsed.driverFeeRate !== 'number' || !Number.isFinite(parsed.driverFeeRate)) {
      return null;
    }
    const payout =
      typeof parsed.stateDriverPayout === 'number' && Number.isFinite(parsed.stateDriverPayout)
        ? parsed.stateDriverPayout
        : DEFAULT_STATE_DRIVER_PAYOUT;
    return toSettings(parsed.driverFeeRate, payout, parsed.updatedAt || new Date());
  } catch {
    return null;
  }
}

function decimalRate(rate: number) {
  return new Prisma.Decimal(toRate(toPercent(rate)).toFixed(4));
}

function decimalMoney(n: number) {
  return new Prisma.Decimal(moneyPayout(n).toFixed(2));
}

export async function getPlatformSettings() {
  const row = await prisma.platformSetting.upsert({
    where: { id: SETTING_ID },
    update: {},
    create: {
      id: SETTING_ID,
      driverFeeRate: decimalRate(DEFAULT_PLATFORM_FEE_RATE),
      stateDriverPayout: decimalMoney(DEFAULT_STATE_DRIVER_PAYOUT),
    },
  });
  const settings = toSettings(
    Number(row.driverFeeRate),
    Number(row.stateDriverPayout ?? DEFAULT_STATE_DRIVER_PAYOUT),
    row.updatedAt
  );
  await publishLiveSettings(settings);
  return settings;
}

export async function patchPlatformSettings(input: {
  driverFeePercent?: number;
  stateDriverPayout?: number;
}) {
  const current = await getPlatformSettings();
  let driverFeeRate = current.driverFeeRate;
  let stateDriverPayout = current.stateDriverPayout;

  if (input.driverFeePercent != null) {
    const normalized = Math.round(Number(input.driverFeePercent) * 100) / 100;
    if (!Number.isFinite(normalized) || normalized < 0 || normalized > 30) {
      const error = new Error('Fee must be between 0% and 30%') as Error & { statusCode?: number };
      error.statusCode = 400;
      throw error;
    }
    driverFeeRate = toRate(normalized);
  }

  if (input.stateDriverPayout != null) {
    const payout = moneyPayout(Number(input.stateDriverPayout));
    if (!Number.isFinite(payout) || payout < 0 || payout > 50) {
      const error = new Error('Driver payout must be between $0 and $50') as Error & {
        statusCode?: number;
      };
      error.statusCode = 400;
      throw error;
    }
    stateDriverPayout = payout;
  }

  const row = await prisma.platformSetting.upsert({
    where: { id: SETTING_ID },
    update: {
      driverFeeRate: decimalRate(driverFeeRate),
      stateDriverPayout: decimalMoney(stateDriverPayout),
    },
    create: {
      id: SETTING_ID,
      driverFeeRate: decimalRate(driverFeeRate),
      stateDriverPayout: decimalMoney(stateDriverPayout),
    },
  });
  const settings = toSettings(Number(row.driverFeeRate), Number(row.stateDriverPayout), row.updatedAt);
  await publishLiveSettings(settings);
  return settings;
}

export async function getDriverFeeRate() {
  if (liveSettings) return liveSettings.driverFeeRate;

  const cached = await readRedisSettings();
  if (cached) {
    setLiveSettings(cached);
    return cached.driverFeeRate;
  }

  try {
    return (await getPlatformSettings()).driverFeeRate;
  } catch (error) {
    console.error('Could not load driver fee; using default 5%', error);
    return DEFAULT_PLATFORM_FEE_RATE;
  }
}

export async function getStateDriverPayout() {
  if (liveSettings) return liveSettings.stateDriverPayout;

  const cached = await readRedisSettings();
  if (cached) {
    setLiveSettings(cached);
    return cached.stateDriverPayout;
  }

  try {
    return (await getPlatformSettings()).stateDriverPayout;
  } catch (error) {
    console.error('Could not load state driver payout; using $0.50', error);
    return DEFAULT_STATE_DRIVER_PAYOUT;
  }
}
