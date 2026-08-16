import { DateTime } from 'luxon';
import { type RouteParamsGeneric, type Router } from 'vue-router';
import type { CalendarEvent } from '@/types/core';
import { CalendarCore } from '@/wasm/core-wrapper';
import { settings, type CalendarView } from '@/services/settings';

/**
 * Returns the selected datetime from the route parameters.
 */
export function getCurrentViewDatetime(params: RouteParamsGeneric): DateTime {
  return DateTime.fromObject({
    year: Number(params.year),
    month: Number(params.month),
    day: Number(params.day),
  });
}

/**
 * Moves the current view backward or forward.
 */
export function moveView(back: boolean, router: Router) {
  const currentDatetime = getCurrentViewDatetime(router.currentRoute.value.params);
  const sign = back ? -1 : 1;

  const params = router.currentRoute.value.params;
  let newDate: DateTime;

  switch (params.view) {
    case 'm':
      newDate = currentDatetime.plus({ month: sign });
      break;
    case 'w':
      newDate = currentDatetime.plus({ days: 7 * sign });
      break;
    case '4d':
      newDate = currentDatetime.plus({ days: 4 * sign });
      break;
    default:
      return;
  }

  router.replace(getCalendarRedirect(String(params.view) as CalendarView, newDate));
}

/**
 * Returns the length of view in days from route parameters.
 */
export function getViewLengthInDays(params: RouteParamsGeneric): number {
  const currentDatetime = getCurrentViewDatetime(params);

  switch (params.view) {
    case 'm':
      return currentDatetime.daysInMonth ?? 30;
    case 'w':
      return 7;
    case '4d':
      return 4;
    default:
      return 1;
  }
}

/**
 * Returns the start of the week based on settings.weekStart.
 */
export function getStartOfWeek(dt: DateTime): DateTime {
  const diff = (dt.weekday - settings.value.weekStart + 7) % 7;
  return dt.minus({ days: diff }).startOf('day');
}

/**
 * Returns the first visible date while keeping the route's selected date unchanged.
 */
export function getCurrentViewStartDatetime(params: RouteParamsGeneric): DateTime {
  const selectedDate = getCurrentViewDatetime(params);

  if (params.view === 'm') return selectedDate.startOf('month');
  if (params.view === 'w') return getStartOfWeek(selectedDate);
  return selectedDate.startOf('day');
}

/**
 * Returns a calendar route that preserves the selected date for every view.
 */
export function getCalendarRedirect(view: CalendarView, date: DateTime) {
  return {
    name: 'calendar',
    params: {
      view,
      year: date.year,
      month: date.month,
      day: date.day,
    },
  };
}

/**
 * Formats times based on timeFormat (17/5 pm) and puts it together like: '10:00 - 11:30'.
 */
export function timeRangeFormat(from: DateTime, to: DateTime): string {
  const fromTime = from.toLocaleString({ hour: '2-digit', minute: '2-digit', hourCycle: settings.value.timeFormat });
  const toTime = to.toLocaleString({ hour: '2-digit', minute: '2-digit', hourCycle: settings.value.timeFormat });
  return `${fromTime} - ${toTime}`;
}

/**
 * Returns the number of hours in view.
 */
export function numberOfHours(): number {
  return (settings.value.dayViewEndHour - settings.value.dayViewStartHour + 24) % 24;
}

/**
 * Returns true/false whether event is wholeDay/allDay.
 */
export function isWholeDay(event: CalendarEvent): boolean {
  const startsAtMidnight = event.from.toMillis() === event.from.startOf('day').toMillis();
  const usesExclusiveEnd = event.to.toMillis() === event.to.startOf('day').toMillis();
  const usesLegacyEnd = event.to.toFormat('HH:mm') === '23:59';
  return startsAtMidnight && (usesExclusiveEnd || usesLegacyEnd) && event.to > event.from;
}

export function getAllDayEndDate(event: CalendarEvent): DateTime {
  const usesExclusiveEnd = event.to.toMillis() === event.to.startOf('day').toMillis();
  return usesExclusiveEnd ? event.to.minus({ days: 1 }) : event.to;
}

/**
 * Downloads a zipped calendar or all calendars if ''.
 */
export async function exportZip(calendar: string = '') {
  const zipBytes = await CalendarCore.exportZip(calendar);
  const fileName = calendar ? `${calendar}.zip` : `git-calendar-data.zip`;
  await saveFile(zipBytes, fileName, 'ZIP archive', 'application/zip', '.zip');
}

export async function exportICal(calendar: string = '') {
  const iCalBytes = await CalendarCore.exportICal(calendar);
  const fileName = calendar ? `${calendar}.ics` : `git-calendar-data.ics`;
  await saveFile(iCalBytes, fileName, 'iCalendar file', 'text/calendar', '.ics');
}

async function saveFile(data: BlobPart, fileName: string, description: string, mimeType: string, extension: string) {
  if ('showSaveFilePicker' in window && typeof window.showSaveFilePicker == 'function') {
    const handle = await window.showSaveFilePicker({
      suggestedName: fileName,
      types: [{ description, accept: { [mimeType]: [extension] } }],
    });

    const writable = await handle.createWritable();
    await writable.write(data);
    await writable.close();
  } else {
    // Firefox does not have the showSaveFilePicker method.
    downloadBlob(data, fileName, mimeType);
  }
}

function downloadBlob(data: BlobPart, filename: string, mimeType: string) {
  const blob = new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

export async function createCalendarOnce() {
  const key = 'create-cal-on-first-visit';
  if (localStorage.getItem(key) === null) {
    await CalendarCore.createCalendar('default', '');
    localStorage.setItem(key, 'done');
  }
}
