import { DeliveryStatus } from '@prisma/client';
import { prisma } from './prisma.ts';
import {
  SEARCH_TIMEOUT_SEC,
  OFFLINE_CANCEL_GRACE_SEC,
  ensureOfferAssignment,
} from '../modules/deliveries/deliveries.service.ts';

const TICK_MS = 2000;

/**
 * Automatic Uber-style timeout:
 * OFFERED → (30s) → EXPIRED → AVAILABLE → offer next driver.
 * No online drivers → cancel after OFFLINE_CANCEL_GRACE_SEC + API_PREAUTHORIZE_CANCEL.
 * After SEARCH_TIMEOUT with no accept → cancel + API_PREAUTHORIZE_CANCEL.
 */
export async function sweepExpiredOffers() {
  const now = new Date();
  const searchDeadline = new Date(now.getTime() - SEARCH_TIMEOUT_SEC * 1000);
  const offlineDeadline = new Date(now.getTime() - OFFLINE_CANCEL_GRACE_SEC * 1000);

  const rows = await prisma.deliveryRequest.findMany({
    where: {
      status: DeliveryStatus.PENDING,
      OR: [
        { offeredToDriverId: { not: null }, offerExpiresAt: { lte: now } },
        { offeredToDriverId: null, offerExpiresAt: null },
        { offeredToDriverId: null, offerExpiresAt: { lte: now } },
        { createdAt: { lte: searchDeadline } },
        { createdAt: { lte: offlineDeadline } },
      ],
    },
    orderBy: { createdAt: 'asc' },
    take: 40,
  });

  for (const row of rows) {
    try {
      await ensureOfferAssignment(row);
    } catch (error) {
      console.warn('[offer-sweeper] rotate failed', row.id, error);
    }
  }
}

export function startOfferSweeper() {
  let busy = false;
  const tick = async () => {
    if (busy) return;
    busy = true;
    try {
      await sweepExpiredOffers();
    } catch (error) {
      console.warn('[offer-sweeper]', error);
    } finally {
      busy = false;
    }
  };

  const id = setInterval(tick, TICK_MS);
  void tick();
  console.log(
    `[offer-sweeper] started (every ${TICK_MS}ms, offline grace ${OFFLINE_CANCEL_GRACE_SEC}s, search timeout ${SEARCH_TIMEOUT_SEC}s)`
  );
  return () => clearInterval(id);
}
