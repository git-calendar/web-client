import { DateTime } from 'luxon';

const dateTimeFieldNames: string[] = ['from', 'to', 'until'];

function isBinaryData(data: object): boolean {
  return data instanceof ArrayBuffer || ArrayBuffer.isView(data) || data instanceof Blob || data instanceof File;
}

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

// This shit does transform the JSON date strings (ISO format) to a luxon DateTime object, but only internally.
// Meaning I don't know how validation in TS/JS works (more like doesn't) with the lack of reflection,
// so it only makes sure that the date fields in JSON get parsed, but it still saves them as any, which seems strange to me.
//
// If you do:
//  const inputJSON = { /* stuff */ };
//  const event: CalendarEvent = inputJSON;
// it works haha, but event.from.day crashes, because the from is still a fakin string or standard JS Date object.
//
// So this hydrateDates tries to parse it beforehand.
export function hydrateDates<T>(data: unknown): T {
  // primitives / null
  if (data === null || typeof data !== 'object') return data as T;

  // preserve binary data
  if (isBinaryData(data)) {
    return data as T;
  }

  // preserve Luxon values if they ever come through here
  if (DateTime.isDateTime(data)) {
    return data as T;
  }

  if (Array.isArray(data)) {
    return data.map(hydrateDates) as unknown as T; // recursively for arrays
  }

  const result: Record<string, unknown> = {};

  for (const [rawKey, value] of Object.entries(data)) {
    const key = toCamelCase(rawKey);

    if (dateTimeFieldNames.includes(key) && typeof value === 'string') {
      const dt = DateTime.fromISO(value, {
        setZone: true, // respect & keep the timezone offset from the string
      }).toLocal();

      if (!dt.isValid) {
        console.warn(`Bad ISO in ${key}: ${value} -> ${dt.invalidExplanation}`);
        result[key] = null; // or throw, or keep as string, etc.
      } else {
        result[key] = dt;
      }
    } else {
      result[key] = hydrateDates(value); // recursively
    }
  }

  return result as T;
}

// The other way around, meaning it goes from DateTime to string (only underlining, it still is undefined lol).
export function dehydrateDates<T>(data: T): T {
  if (data instanceof DateTime) {
    return data.toISO() as unknown as T;
  }

  if (data === null || typeof data !== 'object') {
    return data;
  }

  // preserve binary data for methods such as restoreZip
  if (isBinaryData(data)) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(dehydrateDates) as unknown as T;
  }

  if (data instanceof Map) {
    return Object.fromEntries(Array.from(data, ([key, value]) => [String(key), dehydrateDates(value)])) as unknown as T;
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    const newKey = toSnakeCase(key);
    result[newKey] = dehydrateDates(value);
  }

  return result as T;
}
