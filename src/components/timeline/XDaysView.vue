<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import DayTimeline from '@/components/timeline/DayTimeline.vue';
import type { CalendarEvent } from '@/types/core.ts';
import { useSettings } from '@/composables/useSettings';
import { useTranslation } from '@/composables/useTranslation';
import { DateTime } from 'luxon';
import { CalendarCore } from '@/wasm/core-wrapper';
import { getCurrentViewDatetime } from '@/utils';
import { useRoute } from 'vue-router';
import CursorLine from './CursorLine.vue';

const { settings } = useSettings();
const { dayName } = useTranslation();
const route = useRoute();

const props = defineProps<{
  numOfDays: number;
}>();

const startDate = computed(() => {
  const d = getCurrentViewDatetime(route.params);
  const diff = (d.weekday - settings.value.weekStart + 7) % 7;
  let startDate = d.minus({ days: diff });

  startDate.set({ hour: 0, minute: 0, second: 0, millisecond: 0 }); // maybe not needed
  return startDate;
});

watch(
  () => startDate.value,
  async () => {
    eventsByDay.value = await getEventsForWeek();
  },
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

  let current = start;
  while (true) {
    // resolve formats manually ig
    if (settings.value.timeFormat === 'h12') {
      const h = current % 12 || 12; // O -> 12
      const period = current < 12 ? 'AM' : 'PM';
      result.push(`${h} ${period}`);
    } else {
      result.push(`${String(current).padStart(2, '0')}:00`);
    }

    current = (current + 1) % 24;

    // stop BEFORE adding the end hour
    if (current === end) break;

    if (result.length > 48) break; // prevent infinite loop
  }

  return result;
});

const eventsByDay = ref<CalendarEvent[][]>(Array.from({ length: props.numOfDays }, () => []));

async function getEventsForWeek(): Promise<CalendarEvent[][]> {
  const result: CalendarEvent[][] = Array.from({ length: 7 }, () => []);
  const events = await CalendarCore.getEvents(startDate.value, startDate.value.plus({ day: props.numOfDays }));

  for (const event of events) {
    // normalize to start of day
    const eventDate = event.from.startOf('day');

    // calculate the difference in days
    const diffInDays = eventDate.diff(startDate.value.startOf('day'), 'days').days;
    const dayIndex = Math.floor(diffInDays);

    // add it to appropriate day
    if (dayIndex >= 0 && dayIndex < 7) {
      result[dayIndex]?.push(event);
    }
  }

  return result;
}

onMounted(async () => {
  await updateData();
});

async function updateData() {
  eventsByDay.value = await getEventsForWeek();
}
defineExpose({ updateData });
</script>

<template>
  <div id="view-container">
    <div id="top-bar">
      <span v-for="day in dates" :key="day.toMillis()" :class="{ today: day.hasSame(DateTime.now(), 'day') }">{{
        `${day.day}. ${dayName(day)}`
      }}</span>
    </div>
    <div id="left-time-bar">
      <span v-for="h in hoursOnGrid" :key="h">{{ h }}</span>
    </div>

    <div id="content">
      <CursorLine />

      <div class="hour-lines">
        <div
          v-for="hour in hoursOnGrid.length"
          :key="hour"
          class="hour-line"
          :style="{ top: (hour / hoursOnGrid.length) * 100 + '%' }"
        ></div>
      </div>

      <DayTimeline v-for="(d, i) in dates" :key="d.toMillis()" :date="d" :events="eventsByDay[i]!" />
    </div>
  </div>
</template>

<style scoped>
#view-container {
  height: calc(100% - 2rem);

  display: grid;
  grid-template-columns: 3rem auto;
  grid-template-rows: 2rem auto;
  grid-template-areas:
    '- datebar'
    'timebar content';

  position: relative;
  margin: 1rem;
}

#top-bar,
#content {
  display: grid;
  grid-auto-flow: column;
  grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
}

#content {
  position: relative;
  border-right: var(--grid-border); /* add the missing border for the grid */
  grid-area: content;
}

#top-bar {
  border-bottom: var(--grid-border);
  grid-area: datebar;

  span.today {
    color: var(--git-color);
  }
}

#left-time-bar {
  grid-area: timebar;
  display: grid;

  span {
    border-top: 1px solid transparent;
    font-size: 0.7rem;
    text-align: right;
    padding-right: 0.6rem;

    position: relative;
    top: -0.5rem;
  }
}

.hour-lines {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none; /* allow clicking events */
}

.hour-line {
  position: absolute;
  left: 0;
  right: 0;
  height: var(--grid-thickness);
  background: var(--grid-color);
}
</style>
