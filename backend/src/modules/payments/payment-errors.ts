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

  // --- Phrase-level (most accurate; Waafi often wraps these in Payment Failed (...)) ---
  if (detail.includes('failed to verify pin') || detail.includes('verify pin')) {
    return 'PIN was not approved. Check your phone, enter the correct Waafi/EVC PIN, then try again.';
  }
  if (detail.includes('account id') && detail.includes('not owned')) {
    return 'Invalid wallet number. Use the EVC/Waafi number that owns this account.';
  }
  if (detail.includes('insufficient') || detail.includes('not enough')) {
    return 'Insufficient account balance';
  }
  if (detail.includes('reject') || detail.includes('declin') || detail.includes('cancel')) {
    return 'Customer declined the payment';
  }
  if (detail.includes('timeout') || detail.includes('timed out') || detail.includes('expire')) {
    return 'Request timed out. Please try again';
  }
  if (detail.includes('invalid account') || detail.includes('invalid number')) {
    return 'Invalid account number';
  }
  if (detail.includes('network') || detail.includes('unavailable') || detail.includes('try again later')) {
    return 'Network error occurred. Please try again.';
  }

  // --- RCS_* message codes (payso map) ---
  switch (msgUpper) {
    case 'RCS_SUCCESS':
      return 'Payment approved';
    case 'RCS_USER_REJECTED':
      return 'Customer declined the payment';
    case 'RCS_INSUFFICIENT_FUNDS':
      return 'Insufficient account balance';
    case 'RCS_INVALID_ACCOUNT':
      return 'Invalid account number';
    case 'RCS_NETWORK_ERROR':
      return 'Network error occurred';
    case 'RCS_TIMEOUT':
      return 'Request timed out. Please try again';
  }

  // --- Numeric / HPP response codes (payso map) ---
  switch (code) {
    case '2001':
      return 'Payment approved';
    case '5206':
      // Generic decline bucket from Waafi — prefer phrase mapping above when possible
      return detail
        ? `Payment could not be completed. ${unwrapPaymentFailed(direct)}.`
        : 'Payment was declined. Please try again.';
    case '5301':
      return 'Invalid HPP key';
    case '5302':
      return 'Invalid HPP token';
    case '5303':
      return 'Invalid HPP result token';
    case '5304':
      return 'Merchant reference ID mismatch';
    case '5305':
      return 'Request ID mismatch';
    case '5306':
      return 'Customer cancelled the transaction';
    case '5307':
      return 'Token expired';
    case '5308':
      return 'Service not allowed for this merchant';
    case '5309':
      return 'Customer did not respond within 5 minutes';
    case '5310':
      return 'Customer declined the payment';
  }

  if (direct) {
    if (direct.length > 160) return 'Payment failed. Please try again.';
    return unwrapPaymentFailed(direct);
  }

  return 'Payment failed';
}
