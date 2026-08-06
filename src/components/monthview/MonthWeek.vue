<script setup lang="ts">
import { computed, type CSSProperties } from 'vue';
import { DateTime } from 'luxon';
import MonthEvent from '@/components/monthview/MonthEvent.vue';
import { useEventModal } from '@/composables/modals/useEventModal';
import type { CalendarDragController } from '@/composables/useCalendarDrag';
import type { CalendarEvent } from '@/types/core';
import { isWholeDay } from '@/utils';
import { getVisibleEventsByDay } from '@/utils/allDayEventLayout';

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

const COMPACT_EVENT_HEIGHT_REM = 1.4;
const FULL_EVENT_HEIGHT_REM = 2.4;
const EVENT_GAP_REM = 0.15;
const EVENT_MARGIN_REM = 0.15;

const laidOutEvents = computed(() => {
  const weekStart = props.days[0]?.startOf('day');
  if (!weekStart) return [];

  const visibleEvents = getVisibleEventsByDay(props.events, weekStart, 7);
  const eventsPerDay = Array.from({ length: 7 }, () => 0);
  const dayBottoms = Array.from({ length: 7 }, () => 0);

  for (const item of visibleEvents) {
    for (let day = item.startIndex; day <= item.endIndex; day++) eventsPerDay[day]++;
  }

  return visibleEvents.map((item) => {
    const compact = eventsPerDay.slice(item.startIndex, item.endIndex + 1).some((count) => count > 2);
    const height = compact || isWholeDay(item.event) ? COMPACT_EVENT_HEIGHT_REM : FULL_EVENT_HEIGHT_REM;
    const top = Math.max(...dayBottoms.slice(item.startIndex, item.endIndex + 1));
    const nextBottom = top + height + EVENT_GAP_REM;

    for (let day = item.startIndex; day <= item.endIndex; day++) dayBottoms[day] = nextBottom;

    const leftPercent = (item.startIndex / 7) * 100;
    const widthPercent = (item.span / 7) * 100;
    const style: CSSProperties = {
      top: `${top}rem`,
      left: `calc(${leftPercent}% + ${EVENT_MARGIN_REM}rem)`,
      width: `calc(${widthPercent}% - ${EVENT_MARGIN_REM * 2}rem)`,
      height: `${height}rem`,
    };

    return { ...item, style, compact };
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
  padding: 0.3rem;
  border-right: var(--grid-border);
  border-bottom: var(--grid-border);
}

.day-number {
  position: absolute;
  top: 0.3rem;
  font-size: 0.8rem;
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
