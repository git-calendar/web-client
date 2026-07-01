<script setup lang="ts">
import { colorsList, getColorI18nKey, getEventColorCSSVariable } from '@/colors';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

// helper to get the real hex from CSS variable
const getColorHex = (colorId: string) => {
  return getComputedStyle(document.documentElement).getPropertyValue(`--event-color-${colorId}`).trim() || ''; // fallback
};
</script>

<template>
  <div class="color-picker-grid">
    <button
      v-for="colorId in colorsList"
      :key="colorId"
      class="color-item"
      :style="{
        backgroundColor: `${getEventColorCSSVariable(colorId)}26` /* 15% opacity for bg */,
        borderLeft: `4px solid ${getEventColorCSSVariable(colorId)}`,
        color: getEventColorCSSVariable(colorId),
      }"
    >
      <span class="color-name">{{ t(getColorI18nKey(colorId)) }}</span>
      <span class="color-hex">{{ getColorHex(colorId) }}</span>
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
