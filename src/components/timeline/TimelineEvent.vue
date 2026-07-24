<script setup lang="ts">
import type { CalendarEvent } from '@/types/core';
import BaseEvent from '@/components/timeline/BaseEvent.vue';
import { timeRangeFormat } from '@/utils';
import { getTag } from '@/services/calendarCache';
import { computed, useAttrs } from 'vue';
import type { DateTime } from 'luxon';

defineOptions({ inheritAttrs: false });

interface Props {
  event: CalendarEvent;
  startHour: number;
  endHour: number;
  date?: DateTime;
  temporary?: boolean;
  interactive?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  temporary: false,
  interactive: false,
});

const attrs = useAttrs();

const emit = defineEmits<{
  moveStart: [event: PointerEvent];
  resizeStart: [edge: 'top' | 'bottom', event: PointerEvent];
}>();

function startMove(event: PointerEvent) {
  if (props.interactive) emit('moveStart', event);
}

const eventStyle = computed(() => {
  const rangeMinutes = Math.max((props.endHour - props.startHour) * 60, 1);
  const rangeStart = (props.date ?? props.event.from).startOf('day').plus({ hours: props.startHour });
  const start = Math.max(0, props.event.from.diff(rangeStart, 'minutes').minutes / rangeMinutes);
  const end = Math.min(1, props.event.to.diff(rangeStart, 'minutes').minutes / rangeMinutes);

  return {
    top: `${start * 100}%`,
    height: `${Math.max(0, end - start) * 100}%`,
  };
});
</script>

<template>
  <BaseEvent
    v-bind="attrs"
    :top-style="eventStyle.top"
    :height-style="eventStyle.height"
    :title="temporary && !event.title ? $t('event.new') : event.title"
    :subtitle="timeRangeFormat(event.from, event.to)"
    :color="getTag(event.calendar, event.tagId ?? '')?.color"
    :temporary="temporary"
    :interactive="interactive"
    @pointerdown="startMove"
    @resize-start="(edge, event) => emit('resizeStart', edge, event)"
  />
</template>
