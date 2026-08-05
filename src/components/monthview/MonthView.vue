<script setup lang="ts">
import { computed, ref, useTemplateRef, watch, watchEffect } from 'vue';
import { useRoute } from 'vue-router';
import { useWindowSize } from '@vueuse/core';

import MonthWeek from '@/components/monthview/MonthWeek.vue';
import { useTranslation } from '@/composables/useTranslation';
import { eventsRevision } from '@/composables/useEventsRefresh';
import { useCalendarDrag } from '@/composables/useCalendarDrag';
import { useCalendarFilters } from '@/services/calendarFilters';
import { settings } from '@/services/settings';
import type { CalendarEvent } from '@/types/core';
import { getCurrentViewDatetime, getStartOfWeek } from '@/utils';
import { CalendarCore } from '@/wasm/core-wrapper';

const route = useRoute();
const { width } = useWindowSize();
const { dayNameShort, dayNameSuperShort } = useTranslation();
const { filter } = useCalendarFilters();

const isMobile = computed(() => width.value < 500);

const monthStart = computed(() => getCurrentViewDatetime(route.params).startOf('month'));
const gridStart = computed(() => getStartOfWeek(monthStart.value));
const days = computed(() => Array.from({ length: 42 }, (_, index) => gridStart.value.plus({ days: index })));
const events = ref<CalendarEvent[]>([]);
const daysGridRef = useTemplateRef<HTMLElement>('days-grid-ref');

const drag = useCalendarDrag(updateData);
const weeks = computed(() => Array.from({ length: 6 }, (_, index) => days.value.slice(index * 7, index * 7 + 7)));
const displayedEvents = computed(() => {
  const activeEvent = drag.active.value;
  const showMovedEvent = drag.mode.value === 'move' && drag.moved.value;

  return activeEvent && showMovedEvent ? [...events.value, activeEvent] : events.value;
});

let latestRequest = 0;

async function updateData() {
  const request = ++latestRequest;
  const result = await CalendarCore.getEvents(gridStart.value, gridStart.value.plus({ days: 42 }), filter.value);

  if (request === latestRequest) events.value = result;
}

function startCreate(event: PointerEvent) {
  const grid = daysGridRef.value;
  if (!grid || (event.target instanceof Element && event.target.closest('.month-event'))) return;

  drag.startCreateAllDay(event, grid, 7);
}

function startMove(calendarEvent: CalendarEvent, event: PointerEvent) {
  const grid = daysGridRef.value;
  if (grid) drag.startMoveAllDay(event, calendarEvent, grid, 7);
}

watch([gridStart, eventsRevision, filter, () => settings.value.weekStart], () => void updateData(), {
  immediate: true,
});

watchEffect(() => {
  drag.registerGrid(daysGridRef.value, days.value, 0, 24);
});
</script>

<template>
  <div id="month-view">
    <div class="month-grid">
      <div class="day-names">
        <span v-for="day in days.slice(0, 7)" :key="day.weekday" class="day-name">
          {{ isMobile ? dayNameSuperShort(day) : dayNameShort(day) }}
        </span>
      </div>

      <div ref="days-grid-ref" class="days-grid" @pointerdown="startCreate">
        <MonthWeek
          v-for="week in weeks"
          :key="week[0]?.toMillis() ?? 0"
          :days="week"
          :events="displayedEvents"
          :current-month="monthStart.month"
          :drag="drag"
          @move-start="startMove"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
#month-view {
  grid-area: content;
  min-width: 0;
  min-height: 0;
  margin: 1rem;
  overflow: auto;
}

.month-grid {
  min-width: 42rem;
  min-height: 100%;
  display: grid;
  grid-template-rows: 1.5rem minmax(36rem, 1fr);
}

.day-names {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.day-name {
  min-width: 0;
  padding: 0 0.3rem;
  line-height: 1.5rem;
  user-select: none;
}

.days-grid {
  min-height: 0;
  display: grid;
  grid-template-rows: repeat(6, minmax(6rem, 1fr));
  border-top: var(--grid-border);
  border-left: var(--grid-border);
  touch-action: none;
}

@media (max-width: 768px) {
  #month-view {
    margin: 0.3rem;
  }
}

@media (max-width: 500px) {
  .month-grid {
    min-width: 0;
    grid-template-rows: 1.5rem minmax(27rem, 1fr);
  }

  .days-grid {
    grid-template-rows: repeat(6, minmax(4.5rem, 1fr));
  }

  .day-name {
    padding: 0 0.15rem;
  }
}
</style>
