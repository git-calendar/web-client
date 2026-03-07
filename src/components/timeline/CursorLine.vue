<script setup lang="ts">
import { useSettings } from '@/composables/useSettings';
import { timeInPercentOnTimeline } from '@/utils';
import { DateTime } from 'luxon';
import { computed, onMounted, onUnmounted, ref } from 'vue';

const { settings } = useSettings();

const hour = ref(DateTime.now().hour);
const minute = ref(DateTime.now().minute);
let interval: number;
const today = DateTime.now();

const topPos = computed(() => {
  return `${timeInPercentOnTimeline(today.set({ hour: hour.value, minute: minute.value })) * 100}%`;
});

const timeFormat = computed(() => {
  const now = today.set({ hour: hour.value, minute: minute.value });
  return now.toLocaleString({ hour: '2-digit', minute: '2-digit', hourCycle: settings.value.timeFormat });
});

function updateTime() {
  const now = DateTime.now();
  hour.value = now.hour;
  minute.value = now.minute;
}

onMounted(() => {
  const msTillFullMinute = (60 - DateTime.now().second) * 1000 + (1000 - DateTime.now().millisecond);
  setTimeout(() => {
    updateTime();
    interval = setInterval(updateTime, 60 * 1000); // update every 1 minute
  }, msTillFullMinute + 10); // match the second first, so that it doesnt update on XXh:XXm:30s every time but roughly at XXh:XXm:00s
});

onUnmounted(() => {
  clearInterval(interval);
});
</script>

<template>
  <span
    class="time"
    :class="[settings.timeFormat === 'h12' ? 'time-12h' : 'time-24h']"
    :style="{ top: `calc(${topPos} - 6px)` }"
    >{{ timeFormat }}</span
  >
  <span class="line" :style="{ top: `calc(${topPos} + 2px)` }" />
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
