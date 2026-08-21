export const CORE_ERROR_CODES = ['NETWORK', 'AUTH', 'FORBIDDEN', 'VALIDATION', 'STORAGE'] as const;

export type CoreErrorCode = (typeof CORE_ERROR_CODES)[number];

export function coreErrorCodeOf(error: unknown): CoreErrorCode | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) return undefined;

  const code = error.code;
  return typeof code === 'string' && CORE_ERROR_CODES.some((knownCode) => knownCode === code)
    ? (code as CoreErrorCode)
    : undefined;
}

export function coreErrorCalendarOf(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('calendar' in error)) return undefined;

  const calendar = error.calendar;
  return typeof calendar === 'string' && calendar.trim() ? calendar.trim() : undefined;
}
