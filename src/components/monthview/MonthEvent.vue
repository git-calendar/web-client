<script setup lang="ts">
import { computed } from 'vue';
import { getEventColorCSSVariable, toColorId } from '@/colors';
import { getTag } from '@/services/calendarCache';
import type { CalendarEvent } from '@/types/core';
import { isWholeDay, timeRangeFormat } from '@/utils';

const props = defineProps<{
  event: CalendarEvent;
  compact: boolean;
  interactive: boolean;
}>();

const eventStyle = computed(() => ({
  '--event-color': getEventColorCSSVariable(toColorId(getTag(props.event.calendar, props.event.tagId ?? '')?.color)),
}));
const showTime = computed(() => !isWholeDay(props.event));
</script>

<template>
  <div class="month-event" :class="{ compact, interactive, 'without-time': !showTime }" :style="eventStyle">
    <span class="title">{{ event.title }}</span>
    <span v-if="showTime" class="time">{{ timeRangeFormat(event.from, event.to) }}</span>
  </div>
</template>

<style scoped>
.month-event {
  position: absolute;
  height: 2.4rem;
  min-height: 2.4rem;
  padding: 0.2rem 0.4rem;
  display: flex;
  flex-direction: column;
  flex: none;
  overflow: hidden;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
  background-color: color-mix(in srgb, var(--event-color), transparent 50%);
  background-image: linear-gradient(to bottom, var(--event-color) 100%, transparent 0);
  background-position: left;
  background-size: 3px 100%;
  background-repeat: no-repeat;
}

.month-event.interactive {
  cursor: grab;
  touch-action: none;
}

.month-event.without-time {
  height: 1.4rem;
  min-height: 1.4rem;
  padding-block: 0.1rem;
}

.month-event.without-time:not(.compact) {
  justify-content: center;
}

.month-event:hover {
  filter: brightness(1.15);
}

.title {
  overflow: hidden;
  font-size: 0.8rem;
  font-weight: 600;
  line-height: 1rem;
}

.time {
  overflow: hidden;
  font-size: 0.7rem;
  line-height: 1rem;
  opacity: 0.8;
}

.month-event.compact {
  height: 1.4rem;
  min-height: 1.4rem;
  padding-block: 0.1rem;
  flex-direction: row;
  align-items: center;
  gap: 0.3rem;

  .title {
    max-width: 100%;
    flex: 0 0 auto;
  }

  .time {
    min-width: 0;
    flex: 1 1 auto;
  }
}

@media (max-width: 500px) {
  .month-event {
    padding-inline: 0.25rem;
  }

  .month-event.compact {
    gap: 0.15rem;

    .time {
      display: none;
    }
  }
}
</style>
