<script setup lang="ts">
import type { CalendarEvent } from '@/types/core';
import BaseEvent from '@/components/timeline/BaseEvent.vue';
import { timeRangeFormat } from '@/utils';
import { getTag } from '@/services/calendarCache';

interface Props {
  event: CalendarEvent;
  startHour: number;
  endHour: number;
}
const props = defineProps<Props>();

// Calculates the start and end positions for event.
function getEventPosition(event: CalendarEvent): { start: number; end: number } {
  const eventStartHours = event.from.hour + event.from.minute / 60;
  const eventEndHours = event.to.hour + event.to.minute / 60;
  const numberOfHours = props.endHour - props.startHour;

  const start = Math.max(0, (eventStartHours - props.startHour) / numberOfHours);
  const end = Math.min(1, (eventEndHours - props.startHour) / numberOfHours);

  return { start, end };
}

// Calculates the height and Y pos for event.
function getEventStylePos(e: CalendarEvent) {
  const pos = getEventPosition(e);
  return {
    top: `${pos.start * 100}%`,
    height: `${(pos.end - pos.start) * 100}%`,
  };
}
</script>

<template>
  <BaseEvent
    :top-style="getEventStylePos(event).top"
    :height-style="getEventStylePos(event).height"
    :title="event.title"
    :subtitle="timeRangeFormat(event.from, event.to)"
    :color="getTag(event.calendar, event.tagId ?? '')?.color"
  />
</template>

<style scoped>
.timeline-event {
  cursor: pointer;
}
</style>
