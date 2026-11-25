export const CORE_ERROR_CODES = [
  'NETWORK',
  'PROXY',
  'AUTH',
  'FORBIDDEN',
  'RATELIMIT',
  'VALIDATION',
  'STORAGE',
] as const;

export type CoreErrorCode = (typeof CORE_ERROR_CODES)[number];

export function coreErrorCodeOf(error: unknown): CoreErrorCode | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) return undefined;

  const code = error.code;
  return typeof code === 'string' && CORE_ERROR_CODES.some((knownCode) => knownCode === code)
    ? (code as CoreErrorCode)
    : undefined;
}

export function coreErrorCalendarsOf(error: unknown): string[] {
  if (typeof error !== 'object' || error === null) return [];

  // `calendar` is the single-calendar field sent by core <= v0.4.x
  const raw = 'calendars' in error ? error.calendars : 'calendar' in error ? [error.calendar] : [];
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((name): name is string => typeof name === 'string' && name.trim() !== '')
    .map((name) => name.trim());
}
