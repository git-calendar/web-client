<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import DayTimeline from '@/components/timeline/DayTimeline.vue';
import type { CalendarEvent } from '@/types/core.ts';
import { useTranslation } from '@/composables/useTranslation';
import { DateTime } from 'luxon';
import { CalendarCore } from '@/wasm/core-wrapper';
import { getCurrentViewDatetime, isWholeDay } from '@/utils';
import { useRoute } from 'vue-router';
import CursorLine from '@/components/timeline/CursorLine.vue';
import { useWindowSize } from '@vueuse/core';
import AllDayBar from '@/components/AllDayBar.vue';
import { settings } from '@/services/settings';
import { eventsRevision } from '@/composables/useEventsRefresh';

const { dayNameShort, dayNameSuperShort } = useTranslation();
const { width } = useWindowSize(); // reactive window size
const isMobile = computed(() => width.value < 500);
const route = useRoute();

const props = defineProps<{
  numOfDays: number;
}>();

const startDate = computed(() => {
  return getCurrentViewDatetime(route.params);
});

watch(
  [startDate, () => props.numOfDays, eventsRevision],
  () => {
    void updateData();
  },
  { immediate: true },
);

const dates = computed(() => {
  return Array.from({ length: props.numOfDays }, (_, i) => {
    return startDate.value.plus({ days: i });
  });
});

const hoursOnGrid = computed(() => {
  const start = settings.value.dayViewStartHour;
  const end = settings.value.dayViewEndHour;

  const result: string[] = [];

  const totalHours = end > start ? end - start : 24 - start + end;

  for (let i = 0; i < totalHours; i++) {
    const current = (start + i) % 24;

    // resolve formats manually ig
    if (settings.value.timeFormat === 'h12') {
      const h = current % 12 || 12;
      const period = current < 12 ? 'AM' : 'PM';
      result.push(`${h} ${period}`);
    } else {
      result.push(`${String(current).padStart(2, '0')}:00`);
    }
  }

  return result;
});

const eventsTimeline = ref<CalendarEvent[][]>(Array.from({ length: props.numOfDays }, () => []));
const eventsWholeDay = ref<CalendarEvent[]>(Array.from({ length: props.numOfDays }));

async function updateData() {
  const resultTimeline: CalendarEvent[][] = Array.from({ length: props.numOfDays }, () => []);
  const resultWholeDay: CalendarEvent[] = [];
  const events = await CalendarCore.getEvents(startDate.value, startDate.value.plus({ day: props.numOfDays }));
  console.log('Client got events:', events);

  for (const event of events) {
    if (isWholeDay(event) || event.from.day != event.to.day) {
      // add to whole day events, not timeline
      resultWholeDay.push(event);
      continue;
    }

    // normalize to start of day
    const eventDate = event.from.startOf('day');

    // calculate the difference in days
    const diffInDays = eventDate.diff(startDate.value.startOf('day'), 'days').days;
    const dayIndex = Math.floor(diffInDays);

    // add it to appropriate day
    if (dayIndex >= 0 && dayIndex < props.numOfDays) {
      resultTimeline[dayIndex]?.push(event);
    }
  }

  eventsTimeline.value = resultTimeline;
  eventsWholeDay.value = resultWholeDay;
}
</script>

<template>
  <div id="view-container">
    <div id="top-bar">
      <span v-for="day in dates" :key="day.toMillis()" :class="{ today: day.hasSame(DateTime.now(), 'day') }">
        <template v-if="isMobile">{{ `${day.day}. ${dayNameSuperShort(day)}` }}</template>
        <template v-else>{{ `${day.day}. ${dayNameShort(day)}` }}</template>
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
    <AllDayBar :numOfDays="numOfDays" :events="eventsWholeDay" />

    <div id="left-time-bar">
      <span v-for="h in hoursOnGrid" :key="h">{{ h }}</span>
    </div>

    <div id="content">
      <CursorLine />

      <div class="hour-lines">
        <div
          v-for="hour in hoursOnGrid.length + 1"
          :key="hour"
          class="hour-line"
          :style="{ top: ((hour - 1) / hoursOnGrid.length) * 100 + '%' }"
        ></div>
      </div>

      <DayTimeline v-for="(d, i) in dates" :key="d.toMillis()" :date="d" :events="eventsTimeline[i]" />
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
</style>
