<script setup lang="ts">
import { colorsList, getColorI18nKey, getEventColorCSSVariable } from '@/colors';
import { useId } from 'vue';
import { useI18n } from 'vue-i18n';

const props = withDefaults(
  defineProps<{
    label: string;
    name?: string;
    invalid?: boolean;
  }>(),
  {
    name: 'color',
    invalid: false,
  },
);

const model = defineModel<string>({ required: true });
const { t } = useI18n();
const uid = useId();
</script>

<template>
  <div class="color-picker">
    <span :id="`${uid}-label`">{{ label }}:</span>

    <div
      class="color-options"
      role="radiogroup"
      :aria-labelledby="`${uid}-label`"
      :aria-invalid="invalid || undefined"
      :class="{ invalid }"
    >
      <template v-for="color in colorsList" :key="color">
        <input :id="`${uid}-${color}`" v-model="model" type="radio" :name="props.name" :value="color" />
        <label
          :for="`${uid}-${color}`"
          :title="t(getColorI18nKey(color))"
          :aria-label="t(getColorI18nKey(color))"
          :style="{ '--picker-color': getEventColorCSSVariable(color) }"
        ></label>
      </template>
    </div>
  </div>
</template>

<style scoped>
.color-picker {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.color-options {
  display: grid;
  grid-template-columns: repeat(5, 2rem);
  gap: 0.3rem;
  padding: 2px;
  border: 1px solid transparent;
  border-radius: var(--small-border-radius);
}

.color-options.invalid {
  border-color: var(--git-color);
}

.color-options input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.color-options label {
  position: relative;
  width: 2rem;
  height: 2rem;
  padding: 0.25rem;
  cursor: pointer;
  border-radius: var(--small-border-radius);
  background-color: var(--btn-bg-color);
}

.color-options label::before {
  content: '';
  display: block;
  width: 100%;
  height: 100%;
  border-radius: calc(var(--small-border-radius) - 1px);
  background-color: var(--picker-color);
}

.color-options label:hover {
  background-color: var(--btn-bg-color-hover);
}

.color-options input:checked + label {
  background-color: var(--text-color-harder);
}

.color-options input:focus-visible + label {
  outline: 1px solid var(--text-color-hard);
  outline-offset: 1px;
}

.color-options input:disabled + label {
  cursor: not-allowed;
  opacity: 0.5;
}
</style>
