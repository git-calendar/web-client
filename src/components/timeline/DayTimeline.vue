<script setup lang="ts">
import { computed, ref, useTemplateRef, watchEffect } from 'vue';
import { DateTime } from 'luxon';
import type { CalendarEvent } from '@/types/core.ts';
import BaseEvent from '@/components/timeline/BaseEvent.vue';
import CursorToday from '@/components/timeline/CursorToday.vue';
import TimelineEvent from '@/components/timeline/TimelineEvent.vue';
import { useEventModal } from '@/composables/modals/useEventModal';
import { useDraggingEvent } from '@/composables/useDraggingEvent';

const props = withDefaults(
  defineProps<{
    date: DateTime;
    events?: CalendarEvent[];
  }>(),
  {
    events: () => [],
  },
);

const eventModal = useEventModal();

const dateIsToday = computed(function () {
  const today = DateTime.now();
  return props.date.day === today.day && props.date.month === today.month && props.date.year === today.year;
});

// ------------ layout ------------

const RIGHT_REM = 1.5;
const GAP_REM = 0.25;

const grid = useTemplateRef<HTMLElement>('timeline-grid-ref');
const gridHeight = ref(0);

watchEffect(function (cleanup) {
  const el = grid.value;
  if (!el) return;

  function sync() {
    gridHeight.value = el?.clientHeight ?? 0;
  }

  const observer = new ResizeObserver(sync);

  observer.observe(el);
  sync();

  cleanup(function () {
    observer.disconnect();
  });
});

// ------------ helpers ------------

function start(event: CalendarEvent) {
  return event.from.toSeconds();
}

function end(event: CalendarEvent) {
  return event.to.toSeconds();
}

function byTime(a: CalendarEvent, b: CalendarEvent) {
  const startDifference = start(a) - start(b);
  if (startDifference !== 0) {
    return startDifference;
  }

  return end(a) - end(b);
}

function splitIntoOverlapGroups(events: CalendarEvent[]) {
  const groups: CalendarEvent[][] = [];
  let group: CalendarEvent[] = [];
  let groupEnd = Number.NEGATIVE_INFINITY;

  for (const event of events) {
    if (group.length > 0 && start(event) >= groupEnd) {
      groups.push(group);
      group = [];
      groupEnd = Number.NEGATIVE_INFINITY;
    }

    group.push(event);

    if (end(event) > groupEnd) {
      groupEnd = end(event);
    }
  }

  if (group.length > 0) {
    groups.push(group);
  }

  return groups;
}

function firstFreeColumn(columns: CalendarEvent[][], event: CalendarEvent) {
  for (let i = 0; i < columns.length; i++) {
    const column = columns[i];
    const lastEvent = column[column.length - 1];

    if (end(lastEvent) <= start(event)) {
      return i;
    }
  }

  return columns.length;
}

function columnStyle(column: number, columns: number) {
  if (columns === 1) {
    return {
      left: '0',
      right: `${RIGHT_REM}rem`,
      width: 'auto',
    };
  }

  const widthPercent = 100 / columns;
  const reservedRem = RIGHT_REM + GAP_REM * (columns - 1);
  const columnReservedRem = reservedRem / columns;

  return {
    left: `calc(${widthPercent * column}% - ${columnReservedRem * column}rem + ${GAP_REM * column}rem)`,
    right: 'auto',
    width: `calc(${widthPercent}% - ${columnReservedRem}rem)`,
  };
}

function layoutEvents(events: CalendarEvent[]) {
  const sortedEvents = [...events].sort(byTime);
  const groups = splitIntoOverlapGroups(sortedEvents);
  const result = [];

  for (const group of groups) {
    const columns: CalendarEvent[][] = [];
    const placedEvents = [];

    for (const event of group) {
      const column = firstFreeColumn(columns, event);

      if (column === columns.length) {
        columns.push([]);
      }

      columns[column].push(event);
      placedEvents.push({ event, column });
    }

    for (const placedEvent of placedEvents) {
      result.push({
        ...placedEvent.event,
        layoutStyle: {
          position: 'absolute',
          zIndex: 10 + result.length,
          ...columnStyle(placedEvent.column, columns.length),
        },
      });
    }
  }

  return result;
}

const laidOutEvents = computed(function () {
  return layoutEvents(props.events);
});

// ------------ dragging ------------

const timelineRef = useTemplateRef<HTMLElement>('timeline-ref');

const { drag, placeholderTop, placeholderHeight, placeholderSubtitle, dragStart } = useDraggingEvent(
  timelineRef,
  computed(() => props.date),
);
</script>

<template>
  <div class="day-timeline" :class="{ 'dragging-cursor': drag.active }" @pointerdown="dragStart" ref="timeline-ref">
    <div class="timeline-grid" ref="timeline-grid-ref">
      <BaseEvent
        v-if="drag.active"
        :top-style="placeholderTop"
        :height-style="placeholderHeight"
        :title="$t('event.new')"
        :subtitle="placeholderSubtitle"
        :temporary="true"
        :color="'git-real'"
      />

      <TimelineEvent
        v-for="event in laidOutEvents"
        :key="event.id"
        :event="event"
        :style="event.layoutStyle"
        @click="eventModal.open(event)"
      />

      <CursorToday v-if="dateIsToday" />
    </div>
  </div>
</template>

<style scoped>
.day-timeline {
  position: relative;

  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

.timeline-grid {
  position: relative;
  height: 100%;
  padding: 0 min(10%, 1rem) 0 4px;

  &:has(.temporary) .timeline-event:hover {
    filter: none;
    cursor: ns-resize;
  }
}

.dragging-cursor {
  cursor: ns-resize;
}
</style>
