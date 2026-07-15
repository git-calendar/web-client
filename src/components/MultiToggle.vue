<script setup lang="ts">
const props = defineProps<{
  options: readonly string[];
  labels?: readonly string[];
  disabled?: readonly string[];
  modelValue: string;
  name?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string]; // special thing for using this component as <MultiToggle v-model="SOMETHING" />
}>();

const uid = Math.random().toString(36).slice(2, 7);
const id = (i: number) => `toggle-${uid}-${i}`;
</script>

<template>
  <div ref="toggle" class="toggle">
    <!-- second template cuz why not, it would need anothed div instead -->
    <template v-for="(option, i) in options" :key="option">
      <input
        type="radio"
        :id="id(i)"
        :name="name ?? `toggle-${uid}`"
        :value="option"
        :checked="modelValue === option"
        :disabled="disabled?.includes(option)"
        @change="emit('update:modelValue', option)"
      />
      <label :for="id(i)">{{ labels ? (labels[i] ?? option) : option }}</label>
    </template>
  </div>
</template>

<style scoped>
.toggle {
  height: 2rem;
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
  padding: 0.8em;
  display: flex;
  align-items: center;
  font-size: 0.9rem;
  border-radius: calc(var(--small-border-radius) - 2px); /* minus toggle padding */
  cursor: pointer;
  user-select: none;
  opacity: 0.5;
}

.toggle label:hover {
  opacity: 0.85;
}

.toggle input:enabled + label:active {
  transform: translateY(1px);
}

.toggle input[type='radio']:checked + label {
  background-color: var(--btn-bg-color-checked);
  opacity: 1;
}

.toggle input[disabled] + label {
  text-decoration: line-through;
}
</style>
