<script setup lang="ts">
import { computed, ref, useTemplateRef, watch, watchEffect } from 'vue';
import DayTimeline from '@/components/timeline/DayTimeline.vue';
import type { CalendarEvent } from '@/types/core.ts';
import { useTranslation } from '@/composables/useTranslation';
import { DateTime } from 'luxon';
import { CalendarCore } from '@/wasm/core-wrapper';
import { getCurrentViewStartDatetime, isWholeDay } from '@/utils';
import { useRoute } from 'vue-router';
import CursorLine from '@/components/timeline/CursorLine.vue';
import { useWindowSize } from '@vueuse/core';
import AllDayBar from '@/components/AllDayBar.vue';
import { settings } from '@/services/settings';
import { eventsRevision } from '@/composables/useEventsRefresh';
import { useCalendarFilters } from '@/services/calendarFilters';
import { useCalendarDrag } from '@/composables/useCalendarDrag';

type TimelineRange = {
  startHour: number;
  endHour: number;
};

const { dayNameShort, dayNameSuperShort } = useTranslation();
const { width } = useWindowSize();
const { filter } = useCalendarFilters();
const route = useRoute();

const props = defineProps<{
  numOfDays: number;
}>();

const isMobile = computed(() => width.value < 500);
const startDate = computed(() => getCurrentViewStartDatetime(route.params));
const dates = computed(() =>
  Array.from({ length: props.numOfDays }, (_, index) => startDate.value.plus({ days: index })),
);

const events = ref<CalendarEvent[]>([]);

const configuredTimelineRange = computed<TimelineRange>(() => {
  const startHour = settings.value.dayViewStartHour;
  const configuredEndHour = settings.value.dayViewEndHour;
  const endHour = configuredEndHour > startHour ? configuredEndHour : configuredEndHour + 24;

  return { startHour, endHour };
});

function timelineColumnDate(date: DateTime, range: TimelineRange) {
  const postMidnightEndHour = range.endHour - 24;
  const calendarDate = date.startOf('day');

  return range.endHour > 24 && date.hour < postMidnightEndHour ? calendarDate.minus({ days: 1 }) : calendarDate;
}

const eventGroups = computed(() => {
  const timeline: CalendarEvent[][] = Array.from({ length: props.numOfDays }, () => []);
  const allDay: CalendarEvent[] = [];
  const viewStart = startDate.value.startOf('day');
  const range = configuredTimelineRange.value;

  for (const event of events.value) {
    const eventDate = timelineColumnDate(event.from, range);
    const fitsTimelineColumn = event.to <= eventDate.plus({ hours: range.endHour });
    const endsAtNextMidnight =
      event.to.toMillis() === event.to.startOf('day').toMillis() &&
      event.from.startOf('day').plus({ days: 1 }).hasSame(event.to, 'day');

    if (isWholeDay(event) || (!event.from.hasSame(event.to, 'day') && !endsAtNextMidnight && !fitsTimelineColumn)) {
      allDay.push(event);
      continue;
    }

    const dayIndex = Math.floor(eventDate.diff(viewStart, 'days').days);
    timeline[dayIndex]?.push(event);
  }

  return { timeline, allDay };
});

const timelineRange = computed<TimelineRange>(() => {
  const configuredRange = configuredTimelineRange.value;
  let startHour = configuredRange.startHour;
  let endHour = configuredRange.endHour;

  for (const event of eventGroups.value.timeline.flat()) {
    const columnStart = timelineColumnDate(event.from, configuredRange).startOf('day');
    const fromHour = event.from.diff(columnStart, 'hours').hours;
    const toHour = event.to.diff(columnStart, 'hours').hours;
    startHour = Math.min(startHour, Math.floor(fromHour));
    endHour = Math.max(endHour, Math.ceil(toHour));
  }

  return { startHour, endHour };
});

const hoursOnGrid = computed(() => {
  const { startHour, endHour } = timelineRange.value;

  return Array.from({ length: endHour - startHour }, (_, offset) => {
    const hour = (startHour + offset) % 24;

    if (settings.value.timeFormat === 'h12') {
      return `${hour % 12 || 12} ${hour < 12 ? 'AM' : 'PM'}`;
    }

    return `${String(hour).padStart(2, '0')}:00`;
  });
});

let latestRequest = 0;

