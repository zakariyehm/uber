import {
  DeliveryStatus,
  PaymentHoldStatus,
  Prisma,
  ServiceCategory,
  SettlementType,
  UserRole,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma.ts';
import { toDeliveryDto } from '../../utils/delivery-mapper.ts';
import { looksLikeOpenFleetMethod } from '../../utils/vehicle-type.ts';
import { AuthError, registerUser, toPublicUser } from '../auth/auth.service.ts';
import { applyDeliveryAction } from '../deliveries/deliveries.service.ts';
import { syncDriverWallet } from '../wallet/wallet.service.ts';
import { getPlatformSettings } from './settings.service.ts';
import { forceDriverFullyOffline } from '../../lib/driver-session.ts';

const ACTIVE_TRIP_STATUSES: DeliveryStatus[] = [
  DeliveryStatus.PENDING,
  DeliveryStatus.ACCEPTED,
  DeliveryStatus.PICKED_UP,
  DeliveryStatus.IN_TRANSIT,
];

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function money(value: Prisma.Decimal | number | null | undefined) {
  return Number(value ?? 0);
}

function moneyStr(value: Prisma.Decimal | number | null | undefined) {
  return money(value).toFixed(2);
}

function displayName(user: {
  firstName: string | null;
  lastName: string | null;
  driverProfile?: { displayName: string | null } | null;
  riderProfile?: { displayName: string | null } | null;
}) {
  return (
    [user.firstName, user.lastName].filter(Boolean).join(' ') ||
    user.driverProfile?.displayName ||
    user.riderProfile?.displayName ||
    '—'
  );
}

function somaliaPhone(phone: string) {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('252')) digits = digits.slice(3);
  if (digits.startsWith('0')) digits = digits.slice(1);
  return `+252${digits}`;
}

function adminError(message: string, statusCode: number, code = 'admin/invalid') {
  return new AuthError(message, code, statusCode);
}

async function settledSums(from?: Date) {
  const where: Prisma.DeliveryRequestWhereInput = {
    paymentHoldStatus: PaymentHoldStatus.COMMITTED,
    settlementType: { in: [SettlementType.FULL, SettlementType.NO_SHOW] },
    ...(from ? { settledAt: { gte: from } } : {}),
  };

  const rows = await prisma.deliveryRequest.findMany({
    where,
    select: {
      settlementType: true,
      deliveryMethod: true,
      deliveryPrice: true,
      platformFee: true,
      driverEarnings: true,
      stateShare: true,
      riderRefundPending: true,
    },
  });

  const totals = rows.reduce(
    (acc, row) => {
      const price = money(row.deliveryPrice);
      const driver = money(row.driverEarnings);
      acc.gmv += price;
      acc.driverEarnings += driver;
      acc.riderRefundPending += money(row.riderRefundPending);
      acc.count += 1;
      if (row.settlementType === SettlementType.FULL) acc.fullTrips += 1;
      if (row.settlementType === SettlementType.NO_SHOW) acc.noShows += 1;

      if (row.settlementType === SettlementType.FULL && looksLikeOpenFleetMethod(row.deliveryMethod)) {
        const stored = money(row.stateShare);
        acc.deliveryStateBalance +=
          stored > 0 ? stored : Math.max(0, Math.round((price - driver) * 100) / 100);
      } else {
        acc.platformFee += money(row.platformFee);
      }
      return acc;
    },
    {
      gmv: 0,
      platformFee: 0,
      driverEarnings: 0,
      riderRefundPending: 0,
      deliveryStateBalance: 0,
      count: 0,
      fullTrips: 0,
      noShows: 0,
    }
  );

  return {
    gmv: moneyStr(totals.gmv),
    platformFee: moneyStr(totals.platformFee),
    driverEarnings: moneyStr(totals.driverEarnings),
    riderRefundPending: moneyStr(totals.riderRefundPending),
    deliveryStateBalance: moneyStr(totals.deliveryStateBalance),
    settledCount: totals.count,
    fullTrips: totals.fullTrips,
    noShows: totals.noShows,
  };
}

