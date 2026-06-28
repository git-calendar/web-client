<script setup lang="ts">
import { colorsList } from '@/colors';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <div class="color-picker-grid">
    <button
      v-for="color in colorsList"
      :key="color.id"
      class="color-item"
      :style="{
        backgroundColor: color.hex + '26' /* 15% opacity for bg */,
        borderLeft: `4px solid ${color.hex}`,
        color: color.hex,
      }"
    >
      <span class="color-name">{{ t(color.i18nKey) }}</span>
      <span class="color-hex">{{ color.hex }}</span>
    </button>
  </div>
</template>

<style scoped>
.color-picker-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 300px;
}

.color-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border: none;
  cursor: pointer;
  font-family: sans-serif;
  font-weight: 500;
  text-align: left;
}

.color-hex {
  font-family: monospace;
  font-size: 0.85em;
  opacity: 0.7;
}
</style>
