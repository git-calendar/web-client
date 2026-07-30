import { DateTime } from 'luxon';
import { type RouteParamsGeneric, type Router } from 'vue-router';
import type { CalendarEvent } from '@/types/core';
import { CalendarCore } from '@/wasm/core-wrapper';
import { settings } from '@/services/settings';

/**
 * Returns the datetime from route parameters. A dateless week route starts at
 * the configured beginning of the current week.
 */
export function getCurrentViewDatetime(params: RouteParamsGeneric): DateTime {
  const today = DateTime.now();

  if (!params) return today;

  const hasDate = params.year != null || params.month != null || params.day != null;
  if (!hasDate && params.view === 'w') return getStartOfWeek(today);

  let year = Number(params.year);
  let month = Number(params.month);
  let day = Number(params.day);

  if (Number.isNaN(year)) year = today.year;
  if (Number.isNaN(month)) month = today.month;
  if (Number.isNaN(day)) day = today.day;

  return DateTime.fromObject({ year: year, month: month, day: day });
}

/**
 * Updates the date in url when switching views.
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
      router.replace(getWeekAlignedRedirect(newDate));
      return;
    case '4d':
      newDate = currentDatetime.plus({ days: 4 * sign });
      break;
    default:
      return;
  }

  router.replace({
    name: 'calendar',
    params: { ...params, year: newDate.year, month: newDate.month, day: newDate.day },
  });
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
 * Returns the router redirect object for week aligned view.
 */
export function getWeekAlignedRedirect(date: DateTime) {
  const startOfWeek = getStartOfWeek(date);
  const currentWeekStart = getStartOfWeek(DateTime.now());

  return {
    name: 'calendar',
    params: startOfWeek.hasSame(currentWeekStart, 'day')
      ? { view: 'w' }
      : {
          view: 'w',
          year: startOfWeek.year,
          month: startOfWeek.month,
          day: startOfWeek.day,
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

  if ('showSaveFilePicker' in window && typeof window.showSaveFilePicker == 'function') {
    const handle = await window.showSaveFilePicker({
      suggestedName: fileName,
      types: [
        {
          description: 'ZIP archive',
          accept: { 'application/zip': ['.zip'] },
        },
      ],
    });

    const writable = await handle.createWritable();
    await writable.write(zipBytes);
    await writable.close();
  } else {
    // firefox doesnt have the showSaveFilePicker method
    downloadBlob(zipBytes, fileName);
  }
}

function downloadBlob(data: BlobPart, filename: string) {
  const blob = new Blob([data], { type: 'application/zip' });
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
