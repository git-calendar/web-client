<script setup lang="ts">
import type { CalendarEvent } from '@/types/core';
import BaseEvent from '@/components/timeline/BaseEvent.vue';
import { timeRangeFormat } from '@/utils';
import { getTag } from '@/services/calendarCache';
import { computed } from 'vue';

interface Props {
  event: CalendarEvent;
  startHour: number;
  endHour: number;
}
const props = defineProps<Props>();

const eventStyle = computed(() => {
  const hours = props.endHour - props.startHour;
  const start = Math.max(0, (props.event.from.hour + props.event.from.minute / 60 - props.startHour) / hours);
  const end = Math.min(1, (props.event.to.hour + props.event.to.minute / 60 - props.startHour) / hours);

  return {
    top: `${start * 100}%`,
    height: `${(end - start) * 100}%`,
  };
});
</script>

<template>
  <BaseEvent
    :top-style="eventStyle.top"
    :height-style="eventStyle.height"
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