export async function getOverview() {
  const today = startOfToday();

  const [
    todaySettled,
    allSettled,
    statusGroups,
    todayStatusGroups,
    onlineDrivers,
    totalDrivers,
    totalRiders,
    newRidersToday,
    riderPendingAgg,
    pendingOffers,
    feeSettings,
  ] = await Promise.all([
    settledSums(today),
    settledSums(),
    prisma.deliveryRequest.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    prisma.deliveryRequest.groupBy({
      by: ['status'],
      where: { createdAt: { gte: today } },
      _count: { _all: true },
    }),
    prisma.driverProfile.count({ where: { isOnline: true } }),
    prisma.user.count({ where: { role: UserRole.DRIVER } }),
    prisma.user.count({ where: { role: UserRole.RIDER } }),
    prisma.user.count({ where: { role: UserRole.RIDER, createdAt: { gte: today } } }),
    prisma.riderWallet.aggregate({ _sum: { pendingBalance: true } }),
    prisma.deliveryRequest.count({
      where: { status: DeliveryStatus.PENDING, offeredToDriverId: { not: null } },
    }),
    getPlatformSettings(),
  ]);

  const tripsByStatus = Object.fromEntries(
    statusGroups.map((row) => [row.status, row._count._all])
  ) as Record<string, number>;
  const todayTripsByStatus = Object.fromEntries(
    todayStatusGroups.map((row) => [row.status, row._count._all])
  ) as Record<string, number>;

  const liveTrips = ACTIVE_TRIP_STATUSES.reduce((sum, status) => sum + (tripsByStatus[status] || 0), 0);

  return {
    generatedAt: new Date().toISOString(),
    today: {
      ...todaySettled,
      tripsCreated: todayStatusGroups.reduce((sum, row) => sum + row._count._all, 0),
      tripsByStatus: todayTripsByStatus,
      newRiders: newRidersToday,
    },
    allTime: {
      ...allSettled,
      tripsByStatus,
      riders: totalRiders,
      drivers: totalDrivers,
    },
    fleet: {
      onlineDrivers,
      offlineDrivers: Math.max(0, totalDrivers - onlineDrivers),
      totalDrivers,
      liveTrips,
      pendingOffers,
    },
    wallets: {
      riderPendingCredits: moneyStr(riderPendingAgg._sum.pendingBalance),
      deliveryStateBalance: allSettled.deliveryStateBalance,
    },
    driverFeePercent: feeSettings.driverFeePercent,
    stateDriverPayout: feeSettings.stateDriverPayout,
  };
}

