<script setup lang="ts">
import { UpdateStrategy } from '@/types/core';

const props = defineProps<{
  strategy: UpdateStrategy;
}>();

function isFilled(i: number): boolean {
  if (props.strategy === UpdateStrategy.All) return true;
  if (props.strategy === UpdateStrategy.Following && i >= 3) return true;
  if (props.strategy === UpdateStrategy.Current && i == 3) return true;
  return false;
}
</script>

<template>
  <div class="rects">
    <div v-for="i in 5" :key="i" class="rect" :class="{ filled: isFilled(i) }"></div>
  </div>
</template>

<style scoped>
.rects {
  display: flex;
  gap: 3px;
}

.rect {
  width: 20%;
  aspect-ratio: 1/1;
  border-radius: var(--small-border-radius);

  background: transparent;
  border: 1px solid var(--git-color);
}

.rect.filled {
  background: var(--git-color);
  border-color: var(--git-color);
}
</style>
