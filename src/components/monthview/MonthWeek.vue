<script setup lang="ts">
import { computed, type CSSProperties } from 'vue';
import { DateTime } from 'luxon';
import MonthEvent from '@/components/monthview/MonthEvent.vue';
import { useEventModal } from '@/composables/modals/useEventModal';
import type { CalendarDragController } from '@/composables/useCalendarDrag';
import type { CalendarEvent } from '@/types/core';
import { layoutEventsByDay } from '@/utils/allDayEventLayout';

const props = defineProps<{
  days: DateTime[];
  events: CalendarEvent[];
  currentMonth: number;
  drag: CalendarDragController;
}>();

const emit = defineEmits<{
  moveStart: [event: CalendarEvent, pointerEvent: PointerEvent];
}>();

const eventModal = useEventModal();

const laidOutEvents = computed(() => {
  const weekStart = props.days[0]?.startOf('day');
  if (!weekStart) return [];

  const visibleEvents = layoutEventsByDay(props.events, weekStart, 7);

  const eventsPerDay = Array.from({ length: 7 }, () => 0);
  for (const item of visibleEvents) {
    for (let day = item.startIndex; day <= item.endIndex; day++) eventsPerDay[day]++;
  }

  return visibleEvents.map((item) => {
    const style: CSSProperties = {
      gridColumn: `${item.startIndex + 1} / ${item.endIndex + 2}`,
      gridRow: String(item.row),
    };

    return {
      ...item,
      style,
      compact: eventsPerDay.slice(item.startIndex, item.endIndex + 1).some((count) => count > 2),
    };
  });
});

function isSelected(day: DateTime) {
  const activeEvent = props.drag.active.value;
  if (props.drag.mode.value !== 'create-all-day' || !activeEvent) return false;

  return activeEvent.from < day.plus({ days: 1 }).startOf('day') && activeEvent.to > day.startOf('day');
}

function openEvent(calendarEvent: CalendarEvent, event: MouseEvent) {
  if (props.drag.consumeClick()) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  eventModal.open(calendarEvent);
}

function startMove(calendarEvent: CalendarEvent, event: PointerEvent) {
  if (calendarEvent === props.drag.active.value) return;
  emit('moveStart', calendarEvent, event);
}
</script>

<template>
  <section class="month-week">
    <div
      v-for="day in days"
      :key="day.toISODate()!"
      class="day-background"
      :class="{
        today: day.hasSame(DateTime.now(), 'day'),
        'outside-month': day.month !== currentMonth,
        selected: isSelected(day),
      }"
    >
      <span class="day-number">{{ day.day }}</span>
    </div>

    <div class="week-events">
      <MonthEvent
        v-for="(item, index) in laidOutEvents"
        :key="item.event.id ?? `${item.event.from.toMillis()}-${item.event.title}-${index}`"
        v-show="item.event === drag.active.value || !drag.isSourceEvent(item.event)"
        :event="item.event"
        :compact="item.compact"
        :interactive="item.event !== drag.active.value && drag.canEdit(item.event)"
        :style="item.style"
        @pointerdown.stop="startMove(item.event, $event)"
        @click="openEvent(item.event, $event)"
      />
    </div>
  </section>
</template>

<style scoped>
.month-week {
  position: relative;
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.day-background {
  min-width: 0;
  padding: 0.3rem;
  border-right: var(--grid-border);
  border-bottom: var(--grid-border);
  transition: background-color 80ms ease-out;
}

.day-number {
  font-size: 0.8rem;
  line-height: 1rem;
  user-select: none;
}

.today .day-number {
  color: var(--git-color);
  font-weight: 700;
}

.outside-month .day-number {
  opacity: 0.35;
}

.day-background.selected {
  background-color: color-mix(in srgb, var(--git-color-real) 8%, transparent);
}

.week-events {
  position: absolute;
  inset: 1.6rem 0 0;
  padding: 0 2px;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  grid-auto-rows: min-content;
  gap: 2px 0;
  align-content: start;
  overflow-y: auto;
}

@media (max-width: 500px) {
  .day-background {
    padding: 0.15rem;
  }

  .week-events {
    inset-block-start: 1.3rem;
  }
}
</style>
