export const SOMALIA_DIAL_CODE = '+252';

export const SOMALIA_STATES = [
  'Awdal',
  'Bakool',
  'Banadir',
  'Bari',
  'Bay',
  'Galgaduud',
  'Gedo',
  'Hiiraan',
  'Lower Juba',
  'Lower Shabelle',
  'Middle Juba',
  'Middle Shabelle',
  'Mudug',
  'Nugaal',
  'Sanaag',
  'Sool',
  'Togdheer',
  'Woqooyi Galbeed',
] as const;

export function digitsOnly(value: string) {
  return value.replace(/\D/g, '');
}

export function toE164Somalia(localNumber: string): string {
  let digits = digitsOnly(localNumber);
  if (digits.startsWith('252')) {
    digits = digits.slice(3);
  }
  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return `${SOMALIA_DIAL_CODE}${digits}`;
}

export function isValidSomaliMobile(localNumber: string): boolean {
  const e164 = toE164Somalia(localNumber);
  return /^\+252[1-9]\d{7,8}$/.test(e164);
}

export function formatLocalDisplay(localNumber: string): string {
  const digits = digitsOnly(toE164Somalia(localNumber).replace('+252', ''));
  const withZero = `0${digits}`;
  if (withZero.length <= 4) return withZero;
  if (withZero.length <= 7) return `${withZero.slice(0, 4)} ${withZero.slice(4)}`;
  return `${withZero.slice(0, 4)} ${withZero.slice(4, 7)} ${withZero.slice(7)}`;
}