async function updateData() {
  const request = ++latestRequest;
  const viewStart = startDate.value;
  const range = configuredTimelineRange.value;
  const queryEnd = viewStart.plus({ days: props.numOfDays + (range.endHour > 24 ? 1 : 0) });
  const result = await CalendarCore.getEvents(viewStart, queryEnd, filter.value);

  if (request === latestRequest) events.value = result;
}

const drag = useCalendarDrag(updateData);
const contentRef = useTemplateRef<HTMLElement>('content-ref');

watch([startDate, () => props.numOfDays, eventsRevision, filter, configuredTimelineRange], () => void updateData(), {
  immediate: true,
});

watchEffect(() => {
  const { startHour, endHour } = timelineRange.value;
  drag.registerGrid(contentRef.value, dates.value, startHour, endHour);
});
</script>

<template>
  <div id="view-container">
    <div id="top-bar">
      <span v-for="day in dates" :key="day.toMillis()" :class="{ today: day.hasSame(DateTime.now(), 'day') }">
        {{ `${day.day}. ${isMobile ? dayNameSuperShort(day) : dayNameShort(day)}` }}
      </span>
    </div>

    <div class="day-lines">
      <div
        v-for="i in numOfDays + 1"
        :key="i"
        class="day-line"
        :style="{ left: ((i - 1) / numOfDays) * 100 + '%' }"
      ></div>
    </div>

    <span>{{ $t('allday') }}</span>
    <AllDayBar :view-start="startDate" :num-of-days="numOfDays" :events="eventGroups.allDay" :drag="drag" />

    <div id="left-time-bar">
      <span v-for="h in hoursOnGrid" :key="h">{{ h }}</span>
    </div>

    <div id="content" ref="content-ref">
      <CursorLine :start-hour="timelineRange.startHour" :end-hour="timelineRange.endHour" />

      <div class="hour-lines">
        <div
          v-for="hour in hoursOnGrid.length + 1"
          :key="hour"
          class="hour-line"
          :style="{ top: ((hour - 1) / hoursOnGrid.length) * 100 + '%' }"
        ></div>
      </div>

      <DayTimeline
        v-for="(d, i) in dates"
        :key="d.toMillis()"
        :date="d"
        :events="eventGroups.timeline[i]"
        :start-hour="timelineRange.startHour"
        :end-hour="timelineRange.endHour"
        :drag="drag"
      />
    </div>
  </div>
</template>

<style scoped>
#view-container {
  height: calc(100% - 2rem);

  display: grid;
  grid-template-columns: 3rem auto;
  grid-template-rows: 1.5rem min-content auto;
  grid-template-areas:
    '- datebar'
    'allday-label allday'
    'timebar content';

  position: relative;
  margin: 1rem;

  > span:first-of-type {
    font-size: 0.7rem;
    text-align: right;
    grid-area: allday-label;
    padding-right: 0.6rem;
    position: relative;
    top: -3px;
    user-select: none;
  }
}

#top-bar,
#content {
  display: grid;
  grid-auto-flow: column;
  grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
}

#content {
  position: relative;
  grid-area: content;
}

#allday-bar {
  grid-area: allday;
}

#top-bar {
  grid-area: datebar;

  span.today {
    color: var(--git-color);
  }
}

#left-time-bar {
  grid-area: timebar;
  display: grid;
  width: 3rem;
  user-select: none;

  span {
    border-top: 1px solid transparent;
    font-size: 0.7rem;
    text-align: right;
    padding-right: 0.6rem;

    position: relative;
    top: -0.5rem;
  }
}

.hour-lines,
.day-lines {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none; /* allow clicking events */

  .hour-line {
    position: absolute;
    left: 0;
    right: 0;
    height: var(--grid-thickness);
    background: var(--grid-color);
  }

  .day-line {
    position: absolute;
    top: -1px;
    bottom: -1px;
    width: var(--grid-thickness);
    background: var(--grid-color);
  }
}

.day-lines {
  left: -1px;
  margin: 1.43rem 0 0 3rem;
  border-top: var(--grid-border);
}

@media (max-width: 768px) {
  #view-container {
    height: calc(100% - 2 * 0.3rem);
    margin: 0.3rem;
  }

  .hour-lines,
  .day-lines {
    .day-line,
    .hour-line {
      background: var(--grid-color-harder);
    }
  }
}
</style>
