import { computed, readonly, shallowRef } from 'vue';

import { COLORS } from '@/colors';
import type { Calendar, Tag } from '@/types/core';
import { CalendarCore } from '@/wasm/core-wrapper';

const calendars = shallowRef<Calendar[]>([]);
const loaded = shallowRef(false);

let loading: Promise<void> | null = null;

const calendarMap = computed(() => {
  const map = new Map<string, Calendar>();

  for (const calendar of calendars.value) {
    map.set(calendar.name, calendar);
  }

  return map;
});

export const cachedCalendars = readonly(calendars);
export const calendarsLoaded = readonly(loaded);

export async function loadCalendars(): Promise<void> {
  if (loaded.value) {
    return;
  }

  if (!loading) {
    loading = CalendarCore.listCalendars()
      .then((items) => {
        calendars.value = items;
        loaded.value = true;
      })
      .finally(() => {
        loading = null;
      });
  }

  return loading;
}

export async function refreshCalendars(): Promise<void> {
  loaded.value = false;
  await loadCalendars();
}

export function clearCalendarCache(): void {
  calendars.value = [];
  loaded.value = false;
}

export function getCalendar(calendarName: string): Calendar | undefined {
  return calendarMap.value.get(calendarName);
}

export function getDefaultCalendar(): Calendar | undefined {
  return calendarMap.value.get('default') ?? calendars.value[0];
}

export function getTag(calendarName: string, tagId: string): Tag | undefined {
  return getCalendar(calendarName)?.tags.find((tag) => tag.id === tagId);
}

export function getTagColorHex(calendarName: string, tagId: string): string | undefined {
  const color = getTag(calendarName, tagId)?.color;

  if (!color) {
    return undefined;
  }

  return COLORS[color as keyof typeof COLORS]?.hex;
}
