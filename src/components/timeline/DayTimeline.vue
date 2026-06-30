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

const DAY_MINUTES = 24 * 60;
const HOUR_REM = 5;
const TITLE_REM = 2;
const SOFT_STEP = 7;
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
  const timeDifference = start(a) - start(b);
  if (timeDifference !== 0) {
    return timeDifference;
  }
  return end(a) - end(b);
}

function overlaps(a: CalendarEvent, b: CalendarEvent) {
  const highestStart = Math.max(start(a), start(b));
  const lowestEnd = Math.min(end(a), end(b));
  return highestStart < lowestEnd;
}

function remToPx(rem: number) {
  if (typeof window === 'undefined') {
    return rem * 16;
  }
  const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
  return rem * rootFontSize;
}

const titleMinutes = computed(function () {
  let height = gridHeight.value;
  if (height === 0) {
    height = 24 * remToPx(HOUR_REM);
  }
  return remToPx(TITLE_REM) / (height / DAY_MINUTES);
});

function coversTitle(a: CalendarEvent, b: CalendarEvent) {
  if (!overlaps(a, b)) {
    return false;
  }
  const timeDifferenceInMinutes = Math.abs(start(a) - start(b)) / 60;
  return timeDifferenceInMinutes < titleMinutes.value;
}

type ColumnLayout = {
  column: number;
  columns: number;
};

function getColumnLayout(events: CalendarEvent[]) {
  let groups: CalendarEvent[][] = [];

  // Group events that cover each other's titles
  for (const event of events) {
    let hitGroups: CalendarEvent[][] = [];
    let nonHitGroups: CalendarEvent[][] = [];

    // Separate groups into 'hits' and 'non-hits'
    for (const group of groups) {
      let hasHit = false;
      for (const item of group) {
        if (coversTitle(item, event)) {
          hasHit = true;
          break; // Found a collision, stop checking this group
        }
      }

      if (hasHit) {
        hitGroups.push(group);
      } else {
        nonHitGroups.push(group);
      }
    }

    groups = nonHitGroups;

    if (hitGroups.length > 0) {
      // Manually flatten hitGroups and add the current event
      let mergedGroup: CalendarEvent[] = [];
      for (const group of hitGroups) {
        for (const item of group) {
          mergedGroup.push(item);
        }
      }
      mergedGroup.push(event);

      // Sort the merged group and add it back
      mergedGroup.sort(byTime);
      groups.push(mergedGroup);
    } else {
      // Create a brand new group
      groups.push([event]);
    }
  }

  // Calculate columns for the groups
  const layout = new Map<CalendarEvent, ColumnLayout>();

  for (const group of groups) {
    if (group.length < 2) continue;

    const columns: CalendarEvent[][] = [];

    for (const event of group) {
      let foundColumnIndex = -1;

      // Find a column where the event doesn't overlap with existing items
      for (let i = 0; i < columns.length; i++) {
        const columnItems = columns[i];
        let hasOverlap = false;

        for (const item of columnItems) {
          if (overlaps(item, event)) {
            hasOverlap = true;
            break;
          }
        }

        if (!hasOverlap) {
          foundColumnIndex = i;
          break;
        }
      }

      // If no column fits, create a new one
      if (foundColumnIndex < 0) {
        columns.push([]);
        foundColumnIndex = columns.length - 1;
      }

      columns[foundColumnIndex].push(event);
      layout.set(event, { column: foundColumnIndex, columns: 0 });
    }

    // Apply the total column count to every event in this group
    for (const event of group) {
      const eventLayout = layout.get(event);
      if (eventLayout) {
        eventLayout.columns = columns.length;
      }
    }
  }

  return layout;
}

function columnStyle(layoutData: ColumnLayout) {
  const column = layoutData.column;
  const columns = layoutData.columns;
  const width = 100 / columns;
  const takenRem = RIGHT_REM + GAP_REM * (columns - 1);

  return {
    left: `calc(${width * column}% - ${(takenRem / columns) * column}rem + ${GAP_REM * column}rem)`,
    width: `calc(${width}% - ${takenRem / columns}rem)`,
  };
}

function softIndex(
  event: CalendarEvent,
  previousEvents: CalendarEvent[],
  columns: Map<CalendarEvent, ColumnLayout>,
  stack: Map<CalendarEvent, number>,
) {
  const usedIndexes = new Set<number>();

  for (const prev of previousEvents) {
    if (!columns.has(prev)) {
      if (overlaps(prev, event)) {
        if (!coversTitle(prev, event)) {
          let index = stack.get(prev);
          if (index === undefined) {
            index = 0;
          }
          usedIndexes.add(index);
        }
      }
    }
  }

  let index = 0;
  while (usedIndexes.has(index)) {
    index++;
  }

  stack.set(event, index);
  return index;
}

const laidOutEvents = computed(function () {
  const columns = getColumnLayout(props.events);
  const stack = new Map<CalendarEvent, number>();
  const result = [];

  for (let i = 0; i < props.events.length; i++) {
    const event = props.events[i];
    const column = columns.get(event);

    // Get previous events manually instead of slice()
    const previousEvents = [];
    for (let j = 0; j < i; j++) {
      previousEvents.push(props.events[j]);
    }

    let styleOverrides = {};

    if (column) {
      styleOverrides = columnStyle(column);
    } else {
      const sIndex = softIndex(event, previousEvents, columns, stack);
      styleOverrides = {
        left: `${sIndex * SOFT_STEP}%`,
        right: `${RIGHT_REM}rem`,
      };
    }

    result.push({
      ...event,
      layoutStyle: {
        position: 'absolute',
        zIndex: 10 + i,
        ...styleOverrides,
      },
    });
  }

  return result;
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
