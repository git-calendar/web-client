<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import BaseEvent from '@/components/timeline/BaseEvent.vue';
import { getTag } from '@/services/calendarCache';
import type { CalendarEvent } from '@/types/core';
import { isWholeDay, timeRangeFormat } from '@/utils';

defineOptions({ inheritAttrs: false });

const props = defineProps<{
  event: CalendarEvent;
  compact: boolean;
  interactive: boolean;
  temporary: boolean;
}>();

const attrs = useAttrs();
const showTime = computed(() => !isWholeDay(props.event));
const color = computed(() => getTag(props.event.calendar, props.event.tagId ?? '')?.color);
</script>

<template>
  <BaseEvent
    v-bind="attrs"
    variant="month"
    :title="event.title"
    :subtitle="showTime ? timeRangeFormat(event.from, event.to) : ''"
    :color="color"
    :temporary="temporary"
    :interactive="interactive"
    :compact="compact"
    :without-time="!showTime"
    :show-subtitle="showTime"
  />
</template>
