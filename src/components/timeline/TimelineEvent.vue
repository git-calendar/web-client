<script setup lang="ts">
import type { CalendarEvent } from '@/types/core';
import BaseEvent from '@/components/timeline/BaseEvent.vue';
import { numberOfHours, timeRangeFormat } from '@/utils';
import { settings } from '@/services/settings';

interface Props {
  event: CalendarEvent;
}
const props = defineProps<Props>();

// Calculates the start and end positions for event.
function getEventPosition(event: CalendarEvent): { start: number; end: number } {
  const eventStartHours = event.from.hour + event.from.minute / 60;
  const eventEndHours = event.to.hour + event.to.minute / 60;
  const viewStart = settings.value.dayViewStartHour;

  const start = Math.max(0, (eventStartHours - viewStart) / numberOfHours());
  const end = Math.min(1, (eventEndHours - viewStart) / numberOfHours());

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
  />
</template>

<style scoped>
.timeline-event {
  cursor: pointer;
}
</style>
