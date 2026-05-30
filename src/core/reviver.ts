import { DateTime } from 'luxon';

// This regex broadly matches standard ISO 8601 strings.
// You can tweak it if your Go API outputs a very specific format.
const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

export function luxonReviver(key: string, value: any) {
  if (typeof value === 'string' && isoDateRegex.test(value)) {
    const luxonDate = DateTime.fromISO(value);
    if (luxonDate.isValid) {
      return luxonDate;
    }
  }
  return value; // Return unchanged if it's not a date
}
