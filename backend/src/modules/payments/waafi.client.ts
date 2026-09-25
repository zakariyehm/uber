/**
 * WaafiPay client
 * Docs: https://docs.waafipay.com/preauthorization-api
 *       https://docs.waafipay.com/purchase-api
 *
 * Actions (serviceName):
 * - API_PREAUTHORIZE        → hold funds (no deduction yet)
 * - API_PREAUTHORIZE_COMMIT → capture held funds
 * - API_PREAUTHORIZE_CANCEL → release held funds
 * - API_PURCHASE            → charge immediately (wallet top-up)
 */
import { randomUUID } from 'node:crypto';
import { env } from '../../config/env.ts';

export type WaafiResult = {
  ok: boolean;
  transactionId?: string;
  referenceId?: string;
  state?: string;
  responseCode?: string;
  responseMsg?: string;
  mock?: boolean;
  raw?: unknown;
};

/** Docs: full international format, no +, no leading zeros — e.g. 252611111111 */
export function normalizeWaafiPhone(phone: string): string {
  let digits = phone.replace(/[^\d]/g, '').replace(/^0+/, '');
  if (digits.length === 9 && /^6\d{8}$/.test(digits)) {
    digits = `252${digits}`;
  }
  if (digits.startsWith('2520')) {
    digits = `252${digits.slice(4)}`;
  }
  return digits;
}

/** Docs: referenceId length 10–30; only letters, numbers, dashes, underscores, dots */
export function toWaafiReferenceId(raw: string): string {
  let id = raw.replace(/[^a-zA-Z0-9._-]/g, '');
  if (id.length < 10) {
    id = `${id}${randomUUID().replace(/-/g, '')}`.slice(0, 16);
  }
  return id.slice(0, 30);
}

function waafiConfigured() {
  return Boolean(env.WAAFI_MERCHANT_UID && env.WAAFI_API_USER_ID && env.WAAFI_API_KEY);
}

function waafiTimestamp() {
  // Example from docs: "2024-11-05 08:52:06.287"
  return new Date().toISOString().replace('T', ' ').replace('Z', '');
}

async function postAsm(serviceName: string, serviceParams: Record<string, unknown>): Promise<WaafiResult> {
  if (env.WAAFI_MOCK || !waafiConfigured()) {
    console.warn('[Waafi] MOCK mode', { serviceName });
    return {
      ok: true,
      mock: true,
      transactionId: `MOCK_${randomUUID().replace(/-/g, '').slice(0, 12)}`,
      referenceId: String(
        (serviceParams as { transactionInfo?: { referenceId?: string } }).transactionInfo?.referenceId ||
          (serviceParams as { transactionId?: string }).transactionId ||
          randomUUID()
      ),
      state: 'APPROVED',
      responseCode: '2001',
      responseMsg: 'RCS_SUCCESS_MOCK',
    };
  }

  const body = {
    schemaVersion: '1.0',
    requestId: randomUUID(),
    timestamp: waafiTimestamp(),
    channelName: 'WEB',
    serviceName,
    serviceParams: {
      merchantUid: env.WAAFI_MERCHANT_UID,
      // Docs show apiUserId as numeric in examples
      apiUserId: Number(env.WAAFI_API_USER_ID) || env.WAAFI_API_USER_ID,
      apiKey: env.WAAFI_API_KEY,
      ...serviceParams,
    },
  };

  console.log('[Waafi] →', serviceName, {
    url: env.WAAFI_API_URL,
    accountNo: (serviceParams as { payerInfo?: { accountNo?: string } }).payerInfo?.accountNo,
    amount: (serviceParams as { transactionInfo?: { amount?: string } }).transactionInfo?.amount,
    referenceId: (serviceParams as { transactionInfo?: { referenceId?: string } }).transactionInfo
      ?.referenceId,
    transactionId: (serviceParams as { transactionId?: string }).transactionId,
  });

  const res = await fetch(env.WAAFI_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });

  const raw = (await res.json().catch(() => ({}))) as {
    responseCode?: string;
    errorCode?: string;
    responseMsg?: string;
    params?: { transactionId?: string; referenceId?: string; state?: string; txAmount?: string };
  };

  const transactionId = raw.params?.transactionId;
  const state = raw.params?.state;
  // Docs success: responseCode "2001", responseMsg "RCS_SUCCESS", state "APPROVED"
  const ok = raw.responseCode === '2001' && Boolean(transactionId);

  console.log('[Waafi] ←', serviceName, {
    http: res.status,
    responseCode: raw.responseCode,
    responseMsg: raw.responseMsg,
    transactionId,
    state,
    ok,
  });

  return {
    ok,
    transactionId,
    referenceId: raw.params?.referenceId,
    state,
    responseCode: raw.responseCode,
    responseMsg: raw.responseMsg,
    raw,
  };
}

/** 1. PreAuthorization — hold amount (API_PREAUTHORIZE) */
export async function waafiPreAuthorize(input: {
  accountNo: string;
  amount: number;
  referenceId: string;
  description: string;
}): Promise<WaafiResult> {
  const accountNo = normalizeWaafiPhone(input.accountNo);
  const referenceId = toWaafiReferenceId(input.referenceId);
  const amount = Number(input.amount).toFixed(2);
  let description = input.description.trim();
  if (description.length < 5) description = `Payment hold ${referenceId}`;
  description = description.slice(0, 100);

  return postAsm('API_PREAUTHORIZE', {
    paymentMethod: 'MWALLET_ACCOUNT',
    payerInfo: { accountNo },
    transactionInfo: {
      referenceId,
      amount,
      currency: env.WAAFI_CURRENCY || 'USD',
      description,
    },
  });
}

/** 2. Commitment — capture hold (API_PREAUTHORIZE_COMMIT) */
export async function waafiCommit(transactionId: string, description: string): Promise<WaafiResult> {
  return postAsm('API_PREAUTHORIZE_COMMIT', {
    transactionId,
    description: (description || 'Order committed').slice(0, 255),
  });
}

/** 3. Cancellation — release hold (API_PREAUTHORIZE_CANCEL) */
export async function waafiCancel(transactionId: string, description: string): Promise<WaafiResult> {
  return postAsm('API_PREAUTHORIZE_CANCEL', {
    transactionId,
    description: (description || 'Order canceled').slice(0, 255),
  });
}

/** Immediate charge — Purchase API (API_PURCHASE). */
export async function waafiPurchase(input: {
  accountNo: string;
  amount: number;
  referenceId: string;
  invoiceId?: string;
  description: string;
}): Promise<WaafiResult> {
  const accountNo = normalizeWaafiPhone(input.accountNo);
  const referenceId = toWaafiReferenceId(input.referenceId);
  const invoiceId = toWaafiReferenceId(input.invoiceId || referenceId);
  const amount = Number(input.amount).toFixed(2);
  let description = input.description.trim();
  if (description.length < 5) description = `Raac top up ${referenceId}`;
  description = description.slice(0, 255);

  return postAsm('API_PURCHASE', {
    paymentMethod: 'MWALLET_ACCOUNT',
    payerInfo: { accountNo },
    transactionInfo: {
      referenceId,
      invoiceId,
      amount,
      currency: env.WAAFI_CURRENCY || 'USD',
      description,
    },
  });
}
