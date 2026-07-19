<script setup lang="ts">
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
