<script setup lang="ts">
import { useEventModal } from '@/composables/modals/useEventModal';
import type { CalendarEvent } from '@/types/core';
import { getAllDayEndDate, getCurrentViewDatetime, isWholeDay } from '@/utils';
import { DateTime } from 'luxon';
import { computed, useTemplateRef } from 'vue';
import { useRoute } from 'vue-router';
import AllDayEvent from '@/components/AllDayEvent.vue';
import { getTag } from '@/services/calendarCache';
import type { CalendarDragController } from '@/composables/useCalendarDrag';

const route = useRoute();
const eventModal = useEventModal();

const props = defineProps<{
  events: CalendarEvent[];
  numOfDays: number;
  drag: CalendarDragController;
}>();

const allDayBarRef = useTemplateRef<HTMLElement>('all-day-bar-ref');

const currentDate = computed(() => getCurrentViewDatetime(route.params).startOf('day'));

const todayGridColumn = computed(() => {
  const today = DateTime.now()
    .setZone(currentDate.value.zoneName ?? undefined)
    .startOf('day');

  for (let i = 0; i < props.numOfDays; i++) {
    if (currentDate.value.plus({ days: i }).hasSame(today, 'day')) {
      return `${i + 1} / span 1`;
    }
  }

  return '';
});

function visibleRange(event: CalendarEvent) {
  const end = isWholeDay(event) ? getAllDayEndDate(event) : event.to;
  const startIndex = event.from.startOf('day').diff(currentDate.value, 'days').days;
  const endIndex = end.startOf('day').diff(currentDate.value, 'days').days;

  if (endIndex < 0 || startIndex >= props.numOfDays) return null;

  const firstDay = Math.max(0, startIndex);
  const lastDay = Math.min(props.numOfDays - 1, endIndex);

  return {
    startIndex: firstDay,
    endIndex: lastDay,
    span: Math.max(1, lastDay - firstDay + 1),
  };
}

function gridStyle(startIndex: number, span: number, row: number) {
  return {
    gridColumn: `${startIndex + 1} / span ${span}`,
    gridRow: String(row),
  };
}

const isCreating = computed(() => props.drag.mode.value === 'create-all-day');

function startCreate(event: PointerEvent) {
  const element = allDayBarRef.value;
  if (!element || (event.target instanceof Element && event.target.closest('.allday-event'))) return;

  props.drag.startCreateAllDay(event, element);
}

const laidOutEvents = computed(() => {
  const visibleEvents = props.events.flatMap((event) => {
    const range = visibleRange(event);
    return range ? [{ event, ...range }] : [];
  });

  visibleEvents.sort((a, b) => (a.startIndex !== b.startIndex ? a.startIndex - b.startIndex : b.span - a.span));

  const rowEnds: number[] = [];
  return visibleEvents.map((item) => {
    let rowIndex = rowEnds.findIndex((endIndex) => endIndex < item.startIndex);

    if (rowIndex === -1) {
      rowIndex = rowEnds.length;
      rowEnds.push(item.endIndex);
    } else {
      rowEnds[rowIndex] = item.endIndex;
    }

    const row = rowIndex + 1;

    return {
      event: item.event,
      startIndex: item.startIndex,
      endIndex: item.endIndex,
      row,
      gridStyle: gridStyle(item.startIndex, item.span, row),
    };
  });
});

const previewEvent = computed(() => {
  const event = props.drag.active.value;
  if (props.drag.mode.value !== 'create-all-day' || !event) return null;

  const range = visibleRange(event);
  if (!range) return null;

  const occupiedRows = new Set(
    laidOutEvents.value
      .filter((item) => item.startIndex <= range.endIndex && item.endIndex >= range.startIndex)
      .map((item) => item.row),
  );

  let row = 1;
  while (occupiedRows.has(row)) row++;

  return {
    event,
    gridStyle: gridStyle(range.startIndex, range.span, row),
  };
});
</script>

<template>
  <div id="allday-bar" ref="all-day-bar-ref" :class="{ 'creating-all-day': isCreating }" @pointerdown="startCreate">
    <AllDayEvent
      v-if="previewEvent"
      class="all-day-preview"
      :event="previewEvent.event"
      :style="previewEvent.gridStyle"
      :temporary="true"
    />
    <AllDayEvent
      v-for="v in laidOutEvents"
      :key="v.event.id"
      :event="v.event"
      :style="v.gridStyle"
      :color="getTag(v.event.calendar, v.event.tagId ?? '')?.color"
      @pointerdown.stop
      @click="eventModal.open(v.event)"
    />
    <div v-if="todayGridColumn" class="today-highlighter" :style="{ gridColumn: todayGridColumn }" />
  </div>
</template>

<style scoped>
#allday-bar {
  position: relative;
  display: grid;
  grid-template-columns: repeat(v-bind('props.numOfDays'), minmax(0, 1fr));
  grid-auto-rows: 1.2rem;
  align-content: start;
  min-height: 1.5rem;
  padding: 1px;
  gap: 2.5px;
  padding-bottom: 1rem;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

.creating-all-day {
  cursor: ew-resize;
}

.all-day-preview {
  z-index: 500;
}

.today-highlighter {
  position: absolute;
  top: 0;
  bottom: 0;
  left: -1px;
  right: -1px;
  background-color: color-mix(in srgb, var(--git-color-real) 8%, transparent);
  pointer-events: none;
}
</style>
