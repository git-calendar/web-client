<script setup lang="ts">
import { getEventColorCSSVariable, toColorId } from '@/colors';
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    topStyle?: string;
    heightStyle?: string;
    title: string;
    subtitle?: string;
    color?: string;
    temporary?: boolean;
    interactive?: boolean;
    resizable?: boolean;
    variant?: 'timeline' | 'month';
    compact?: boolean;
    withoutTime?: boolean;
    showSubtitle?: boolean;
  }>(),
  {
    subtitle: '',
    temporary: false,
    interactive: false,
    resizable: false,
    variant: 'timeline',
    compact: false,
    withoutTime: false,
    showSubtitle: true,
  },
);

const emit = defineEmits<{
  resizeStart: [edge: 'top' | 'bottom', event: PointerEvent];
}>();

const dynamicStyles = computed(() => {
  let color = getEventColorCSSVariable(toColorId(props.color));
  if (props.temporary) color = 'var(--event-color-git)';

  return {
    ...(props.topStyle !== undefined ? { top: `calc(${props.topStyle} + 1.5px)` } : {}),
    ...(props.heightStyle !== undefined ? { height: `calc(${props.heightStyle} - 2px)` } : {}),
    '--event-color': color,
  };
});
</script>

<template>
  <div
    class="base-event"
    :class="{
      'timeline-event': variant === 'timeline',
      'month-event': variant === 'month',
      temporary,
      interactive,
      compact,
      'without-time': withoutTime,
    }"
    :style="dynamicStyles"
  >
    <div
      v-if="resizable"
      class="resize-handle resize-handle-top"
      @pointerdown.stop="emit('resizeStart', 'top', $event)"
      @click.stop
    />
    <span class="title">{{ title }}</span>
    <span v-if="showSubtitle" class="subtitle">{{ subtitle }}</span>
    <div
      v-if="resizable"
      class="resize-handle resize-handle-bottom"
      @pointerdown.stop="emit('resizeStart', 'bottom', $event)"
      @click.stop
    />
  </div>
</template>

<style scoped>
.base-event {
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
  cursor: pointer;

  /* solid left border by default */
  background-image: linear-gradient(to bottom, var(--event-color) 100%, transparent 0);
  background-position: left;
  background-size: 3px 100%;
  background-repeat: no-repeat;

  &.interactive {
    cursor: var(--timeline-event-cursor, grab);
    touch-action: none;
  }
}

.resize-handle {
  position: absolute;
  left: 0.25rem;
  right: 0.25rem;
  height: min(0.55rem, 25%);
  z-index: 2;
  cursor: var(--timeline-resize-cursor, ns-resize);
}

.resize-handle-top {
  top: 0;
}

.resize-handle-bottom {
  bottom: 0;
}

/* temporary event styling */
.base-event.temporary {
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
.base-event:not(.temporary):hover {
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

.month-event {
  right: auto;
  height: 2.4rem;
  min-height: 2.4rem;

  .title,
  .subtitle {
    overflow: hidden;
    line-height: 1rem;
  }

  &.without-time {
    height: 1.4rem;
    min-height: 1.4rem;
    padding-block: 0.1rem;

    &:not(.compact) {
      justify-content: center;
    }
  }

  &.compact {
    height: 1.4rem;
    min-height: 1.4rem;
    padding-block: 0.1rem;
    flex-direction: row;
    align-items: center;
    gap: 0.3rem;

    .title {
      max-width: 100%;
      flex: 0 0 auto;
    }

    .subtitle {
      min-width: 0;
      flex: 1 1 auto;
    }
  }
}

@media (max-width: 500px) {
  .month-event {
    padding-inline: 0.25rem;

    &.compact {
      gap: 0.15rem;

      .subtitle {
        display: none;
      }
    }
  }
}
</style>
