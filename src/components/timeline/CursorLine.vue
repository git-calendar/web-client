<script setup lang="ts">
import { settings } from '@/services/settings';

import { DateTime } from 'luxon';
import { computed } from 'vue';
import { useNow } from '@vueuse/core';

const props = defineProps<{
  startHour: number;
  endHour: number;
}>();

const now = useNow({ interval: 60_000 });

const topPos = computed(() => {
  const currentHour = now.value.getHours() + now.value.getMinutes() / 60;
  const position = (currentHour - props.startHour) / (props.endHour - props.startHour);
  return `${Math.max(0, Math.min(1, position)) * 100}%`;
});

const timeFormat = computed(() =>
  DateTime.fromJSDate(now.value).toLocaleString({
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: settings.value.timeFormat,
  }),
);
</script>

<template>
  <span
    class="time"
    :class="[settings.timeFormat === 'h12' ? 'time-12h' : 'time-24h']"
    :style="{ top: `calc(${topPos} - 6px)` }"
    >{{ timeFormat }}</span
  >
  <span class="line" :style="{ top: topPos }" />
</template>

<style scoped>
.time {
  position: absolute;
  text-wrap: nowrap;
  right: 100%;
  background-color: var(--git-color);
  border-radius: 5px;
  padding: 0 0.2rem;
  font-size: 0.7rem;

  &.time-24h {
    margin-right: 0.39rem;
  }

  &.time-12h {
    margin-right: 0.2rem;
  }
}

.line {
  user-select: none;
  pointer-events: none;
  position: absolute;
  width: 100%;
  height: 1px;
  background-color: color-mix(in srgb, var(--git-bg-color), var(--bg-color) 40%);
  z-index: 500;
}
</style>
