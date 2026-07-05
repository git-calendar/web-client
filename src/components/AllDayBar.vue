<script setup lang="ts">
import { useEventModal } from '@/composables/modals/useEventModal';
import type { CalendarEvent } from '@/types/core';
import { getCurrentViewDatetime } from '@/utils';
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import AllDayEvent from './AllDayEvent.vue';
import { getTag } from '@/services/calendarCache';

const route = useRoute();
const eventModal = useEventModal();

// TODO: horizontal drag

const props = defineProps<{
  events: CalendarEvent[];
  numOfDays: number;
}>();

// Must be computed so route changes properly invalidate compEvents
const currentDate = computed(() => getCurrentViewDatetime(route.params).startOf('day'));

const compEvents = computed(() => {
  const date = currentDate.value;

  // 1. Map to indices, clamp to visible range, and drop fully out-of-range events
  const visibleEvents = props.events
    .filter(Boolean)
    .map((e) => {
      const startIndex = e.from.startOf('day').diff(date, 'days').days;
      const endIndex = e.to.startOf('day').diff(date, 'days').days;
      const clampedStart = Math.max(0, startIndex);
      const clampedEnd = Math.min(props.numOfDays - 1, endIndex);
      return {
        event: e,
        startIndex: clampedStart,
        endIndex: clampedEnd,
        span: Math.max(1, clampedEnd - clampedStart + 1),
      };
    })
    .filter((e) => e.endIndex >= 0 && e.startIndex < props.numOfDays);

  // 2. Sort: earliest start first, then longest span first
  visibleEvents.sort((a, b) => (a.startIndex !== b.startIndex ? a.startIndex - b.startIndex : b.span - a.span));

  // 3. Greedy row packing
  const rowEnds: number[] = [];
  return visibleEvents.map((item) => {
    let rowIndex = rowEnds.findIndex((endIdx) => endIdx < item.startIndex);
    if (rowIndex === -1) {
      rowIndex = rowEnds.length;
      rowEnds.push(item.endIndex);
    } else {
      rowEnds[rowIndex] = item.endIndex;
    }

    return {
      event: item.event,
      // Style object is diffed more efficiently than a style string
      gridStyle: {
        gridColumn: `${item.startIndex + 1} / span ${item.span}`,
        gridRow: String(rowIndex + 1),
      },
    };
  });
});
</script>

<template>
  <div id="allday-bar">
    <AllDayEvent
      v-for="v in compEvents"
      :key="v.event.id"
      :event="v.event"
      :style="v.gridStyle"
      :color="getTag(v.event.calendar, v.event.tagId ?? '')?.color"
      @click="eventModal.open(v.event)"
    />
  </div>
</template>

<style scoped>
#allday-bar {
  display: grid;
  grid-template-columns: repeat(v-bind('props.numOfDays'), minmax(0, 1fr));
  grid-auto-rows: 1.2rem;
  align-content: start;
  min-height: 1.5rem;
  padding: 1px;
  gap: 2.5px;
  padding-bottom: 1.5%;
}
</style>
