<script setup lang="ts">
import { getEventColorCSSVariable, toColorId } from '@/colors';
import type { CalendarEvent } from '@/types/core';
import { isWholeDay, timeRangeFormat } from '@/utils';
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    event: CalendarEvent;
    color?: string;
    temporary?: boolean;
  }>(),
  {
    temporary: false,
  },
);

const dynamicStyles = computed(() => {
  let color = getEventColorCSSVariable(toColorId(props.color));
  if (props.temporary) color = 'var(--event-color-git)';
  return {
    '--event-color': color,
  };
});
</script>

<template>
  <div class="allday-event" :style="dynamicStyles" :class="{ temporary: temporary }">
    <span class="title">{{ event.title }}</span>
    <span class="subtitle" v-show="!isWholeDay(event)">{{ timeRangeFormat(event.from, event.to) }}</span>
  </div>
</template>

<style scoped>
.allday-event {
  background-color: color-mix(in srgb, var(--event-color), transparent 50%);
  font-weight: 600;
  font-size: 0.8rem;
  padding: 0 3px;
  line-height: 1.2rem;

  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;

  overflow: hidden;
  white-space: nowrap;
  z-index: 400;

  width: calc(100% - 0.5px);

  display: flex;
  gap: 0.3rem;

  .title {
    height: 1rem;
    line-height: 1.25rem;
  }

  .subtitle {
    font-weight: 400;
    font-size: 0.7rem;
    opacity: 0.7;

    height: 1rem;
    line-height: 1.3rem;
  }
}

.allday-event.temporary {
  background-color: color-mix(in srgb, var(--event-color), transparent 85%); /* light */
}

/* hover only for non-temporary events */
.allday-event:not(.temporary):hover {
  filter: brightness(1.15);
}
</style>
