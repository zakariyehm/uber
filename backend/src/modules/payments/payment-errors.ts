/**
 * User-friendly Waafi / payment errors for Raac riders.
 * Pattern aligned with payso/dukan-pos `WaafiPayService.getErrorMessage`.
 */

type PaymentErrorInput = {
  responseMsg?: string | null;
  responseCode?: string | null;
  errorCode?: string | null;
};

function unwrapPaymentFailed(msg: string): string {
  const inner = msg.match(/Payment Failed\s*\((.+)\)/i);
  return (inner?.[1] || msg).trim();
}

/** Map raw Waafi response fields to short professional copy. */
export function toFriendlyPaymentError(
  rawOrInput: string | undefined | null | PaymentErrorInput
): string {
  const input: PaymentErrorInput =
    typeof rawOrInput === 'string' || rawOrInput == null
      ? { responseMsg: rawOrInput }
      : rawOrInput;

  const direct = (input.responseMsg || '').trim();
  const detail = unwrapPaymentFailed(direct).toLowerCase();
  const code = String(input.responseCode || input.errorCode || '').trim();
  const msgUpper = direct.toUpperCase();

  const GENERIC = 'Lacag bixintu ma dhammaan. Isku day mar kale.';

  // --- Phrase-level (most accurate; Waafi often wraps these in Payment Failed (...)) ---
  if (
    detail.includes('failed to verify pin') ||
    detail.includes('verify pin') ||
    detail.includes('incorrect pin') ||
    detail.includes('wrong pin') ||
    detail.includes('invalid pin')
  ) {
    return 'PIN-ka sax ma ahayn. Fiiri telefoonkaaga, geli PIN-ka saxda ah, kadib isku day.';
  }
  if (detail.includes('account id') && detail.includes('not owned')) {
    return 'Lambarka Waafi/EVC sax ma aha. Hubi nambarka oo isku day mar kale.';
  }
  if (detail.includes('insufficient') || detail.includes('not enough')) {
    return 'Lacag kugu filan kuma jirto akoonkaaga.';
  }
  if (detail.includes('reject') || detail.includes('declin') || detail.includes('cancel')) {
    return 'Lacag bixinta waa la diiday. Isku day mar kale.';
  }
  if (detail.includes('timeout') || detail.includes('timed out') || detail.includes('expire')) {
    return 'Waqtigii wuu dhammaaday. Isku day mar kale.';
  }
  if (detail.includes('invalid account') || detail.includes('invalid number')) {
    return 'Lambarka Waafi/EVC sax ma aha.';
  }
  if (detail.includes('network') || detail.includes('unavailable') || detail.includes('try again later')) {
    return 'Shabakad ayaa mashquul ah. Isku day mar kale.';
  }

  // --- RCS_* message codes (payso map) ---
  switch (msgUpper) {
    case 'RCS_SUCCESS':
      return 'Lacag bixintu waa la aqbalay.';
    case 'RCS_USER_REJECTED':
      return 'Lacag bixinta waa la diiday. Isku day mar kale.';
    case 'RCS_INSUFFICIENT_FUNDS':
      return 'Lacag kugu filan kuma jirto akoonkaaga.';
    case 'RCS_INVALID_ACCOUNT':
      return 'Lambarka Waafi/EVC sax ma aha.';
    case 'RCS_NETWORK_ERROR':
      return 'Shabakad ayaa mashquul ah. Isku day mar kale.';
    case 'RCS_TIMEOUT':
      return 'Waqtigii wuu dhammaaday. Isku day mar kale.';
  }

  // --- Numeric / HPP response codes (payso map) ---
  switch (code) {
    case '2001':
      return 'Lacag bixintu waa la aqbalay.';
    case '5206':
      return GENERIC;
    case '5306':
    case '5310':
      return 'Lacag bixinta waa la diiday. Isku day mar kale.';
    case '5307':
    case '5309':
      return 'Waqtigii wuu dhammaaday. Isku day mar kale.';
    case '5301':
    case '5302':
    case '5303':
    case '5304':
    case '5305':
    case '5308':
      return GENERIC;
  }

  return GENERIC;
}
