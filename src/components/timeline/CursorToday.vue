<script setup lang="ts">
import { DateTime } from 'luxon';
import { computed, onMounted, onUnmounted, ref } from 'vue';

const props = defineProps<{
  startHour: number;
  endHour: number;
}>();

const hour = ref(DateTime.now().hour);
const minute = ref(DateTime.now().minute);
let interval: number;

const topPos = computed(() => {
  const currentHour = hour.value + minute.value / 60;
  const position = (currentHour - props.startHour) / (props.endHour - props.startHour);
  return `${Math.max(0, Math.min(1, position)) * 100}%`;
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
  }, msTillFullMinute); // match the second first, so that it doesnt update on XXh:XXm:30s every time but roughly at XXh:XXm:00s
});

onUnmounted(() => {
  clearInterval(interval);
});
</script>

<template>
  <span class="today-highlight" :style="{ top: `calc(${topPos} - 2px` }"></span>
</template>

<style scoped>
.today-highlight {
  user-select: none;
  pointer-events: none;

  position: absolute;
  width: calc(100% + 2px);
  height: 5px;

  background-color: var(--git-color);
  border: 1px var(--bg-color) solid;
  border-radius: 3px;
  z-index: 501;

  position: absolute;
  left: -1px;

  &::before {
    content: '';
    display: block;
    position: relative;
    top: -3px;
    left: -4px;

    border: 1px var(--bg-color) solid;
    background-color: inherit;
    height: 7px;
    width: 7px;
  }
}
</style>