export async function getLiveOps() {
  const [trips, drivers] = await Promise.all([
    prisma.deliveryRequest.findMany({
      where: { status: { in: ACTIVE_TRIP_STATUSES } },
      include: {
        rider: { include: { riderProfile: true } },
        driver: { include: { driverProfile: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 80,
    }),
    prisma.driverProfile.findMany({
      where: { isOnline: true },
      include: {
        user: {
          include: {
            wallet: true,
            activeDelivery: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    }),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    trips: trips.map((row) => ({
      ...toDeliveryDto(row),
      riderName: row.rider ? displayName(row.rider) : row.senderName || '—',
      riderPhone: row.rider?.phone || row.senderPhone || null,
      driverPhone: row.driver?.phone || null,
    })),
    onlineDrivers: drivers.map((profile) => ({
      id: profile.userId,
      name: profile.displayName || displayName(profile.user),
      phone: profile.user.phone,
      rating: Number(profile.rating).toFixed(2),
      isOnline: profile.isOnline,
      isActive: profile.user.isActive,
      vehicleType: profile.vehicleType,
      activeTripId: profile.user.activeDelivery?.requestId || null,
      todayBalance: moneyStr(profile.user.wallet?.balance),
    })),
  };
}

function parseDeliveryStatus(raw?: string): DeliveryStatus | null {
  if (!raw) return null;
  const status = raw.trim().toUpperCase().replace(/[-\s]+/g, '_');
  return (Object.values(DeliveryStatus) as string[]).includes(status)
    ? (status as DeliveryStatus)
    : null;
}

async function stateMethodNames() {
  const rows = await prisma.serviceMethod.findMany({
    where: { category: ServiceCategory.DELIVERY_STATE },
    select: { name: true },
  });
  return rows.map((row) => row.name).filter(Boolean);
}

function methodInList(names: string[]): Prisma.DeliveryRequestWhereInput {
  if (!names.length) return { id: { in: [] } };
  return {
    OR: names.map((name) => ({
      deliveryMethod: { equals: name, mode: 'insensitive' as const },
    })),
  };
}

async function tripKindWhere(kind?: string): Promise<Prisma.DeliveryRequestWhereInput | null> {
  const raw = String(kind || '').trim().toUpperCase();
  if (raw !== 'LOCAL' && raw !== 'STATE' && raw !== 'MOTO' && raw !== 'DELIVERY_STATE') {
    return null;
  }
  const stateNames = await stateMethodNames();
  const isState = raw === 'STATE' || raw === 'DELIVERY_STATE';
  if (isState) return methodInList(stateNames);
  if (!stateNames.length) return {};
  return { NOT: methodInList(stateNames) };
}

async function listTripMethodOptions(kind?: string) {
  const raw = String(kind || '').trim().toUpperCase();
  const category =
    raw === 'STATE' || raw === 'DELIVERY_STATE'
      ? ServiceCategory.DELIVERY_STATE
      : raw === 'LOCAL' || raw === 'MOTO'
        ? ServiceCategory.MOTO
        : undefined;

  const [catalog, used] = await Promise.all([
    prisma.serviceMethod.findMany({
      where: category ? { category } : undefined,
      select: { name: true, category: true, sortOrder: true },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    }),
    category
      ? Promise.resolve([] as { deliveryMethod: string }[])
      : prisma.deliveryRequest.findMany({
          distinct: ['deliveryMethod'],
          select: { deliveryMethod: true },
          orderBy: { deliveryMethod: 'asc' },
        }),
  ]);

  const seen = new Set<string>();
  const methods: string[] = [];
  for (const row of [...catalog, ...used]) {
    const name = ('name' in row ? row.name : row.deliveryMethod).trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    methods.push(name);
  }
  return methods;
}

export async function listTrips(input: {
  status?: string;
  method?: string;
  vehicleType?: string;
  category?: string;
  q?: string;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, input.page || 1);
  const limit = Math.min(50, Math.max(1, input.limit || 20));
  const skip = (page - 1) * limit;

  const and: Prisma.DeliveryRequestWhereInput[] = [];
  const status = parseDeliveryStatus(input.status);
  if (status) and.push({ status });
  const method = input.method?.trim();
  if (method) {
    and.push({ deliveryMethod: { equals: method, mode: 'insensitive' } });
  }
  if (input.vehicleType === 'MOTORCYCLE' || input.vehicleType === 'BICYCLE') {
    and.push({ vehicleType: input.vehicleType });
  }
  const kindWhere = await tripKindWhere(input.category);
  if (kindWhere) and.push(kindWhere);
  if (input.q) {
    const q = input.q.trim().replace(/^#/, '');
    and.push({
      OR: [
        { orderId: { contains: q, mode: 'insensitive' } },
        { pickupLocation: { contains: q, mode: 'insensitive' } },
        { destinationLocation: { contains: q, mode: 'insensitive' } },
        { senderName: { contains: q, mode: 'insensitive' } },
        { senderPhone: { contains: q, mode: 'insensitive' } },
        { recipientName: { contains: q, mode: 'insensitive' } },
        { recipientNumber: { contains: q, mode: 'insensitive' } },
        { driverName: { contains: q, mode: 'insensitive' } },
        { rider: { phone: { contains: q, mode: 'insensitive' } } },
        { driver: { phone: { contains: q, mode: 'insensitive' } } },
      ],
    });
  }

  const where: Prisma.DeliveryRequestWhereInput = and.length ? { AND: and } : {};

  const [rows, total, methods, stateNames] = await Promise.all([
    prisma.deliveryRequest.findMany({
      where,
      include: {
        rider: { include: { riderProfile: true } },
        driver: { include: { driverProfile: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.deliveryRequest.count({ where }),
    listTripMethodOptions(input.category),
    stateMethodNames(),
  ]);

  const stateSet = new Set(stateNames.map((name) => name.trim().toLowerCase()));

  return {
    page,
    limit,
    total,
    methods,
    trips: rows.map((row) => ({
      ...toDeliveryDto(row),
      tripKind: stateSet.has((row.deliveryMethod || '').trim().toLowerCase()) ? 'STATE' : 'LOCAL',
      riderName: row.rider ? displayName(row.rider) : row.senderName || '—',
      riderPhone: row.rider?.phone || row.senderPhone || null,
      driverPhone: row.driver?.phone || null,
    })),
  };
}

export async function getTrip(id: string) {
  const row = await prisma.deliveryRequest.findUnique({
    where: { id },
    include: {
      rider: { include: { riderProfile: true, riderWallet: true } },
      driver: { include: { driverProfile: true, wallet: true } },
    },
  });
  if (!row) return null;

  return {
    trip: toDeliveryDto(row),
    rider: row.rider
      ? {
          id: row.rider.id,
          name: displayName(row.rider),
          phone: row.rider.phone,
          rating: row.rider.riderProfile ? Number(row.rider.riderProfile.rating).toFixed(2) : null,
          pendingBalance: moneyStr(row.rider.riderWallet?.pendingBalance),
          isActive: row.rider.isActive,
        }
      : null,
    driver: row.driver
      ? {
          id: row.driver.id,
          name: displayName(row.driver),
          phone: row.driver.phone,
          rating: row.driver.driverProfile ? Number(row.driver.driverProfile.rating).toFixed(2) : null,
          isOnline: Boolean(row.driver.driverProfile?.isOnline),
          todayBalance: moneyStr(row.driver.wallet?.balance),
          isActive: row.driver.isActive,
          vehicleType: row.driver.driverProfile?.vehicleType || row.vehicleType,
        }
      : null,
  };
}

export async function cancelTrip(id: string, reason?: string) {
  return applyDeliveryAction(id, 'cancel', undefined, {
    cancelledBy: 'system',
    cancelReason: reason || 'admin_cancel',
  });
}

export async function createDriver(input: {
  phone: string;
  password: string;
  firstName?: string;
  lastName?: string;
  vehicleType: 'MOTORCYCLE' | 'BICYCLE';
}) {
  const phone = somaliaPhone(input.phone);
  if (!/^\+252\d{8,10}$/.test(phone)) {
    throw adminError('Enter a valid Somalia phone number', 400);
  }
  if (!input.password || input.password.length < 6) {
    throw adminError('Password must be at least 6 characters', 400);
  }

  const user = await registerUser({
    phone,
    password: input.password,
    firstName: input.firstName?.trim() || undefined,
    lastName: input.lastName?.trim() || undefined,
    role: 'DRIVER',
    vehicleType: input.vehicleType,
  });

  return {
    ...toPublicUser(user),
    name: displayName(user),
    isActive: user.isActive,
    vehicleType: user.driverProfile?.vehicleType || input.vehicleType,
  };
}

export async function listUsers(input: {
  role?: 'RIDER' | 'DRIVER';
  q?: string;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, input.page || 1);
  const limit = Math.min(50, Math.max(1, input.limit || 20));
  const skip = (page - 1) * limit;

  const where: Prisma.UserWhereInput = {
    role: input.role === 'DRIVER' ? UserRole.DRIVER : input.role === 'RIDER' ? UserRole.RIDER : undefined,
  };
  if (!input.role) {
    where.role = { in: [UserRole.RIDER, UserRole.DRIVER] };
  }
  if (input.q) {
    const q = input.q.trim();
    where.OR = [
      { phone: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        riderProfile: true,
        driverProfile: true,
        wallet: true,
        riderWallet: true,
        _count: {
          select: {
            riderDeliveries: true,
            driverDeliveries: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    page,
    limit,
    total,
    users: rows.map((user) => ({
      id: user.id,
      role: user.role,
      name: displayName(user),
      phone: user.phone,
      email: user.email,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      rating:
        user.role === UserRole.DRIVER
          ? Number(user.driverProfile?.rating ?? 0).toFixed(2)
          : Number(user.riderProfile?.rating ?? 0).toFixed(2),
      isOnline: Boolean(user.driverProfile?.isOnline),
      vehicleType: user.role === UserRole.DRIVER ? user.driverProfile?.vehicleType || 'MOTORCYCLE' : null,
      tripCount:
        user.role === UserRole.DRIVER ? user._count.driverDeliveries : user._count.riderDeliveries,
      todayBalance: user.wallet ? moneyStr(user.wallet.balance) : null,
      pendingBalance: user.riderWallet ? moneyStr(user.riderWallet.pendingBalance) : null,
    })),
  };
}

export async function patchUser(
  id: string,
  input: { isActive?: boolean; forceOffline?: boolean; vehicleType?: 'MOTORCYCLE' | 'BICYCLE' }
) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: { driverProfile: true },
  });
  if (!user) {
    const error = new Error('User not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }
  if (user.role === UserRole.ADMIN) {
    const error = new Error('Cannot modify the owner account') as Error & { statusCode?: number };
    error.statusCode = 403;
    throw error;
  }

  const nextActive = input.isActive ?? user.isActive;
  const shouldOffline = input.forceOffline || nextActive === false;

  const updated = await prisma.user.update({
    where: { id },
    data: { isActive: nextActive },
    include: { driverProfile: true, riderProfile: true, wallet: true, riderWallet: true },
  });

  if (updated.role === UserRole.DRIVER && updated.driverProfile && shouldOffline) {
    await forceDriverFullyOffline(id);
  }

  if (updated.role === UserRole.DRIVER && input.vehicleType) {
    await prisma.driverProfile.update({
      where: { userId: id },
      data: { vehicleType: input.vehicleType },
    });
  }

  return {
    id: updated.id,
    role: updated.role,
    name: displayName(updated),
    phone: updated.phone,
    isActive: updated.isActive,
    isOnline: shouldOffline ? false : Boolean(updated.driverProfile?.isOnline),
    vehicleType: input.vehicleType || updated.driverProfile?.vehicleType || null,
  };
}

export async function resetUserPassword(id: string, password: string) {
  if (!password || password.length < 6) {
    throw adminError('Password must be at least 6 characters', 400);
  }
  if (password.length > 64) {
    throw adminError('Password is too long', 400);
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw adminError('User not found', 404);
  }
  if (user.role === UserRole.ADMIN) {
    throw adminError('Cannot reset the owner password here', 403);
  }
  if (user.role !== UserRole.DRIVER) {
    throw adminError('Only driver passwords can be reset', 400);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const updated = await prisma.user.update({
    where: { id },
    data: { passwordHash },
    include: { driverProfile: true, riderProfile: true },
  });

  return {
    id: updated.id,
    role: updated.role,
    name: displayName(updated),
    phone: updated.phone,
    password,
  };
}

export async function deleteDriver(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: { driverProfile: true },
  });
  if (!user || user.role !== UserRole.DRIVER) {
    throw adminError('Driver not found', 404);
  }

  const liveTrips = await prisma.deliveryRequest.findMany({
    where: {
      driverUserId: id,
      status: {
        in: [DeliveryStatus.ACCEPTED, DeliveryStatus.PICKED_UP, DeliveryStatus.IN_TRANSIT],
      },
    },
    select: { id: true },
  });
  for (const trip of liveTrips) {
    await cancelTrip(trip.id, 'driver_deleted');
  }

  await forceDriverFullyOffline(id);

  await prisma.$transaction([
    prisma.deliveryRequest.updateMany({
      where: { offeredToDriverId: id, status: DeliveryStatus.PENDING },
      data: { offeredToDriverId: null, offerExpiresAt: null },
    }),
    prisma.deliveryRequest.updateMany({
      where: { driverUserId: id },
      data: { driverUserId: null },
    }),
    prisma.user.delete({ where: { id } }),
  ]);

  return { ok: true, id };
}

export async function listPayments(input: {
  status?: string;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, input.page || 1);
  const limit = Math.min(50, Math.max(1, input.limit || 20));
  const skip = (page - 1) * limit;

  // Include Waafi holds plus recipient-pays trips awaiting / after collection.
  const where: Prisma.DeliveryRequestWhereInput = {};
  if (input.status) {
    const status = input.status.toUpperCase() as PaymentHoldStatus;
    if ((Object.values(PaymentHoldStatus) as string[]).includes(status)) {
      where.paymentHoldStatus = status;
    }
  } else {
    where.OR = [
      { NOT: { paymentHoldStatus: PaymentHoldStatus.NONE } },
      { payerType: 'RECIPIENT' },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.deliveryRequest.findMany({
      where,
      include: {
        rider: true,
        driver: true,
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.deliveryRequest.count({ where }),
  ]);

  return {
    page,
    limit,
    total,
    payments: rows.map((row) => {
      const dto = toDeliveryDto(row);
      return {
        id: row.id,
        orderId: row.orderId,
        amount: moneyStr(row.deliveryPrice),
        status: row.paymentHoldStatus,
        settlementType: row.settlementType,
        payerType: row.payerType,
        paymentRequested: row.paymentRequested,
        paymentRequestedAt: row.paymentRequestedAt?.toISOString() || null,
        recipientNumber: row.recipientNumber,
        deliveryMethod: row.deliveryMethod,
        openToAllVehicleTypes: dto.openToAllVehicleTypes,
        driverEarnings: dto.driverEarnings || null,
        platformFee: dto.platformFee || null,
        stateShare: dto.stateShare || null,
        riderRefundPending: row.riderRefundPending != null ? moneyStr(row.riderRefundPending) : null,
        waafiTransactionId: row.waafiTransactionId,
        heldAt: row.paymentHeldAt?.toISOString() || null,
        committedAt: row.paymentCommittedAt?.toISOString() || null,
        releasedAt: row.paymentReleasedAt?.toISOString() || null,
        settledAt: row.settledAt?.toISOString() || null,
        riderPhone: row.rider?.phone || row.senderPhone || null,
        driverName: row.driverName,
        tripStatus: row.status,
      };
    }),
  };
}

export async function listWallets() {
  const [drivers, riders] = await Promise.all([
    prisma.driverWallet.findMany({
      include: {
        driver: { include: { driverProfile: true } },
      },
      orderBy: { balance: 'desc' },
    }),
    prisma.riderWallet.findMany({
      include: {
        rider: { include: { riderProfile: true } },
      },
      orderBy: { pendingBalance: 'desc' },
    }),
  ]);

  const driverRows = await Promise.all(
    drivers.map(async (wallet) => {
      const synced = await syncDriverWallet(wallet.driverUserId);
      return {
        userId: wallet.driverUserId,
        name: displayName(wallet.driver),
        phone: wallet.driver.phone,
        isActive: wallet.driver.isActive,
        isOnline: Boolean(wallet.driver.driverProfile?.isOnline),
        todayBalance: synced.todayEarnings,
        totalBalance: synced.totalBalance,
        tripsCompletedToday: synced.todayCompleted,
        tripsCancelled: synced.tripsCancelled,
        updatedAt: synced.updatedAt,
      };
    })
  );

  const settings = await getPlatformSettings();
  return {
    deliveryStateBalance: (await settledSums()).deliveryStateBalance,
    stateDriverPayout: settings.stateDriverPayout,
    drivers: driverRows,
    riders: riders.map((wallet) => ({
      userId: wallet.riderUserId,
      name: displayName(wallet.rider),
      phone: wallet.rider.phone,
      isActive: wallet.rider.isActive,
      pendingBalance: moneyStr(wallet.pendingBalance),
      updatedAt: wallet.updatedAt.toISOString(),
    })),
  };
}
