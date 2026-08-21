import { useTranslation } from '@/composables/useTranslation';
import { coreErrorCalendarOf, coreErrorCodeOf, type CoreErrorCode } from '@/types/errors';

const { i18n } = useTranslation();

const messageKeys: Record<CoreErrorCode, string> = {
  NETWORK: 'message.coreError.network',
  AUTH: 'message.coreError.auth',
  FORBIDDEN: 'message.coreError.forbidden',
  VALIDATION: 'message.coreError.validation',
  STORAGE: 'message.coreError.storage',
};

export function formatErrorForUser(error: unknown, calendarName?: string): string {
  const calendar = coreErrorCalendarOf(error) ?? calendarName?.trim();
  const code = coreErrorCodeOf(error);
  const message = code ? i18n.global.t(messageKeys[code]) : errorMessage(error);

  if (!calendar) return message;
  return i18n.global.t('message.coreError.calendar', { name: calendar, message });
}

export function logError(error: unknown, calendarName?: string): void {
  const calendar = coreErrorCalendarOf(error) ?? calendarName?.trim();
  const code = coreErrorCodeOf(error);
  const context = `${code ? ` [${code}]` : ''}${calendar ? ` for calendar "${calendar}"` : ''}`;

  console.error(`Calendar error${context}:`, errorMessage(error));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
