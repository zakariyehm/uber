export function toIso(value: Date | null | undefined): string | undefined {
  return value ? value.toISOString() : undefined;
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\s+/g, '');
}
