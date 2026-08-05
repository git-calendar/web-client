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
</script>

<template>
  <div class="month-event" :class="{ compact, interactive }" :style="eventStyle">
    <span class="title">{{ event.title }}</span>
    <span v-if="!isWholeDay(event)" class="time">{{ timeRangeFormat(event.from, event.to) }}</span>
  </div>
</template>

<style scoped>
.month-event {
  min-height: 2.4rem;
  margin: 1px 0.15rem;
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

.month-event:hover {
  filter: brightness(1.15);
}

.title {
  overflow: hidden;
  font-size: 0.8rem;
  font-weight: 600;
  line-height: 1rem;
  text-overflow: ellipsis;
}

.time {
  overflow: hidden;
  font-size: 0.7rem;
  line-height: 1rem;
  opacity: 0.8;
  text-overflow: ellipsis;
}

.month-event.compact {
  min-height: 1.4rem;
  padding-block: 0.1rem;
  flex-direction: row;
  align-items: center;
  gap: 0.3rem;

  .title {
    flex: 1;
  }

  .time {
    flex: none;
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
