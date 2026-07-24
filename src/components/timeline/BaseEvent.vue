<script setup lang="ts">
import { getEventColorCSSVariable, toColorId } from '@/colors';
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    topStyle: string;
    heightStyle: string;
    title: string;
    subtitle: string;
    color?: string;
    temporary?: boolean;
    interactive?: boolean;
  }>(),
  {
    temporary: false,
    interactive: false,
  },
);

const emit = defineEmits<{
  resizeStart: [edge: 'top' | 'bottom', event: PointerEvent];
}>();

const dynamicStyles = computed(() => {
  let color = getEventColorCSSVariable(toColorId(props.color));
  if (props.temporary) color = 'var(--event-color-git)';

  return {
    top: `calc(${props.topStyle} + 1.5px)`,
    height: `calc(${props.heightStyle} - 2px)`,
    '--event-color': color,
  };
});
</script>

<template>
  <div
    class="timeline-event"
    :class="{ temporary: props.temporary, interactive: props.interactive }"
    :style="dynamicStyles"
  >
    <div
      v-if="interactive"
      class="resize-handle resize-handle-top"
      @pointerdown.stop="emit('resizeStart', 'top', $event)"
      @click.stop
    />
    <span class="title">{{ title }}</span>
    <span class="subtitle">{{ subtitle }}</span>
    <div
      v-if="interactive"
      class="resize-handle resize-handle-bottom"
      @pointerdown.stop="emit('resizeStart', 'bottom', $event)"
      @click.stop
    />
  </div>
</template>

<style scoped>
.timeline-event {
  position: absolute;
  left: 0;
  right: 0;
  padding: 0.2rem 0.4rem;
  display: flex;
  flex-direction: column;

  background-color: color-mix(in srgb, var(--event-color), transparent 50%);

  overflow: hidden;
  white-space: nowrap;

  user-select: none;
  -webkit-user-select: none;

  /* solid left border by default */
  background-image: linear-gradient(to bottom, var(--event-color) 100%, transparent 0);
  background-position: left;
  background-size: 3px 100%;
  background-repeat: no-repeat;

  &.interactive {
    cursor: grab;
    touch-action: none;
  }
}

.resize-handle {
  position: absolute;
  left: 0.25rem;
  right: 0.25rem;
  height: min(0.55rem, 25%);
  z-index: 2;
  cursor: ns-resize;
}

.resize-handle-top {
  top: 0;
}

.resize-handle-bottom {
  bottom: 0;
}

/* temporary event styling */
.timeline-event.temporary {
  /* dashed left border (basic dashed border was sus) */
  background-image: repeating-linear-gradient(
    to bottom,
    var(--event-color) 0,
    var(--event-color) 6px,
    transparent 6px,
    transparent 12px
  );
  background-position: left;
  background-size: 3px 100%;
  background-repeat: repeat-y;

  background-color: color-mix(in srgb, var(--event-color), transparent 80%); /* light */
}

/* hover only for non-temporary events */
.timeline-event:not(.temporary):hover {
  filter: brightness(1.15);
}

.title {
  font-weight: 600;
  font-size: 0.8rem;
}

.subtitle {
  font-size: 0.7rem;
  opacity: 0.8;
}
</style>
