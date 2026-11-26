import { useTranslation } from '@/composables/useTranslation';
import { coreErrorCalendarsOf, coreErrorCodeOf, type CoreErrorCode } from '@/types/errors';

const { i18n } = useTranslation();

const messageKeys: Record<CoreErrorCode, string> = {
  NETWORK: 'message.coreError.network',
  PROXY: 'message.coreError.proxy',
  AUTH: 'message.coreError.auth',
  FORBIDDEN: 'message.coreError.forbidden',
  RATELIMIT: 'message.coreError.rateLimit',
  VALIDATION: 'message.coreError.validation',
  STORAGE: 'message.coreError.storage',
  CALENDAR_EXISTS: 'message.coreError.calendarExists',
  CALENDAR_NOT_FOUND: 'message.coreError.calendarNotFound',
  READONLY: 'message.coreError.readOnly',
  EVENT_NOT_FOUND: 'message.coreError.eventNotFound',
  TAG_EXISTS: 'message.coreError.tagExists',
  TAG_NOT_FOUND: 'message.coreError.tagNotFound',
  NAME_REQUIRED: 'message.coreError.nameRequired',
  DECRYPTION: 'message.coreError.decryption',
};

export function formatErrorForUser(error: unknown, calendarName?: string): string {
  const calendars = calendarsOf(error, calendarName);
  const code = coreErrorCodeOf(error);
  const message = code ? i18n.global.t(messageKeys[code]) : sentence(errorMessage(error));

  if (calendars.length === 0) return message;
  // raw core messages already name their calendars, and a dead proxy is not any calendar's fault
  if (code === 'PROXY' || (!code && coreErrorCalendarsOf(error).length > 0)) return message;
  const names = calendars.map((name) => i18n.global.t('message.coreError.calendarName', { name })).join(', ');
  return i18n.global.t('message.coreError.calendar', { names, message }, calendars.length);
}

export function logError(error: unknown, calendarName?: string): void {
  const calendars = calendarsOf(error, calendarName);
  const code = coreErrorCodeOf(error);
  const context = `${code ? ` [${code}]` : ''}${calendars.length ? ` for calendars ${JSON.stringify(calendars)}` : ''}`;

  console.error(`Calendar error${context}:`, errorMessage(error));
}

function calendarsOf(error: unknown, calendarName?: string): string[] {
  const calendars = coreErrorCalendarsOf(error);
  if (calendars.length > 0) return calendars;
  return calendarName?.trim() ? [calendarName.trim()] : [];
}

/** Starts with a capital letter and ends with a full stop, like the app's own messages. */
function sentence(text: string): string {
  const trimmed = text.trim();
  const capital = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return !capital || /[.!?…]$/.test(capital) ? capital : `${capital}.`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
