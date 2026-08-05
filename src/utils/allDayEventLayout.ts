import type { DateTime } from 'luxon';
import type { CalendarEvent } from '@/types/core';

export type VisibleDayRange = {
  startIndex: number;
  endIndex: number;
  span: number;
};

export type LaidOutDayEvent = VisibleDayRange & {
  event: CalendarEvent;
  row: number;
};

export function getVisibleDayRange(
  event: CalendarEvent,
  viewStart: DateTime,
  numberOfDays: number,
): VisibleDayRange | null {
  if (numberOfDays <= 0 || event.to <= event.from) return null;

  const endsAtMidnight = event.to.toMillis() === event.to.startOf('day').toMillis();
  const lastEventDay = (endsAtMidnight ? event.to.minus({ milliseconds: 1 }) : event.to).startOf('day');
  const startIndex = Math.floor(event.from.startOf('day').diff(viewStart, 'days').days);
  const endIndex = Math.floor(lastEventDay.diff(viewStart, 'days').days);

  if (endIndex < 0 || startIndex >= numberOfDays) return null;

  const firstDay = Math.max(0, startIndex);
  const lastDay = Math.min(numberOfDays - 1, endIndex);

  return {
    startIndex: firstDay,
    endIndex: lastDay,
    span: lastDay - firstDay + 1,
  };
}

export function layoutEventsByDay(
  events: CalendarEvent[],
  viewStart: DateTime,
  numberOfDays: number,
): LaidOutDayEvent[] {
  const visibleEvents = events.flatMap((event) => {
    const range = getVisibleDayRange(event, viewStart, numberOfDays);
    return range ? [{ event, ...range }] : [];
  });

  visibleEvents.sort(
    (a, b) =>
      a.startIndex - b.startIndex ||
      b.span - a.span ||
      a.event.from.toMillis() - b.event.from.toMillis() ||
      a.event.to.toMillis() - b.event.to.toMillis(),
  );

  const rowEnds: number[] = [];
  return visibleEvents.map((item) => {
    let rowIndex = rowEnds.findIndex((endIndex) => endIndex < item.startIndex);

    if (rowIndex === -1) rowIndex = rowEnds.length;
    rowEnds[rowIndex] = item.endIndex;

    return {
      ...item,
      row: rowIndex + 1,
    };
  });
}
