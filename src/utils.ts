import { DateTime } from 'luxon';
import { type RouteParamsGeneric, type Router } from 'vue-router';
import { useSettings } from '@/composables/useSettings';

const { settings } = useSettings();

/**
 * Returns the datetime from route parameters.
 */
export function getCurrentViewDatetime(params: RouteParamsGeneric): DateTime {
  const today = DateTime.now();

  if (!params) return today;

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

  let newDate: DateTime;
  switch (router.currentRoute.value.params.view) {
    case 'month':
      newDate = currentDatetime.plus({ month: 1 * sign });
      router.replace({ name: 'calendar', params: { year: newDate.year, month: newDate.month, day: newDate.day } });
      break;
    case 'week':
      newDate = currentDatetime.plus({ days: 7 * sign });
      router.replace({ name: 'calendar', params: { year: newDate.year, month: newDate.month, day: newDate.day } });
      break;
    case '4days':
      newDate = currentDatetime.plus({ days: 4 * sign });
      router.replace({ name: 'calendar', params: { year: newDate.year, month: newDate.month, day: newDate.day } });
      break;
  }
}

/**
 * Returns the length of view in days from route parameters.
 */
export function getViewLengthInDays(params: RouteParamsGeneric): number {
  const currentDatetime = getCurrentViewDatetime(params);

  switch (params.view) {
    case 'month':
      return currentDatetime.daysInMonth ?? 30;
    case 'week':
      return 7;
    case '4days':
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
  return {
    name: 'calendar',
    params: {
      view: 'week',
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
 * Returns 0.0-1.0 for the datetime parameter based on settings.dayViewStartHour.
 */
export function timeInPercentOnTimeline(datetime: DateTime): number {
  const viewStart = settings.value.dayViewStartHour;
  const startHours = datetime.hour + datetime.minute / 60;
  const percent = Math.max(0, (startHours - viewStart) / numberOfHours());
  return percent;
}
