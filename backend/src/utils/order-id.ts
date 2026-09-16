import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '../lib/prisma.ts';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

export function randomOrderCode(length = CODE_LENGTH) {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

export function isShortOrderCode(orderId: string) {
  return new RegExp(`^[${ALPHABET}]{${CODE_LENGTH}}$`).test(orderId.replace(/^#/, '').toUpperCase());
}

export function formatOrderCode(orderId: string) {
  const raw = (orderId || '').replace(/^#/, '').trim();
  if (!raw) return '—';
  if (isShortOrderCode(raw)) return `#${raw.toUpperCase()}`;
  return `#${codeFromLegacy(raw)}`;
}

export function normalizeOrderCode(orderId: string) {
  return orderId.replace(/^#/, '').trim().toUpperCase();
}

function codeFromLegacy(orderId: string) {
  const hex = createHash('sha1').update(orderId).digest();
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += ALPHABET[hex[i] % ALPHABET.length];
  }
  return out;
}

export async function allocateOrderId(preferred?: string) {
  if (preferred && isShortOrderCode(preferred)) {
    const code = normalizeOrderCode(preferred);
    const exists = await prisma.deliveryRequest.findUnique({ where: { orderId: code } });
    if (!exists) return code;
  }

  for (let i = 0; i < 16; i++) {
    const code = randomOrderCode();
    const exists = await prisma.deliveryRequest.findUnique({ where: { orderId: code } });
    if (!exists) return code;
  }

  throw new Error('Could not allocate a trip code');
}

export async function shortenLegacyOrderIds() {
  const rows = await prisma.deliveryRequest.findMany({
    select: { id: true, orderId: true },
  });

  const used = new Set(rows.map((row) => row.orderId));

  for (const row of rows) {
    if (isShortOrderCode(row.orderId)) continue;

    let next = codeFromLegacy(row.orderId);
    while (used.has(next) && next !== row.orderId) {
      next = randomOrderCode();
    }
    used.delete(row.orderId);
    used.add(next);
    await prisma.deliveryRequest.update({
      where: { id: row.id },
      data: { orderId: next },
    });
  }
}
