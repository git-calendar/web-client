<script setup lang="ts">
import { computed, type CSSProperties, useTemplateRef } from 'vue';
import { DateTime } from 'luxon';
import { useElementSize } from '@vueuse/core';
import { FiChevronDown } from 'vue-icons-plus/fi';
import MonthEvent from '@/components/monthview/MonthEvent.vue';
import { useEventModal } from '@/composables/modals/useEventModal';
import type { CalendarDragController } from '@/composables/useCalendarDrag';
import type { CalendarEvent } from '@/types/core';
import { getWeekAlignedRedirect, isWholeDay } from '@/utils';
import router from '@/router';
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
const MORE_INDICATOR_HEIGHT_REM = 1.2;

const weekEventsRef = useTemplateRef<HTMLElement>('week-events-ref');
const { height: weekEventsHeight } = useElementSize(weekEventsRef);

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
      width: `calc(${widthPercent}% - ${EVENT_MARGIN_REM * 2}rem - 0.05rem)`,
      height: `${height}rem`,
    };

    return { ...item, style, compact, bottom: top + height };
  });
});

const visibleLayout = computed(() => {
  const hiddenCounts = Array.from({ length: 7 }, () => 0);
  const rootFontSize =
    typeof document === 'undefined' ? 16 : Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const availableHeight = weekEventsHeight.value / rootFontSize;

  if (availableHeight <= 0) return { events: laidOutEvents.value, hiddenCounts };

  const overflowingDays = Array.from({ length: 7 }, () => false);
  for (const item of laidOutEvents.value) {
    if (item.bottom <= availableHeight) continue;
    for (let day = item.startIndex; day <= item.endIndex; day++) overflowingDays[day] = true;
  }

  if (!overflowingDays.some(Boolean)) return { events: laidOutEvents.value, hiddenCounts };

  const eventBottomLimits = overflowingDays.map((overflows) =>
    overflows ? Math.max(0, availableHeight - MORE_INDICATOR_HEIGHT_REM) : availableHeight,
  );
  const events = laidOutEvents.value.filter((item) => {
    const bottomLimit = Math.min(...eventBottomLimits.slice(item.startIndex, item.endIndex + 1));
    if (item.bottom <= bottomLimit) return true;

    for (let day = item.startIndex; day <= item.endIndex; day++) hiddenCounts[day]++;
    return false;
  });

  return { events, hiddenCounts };
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

function openWeek(day: DateTime) {
  router.push(getWeekAlignedRedirect(day));
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

    <div ref="week-events-ref" class="week-events">
      <MonthEvent
        v-for="(item, index) in visibleLayout.events"
        :key="item.event.id ?? `${item.event.from.toMillis()}-${item.event.title}-${index}`"
        v-show="item.event === drag.active.value || !drag.isSourceEvent(item.event)"
        :event="item.event"
        :compact="item.compact"
        :interactive="item.event !== drag.active.value && drag.canEdit(item.event)"
        :style="item.style"
        @pointerdown.stop="startMove(item.event, $event)"
        @click="openEvent(item.event, $event)"
      />

      <div
        v-for="(count, dayIndex) in visibleLayout.hiddenCounts"
        v-show="count > 0"
        :key="dayIndex"
        class="more-events"
        :style="{ left: `${(dayIndex / 7) * 100}%`, width: `${100 / 7}%` }"
      >
        <span
          class="more-events-content"
          role="button"
          tabindex="0"
          @pointerdown.stop
          @click.stop="openWeek(days[dayIndex]!)"
          @keydown.enter.stop.prevent="openWeek(days[dayIndex]!)"
          @keydown.space.stop.prevent="openWeek(days[dayIndex]!)"
        >
          <FiChevronDown aria-hidden="true" />
          <span>{{ count }} {{ $t('event.more') }}</span>
        </span>
      </div>
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
  overflow: hidden;
}

.more-events {
  position: absolute;
  bottom: 0;
  z-index: 2;
  height: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  color: var(--text-color);
  font-size: 0.7rem;
  pointer-events: none;
  padding-bottom: 0.2rem;

  .more-events-content {
    max-width: 100%;
    display: flex;
    align-items: center;
    gap: 0.1rem;
    overflow: hidden;
    border-bottom: 1px solid currentColor;
    white-space: nowrap;
    cursor: pointer;
    pointer-events: auto;

    svg {
      width: 0.8rem;
      height: 0.8rem;
      flex: none;
    }

    span {
      overflow: hidden;
      text-overflow: ellipsis;
    }

    &:hover,
    &:focus-visible {
      color: var(--text-color-hard);
    }
  }
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
