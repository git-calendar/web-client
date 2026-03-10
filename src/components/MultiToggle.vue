<script setup lang="ts">
const props = defineProps<{
  options: string[];
  modelValue: string;
  name?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const uid = Math.random().toString(36).slice(2, 7);
const id = (i: number) => `toggle-${uid}-${i}`;
</script>

<template>
  <div ref="toggle" class="toggle">
    <template v-for="(option, i) in options" :key="option">
      <input
        type="radio"
        :id="id(i)"
        :name="name ?? `toggle-${uid}`"
        :value="option"
        :checked="modelValue === option"
        @change="emit('update:modelValue', option)"
      />
      <label :for="id(i)">{{ option }}</label>
    </template>
  </div>
</template>

<style scoped>
.toggle {
  height: 2.2rem;
  display: inline-flex;
  background-color: var(--btn-bg-color);
  border-radius: var(--small-border-radius);
  padding: 2px;
}

.toggle input[type='radio'] {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.toggle label {
  position: relative;
  z-index: 1;
  padding: 0.4em 0.6em;
  font-size: 0.9rem;
  border-radius: calc(var(--small-border-radius) - 2px); /* minus toggle padding */
  cursor: pointer;
  user-select: none;
  opacity: 0.5;
}

.toggle label:hover {
  opacity: 0.85;
}

.toggle label:active {
  transform: translateY(1px);
}

.toggle input[type='radio']:checked + label {
  background-color: rgba(255, 255, 255, 0.1);
  opacity: 1;
}
</style>
