<script setup lang="ts">
import { computed, ref, toRef, useTemplateRef, watchEffect, type CSSProperties } from 'vue';
import { DateTime } from 'luxon';

import type { CalendarEvent } from '@/types/core.ts';
import CursorToday from '@/components/timeline/CursorToday.vue';
import TimelineEvent from '@/components/timeline/TimelineEvent.vue';
import { useEventModal } from '@/composables/modals/useEventModal';
import type { CalendarDragController } from '@/composables/useCalendarDrag';

type LaidOutEvent = CalendarEvent & {
  layoutStyle: CSSProperties;
};

type GridSize = {
  widthRem: number;
  heightRem: number;
};

type EventLayout = {
  column: number;
  columns: number;
  coverLevel: number;
};

type ActiveGroup = {
  end: number;
  coverLevel: number;
  columns: number;
  leftColumnEnd: number;
};

type PlacedEvent = {
  event: CalendarEvent;
  layout: EventLayout;
};

const props = withDefaults(
  defineProps<{
    date: DateTime;
    events?: CalendarEvent[];
    startHour: number;
    endHour: number;
    drag: CalendarDragController;
  }>(),
  {
    events: () => [],
  },
);

const TITLE_HEIGHT_REM = 1.75;
const TITLE_GAP_REM = 0.25;

const COLUMN_GAP_REM = 0.25;
const MIN_EVENT_RIGHT_REM = 0.5;
const EVENT_RIGHT_RATIO = 0.1;
const COVER_STEP_REM = 0.5;

const DEFAULT_LAYOUT: EventLayout = {
  column: 0,
  columns: 1,
  coverLevel: 0,
};

const eventModal = useEventModal();

const timelineGridRef = useTemplateRef<HTMLElement>('timeline-grid-ref');

const grid = ref<GridSize>({
  widthRem: 0,
  heightRem: 0,
});

const timelineDate = toRef(props, 'date');

const dayStartSeconds = computed(() => timelineDate.value.startOf('day').plus({ hours: props.startHour }).toSeconds());
const dayEndSeconds = computed(() => timelineDate.value.startOf('day').plus({ hours: props.endHour }).toSeconds());
const dayDurationSeconds = computed(() => Math.max(dayEndSeconds.value - dayStartSeconds.value, 1));
const dateIsToday = computed(() => timelineDate.value.hasSame(DateTime.now(), 'day'));
const laidOutEvents = computed(() => layoutEvents(props.events));
const previewEvent = computed(() => {
  if (!props.drag.isTimedDrag.value || (!props.drag.moved.value && props.drag.mode.value !== 'create')) return null;

  const event = props.drag.active.value;
  const columnDate = props.drag.activeColumnDate.value;
  return event && columnDate?.hasSame(timelineDate.value, 'day') ? event : null;
});
const previewLayoutStyle = computed<CSSProperties>(() => {
  const sourceEvent = laidOutEvents.value.find((event) => props.drag.isSourceEvent(event));
  return sourceEvent ? { ...sourceEvent.layoutStyle, zIndex: 600 } : { zIndex: 600 };
});
const isCreating = computed(() => props.drag.mode.value === 'create');
const isMoving = computed(() => props.drag.mode.value === 'move' && props.drag.moved.value && !props.drag.saving.value);
const isResizing = computed(
  () =>
    (props.drag.mode.value === 'resize-top' || props.drag.mode.value === 'resize-bottom') && !props.drag.saving.value,
);
watchEffect(function (cleanup) {
  const el = timelineGridRef.value;
  if (!el) return;

  syncGrid(el);

  if (typeof ResizeObserver === 'undefined') {
    return;
  }

  const observer = new ResizeObserver(function () {
    syncGrid(el);
  });

  observer.observe(el);

  cleanup(function () {
    observer.disconnect();
  });
});

function syncGrid(el: HTMLElement) {
  const rem = rootFontSize();
  const nextGrid = {
    widthRem: el.clientWidth / rem,
    heightRem: el.clientHeight / rem,
  };

  if (grid.value.widthRem === nextGrid.widthRem && grid.value.heightRem === nextGrid.heightRem) {
    return;
  }

  grid.value = nextGrid;
}

function rootFontSize() {
  if (typeof document === 'undefined') {
    return 16;
  }

  const fontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
  return fontSize || 16;
}

function startCreate(event: PointerEvent) {
  if (event.target instanceof Element && event.target.closest('.timeline-event')) return;

  props.drag.startCreate(event);
}

function eventLayoutStyle(event: LaidOutEvent): CSSProperties {
  if (!props.drag.isSourceEvent(event)) return event.layoutStyle;

  return {
    ...event.layoutStyle,
    visibility: 'hidden',
  };
}

function openEvent(calendarEvent: CalendarEvent, event: MouseEvent) {
  if (props.drag.consumeClick()) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  eventModal.open(calendarEvent);
}

// ------------ time ------------

function eventStart(event: CalendarEvent) {
  return Math.max(event.from.toSeconds(), dayStartSeconds.value);
}

function eventEnd(event: CalendarEvent) {
  return Math.min(event.to.toSeconds(), dayEndSeconds.value);
}

function byTime(a: CalendarEvent, b: CalendarEvent) {
  const startDifference = eventStart(a) - eventStart(b);
  if (startDifference !== 0) {
    return startDifference;
  }

  return eventEnd(a) - eventEnd(b);
}

function secondsToRem(seconds: number) {
  if (grid.value.heightRem <= 0) {
    return 0;
  }

  const dayProgress = (seconds - dayStartSeconds.value) / dayDurationSeconds.value;
  return dayProgress * grid.value.heightRem;
}

// ------------ title collision ------------

function titleTop(event: CalendarEvent) {
  return secondsToRem(eventStart(event));
}

function titleBottom(event: CalendarEvent) {
  return titleTop(event) + TITLE_HEIGHT_REM + TITLE_GAP_REM;
}

function splitIntoTitleGroups(events: CalendarEvent[]) {
  const groups: CalendarEvent[][] = [];

  let group: CalendarEvent[] = [];
  let groupBottom = Number.NEGATIVE_INFINITY;

  for (const event of events) {
    const top = titleTop(event);

    if (group.length > 0 && top >= groupBottom) {
      groups.push(group);
      group = [];
      groupBottom = Number.NEGATIVE_INFINITY;
    }

    group.push(event);
    groupBottom = Math.max(groupBottom, titleBottom(event));
  }

  if (group.length > 0) {
    groups.push(group);
  }

  return groups;
}

function firstFreeColumn(columnBottoms: number[], event: CalendarEvent) {
  const top = titleTop(event);

  for (let column = 0; column < columnBottoms.length; column++) {
    if (columnBottoms[column] <= top) {
      return column;
    }
  }

  return columnBottoms.length;
}

function layoutTitleGroup(group: CalendarEvent[], coverLevel: number): PlacedEvent[] {
  const columnBottoms: number[] = [];
  const placements: PlacedEvent[] = [];

  for (const event of group) {
    const column = firstFreeColumn(columnBottoms, event);

    columnBottoms[column] = titleBottom(event);
    placements.push({
      event,
      layout: {
        column,
        columns: 1,
        coverLevel,
      },
    });
  }

  const columns = Math.max(columnBottoms.length, 1);

  return placements.map(function (placement) {
    return {
      event: placement.event,
      layout: {
        ...placement.layout,
        columns,
      },
    };
  });
}

// ------------ cover stack ------------

function placedLeftColumnEnd(placedEvents: PlacedEvent[]) {
  let end = Number.NEGATIVE_INFINITY;

  for (const placedEvent of placedEvents) {
    if (placedEvent.layout.column !== 0) continue;

    end = Math.max(end, eventEnd(placedEvent.event));
  }

  return end;
}

function placeInFreeLeftColumn(group: CalendarEvent[], activeGroups: ActiveGroup[]): PlacedEvent | undefined {
  if (group.length !== 1) {
    return undefined;
  }

  const event = group[0];
  const activeGroup = activeGroups[activeGroups.length - 1];

  if (!event || !activeGroup || activeGroup.columns <= 1 || activeGroup.leftColumnEnd > eventStart(event)) {
    return undefined;
  }

  const end = eventEnd(event);

  activeGroup.leftColumnEnd = end;
  activeGroup.end = Math.max(activeGroup.end, end);

  return {
    event,
    layout: {
      column: 0,
      columns: activeGroup.columns,
      coverLevel: activeGroup.coverLevel,
    },
  };
}

function titleGroupEnd(group: CalendarEvent[]) {
  const firstEvent = group[0];
  if (!firstEvent) {
    return 0;
  }

  let end = eventEnd(firstEvent);

  for (const event of group) {
    end = Math.max(end, eventEnd(event));
  }

  return end;
}

function removeInactiveGroups(groups: ActiveGroup[], start: number) {
  for (let i = groups.length - 1; i >= 0; i--) {
    const group = groups[i];
    if (!group) continue;

    if (group.end <= start) {
      groups.splice(i, 1);
    }
  }
}

function nextCoverLevel(groups: ActiveGroup[]) {
  let coverLevel = 0;

  for (const group of groups) {
    coverLevel = Math.max(coverLevel, group.coverLevel + 1);
  }

  return coverLevel;
}

// ------------ styles ------------

function rem(value: number) {
  return `${Math.round(value * 1000) / 1000}rem`;
}

function coverLeftRem(coverLevel: number) {
  return coverLevel * COVER_STEP_REM;
}

function eventRightRem() {
  return Math.max(grid.value.widthRem * EVENT_RIGHT_RATIO, MIN_EVENT_RIGHT_REM);
}

function horizontalStyle(layout: EventLayout): CSSProperties {
  const columns = Math.max(layout.columns, 1);
  const coverLeft = coverLeftRem(layout.coverLevel);

  if (grid.value.widthRem <= 0) {
    return {
      left: rem(coverLeft),
      right: `max(${EVENT_RIGHT_RATIO * 100}%, ${rem(MIN_EVENT_RIGHT_REM)})`,
      width: 'auto',
    };
  }

  const totalGap = COLUMN_GAP_REM * (columns - 1);
  const availableWidth = Math.max(grid.value.widthRem - coverLeft - eventRightRem() - totalGap, 0);
  const columnWidth = availableWidth / columns;
  const left = coverLeft + layout.column * (columnWidth + COLUMN_GAP_REM);

  return {
    left: rem(left),
    right: 'auto',
    width: rem(columnWidth),
  };
}

// ------------ layout ------------

function layoutEvents(events: CalendarEvent[]): LaidOutEvent[] {
  const sortedEvents = [...events].sort(byTime);
  const groups = splitIntoTitleGroups(sortedEvents);

  const layouts = new Map<CalendarEvent, EventLayout>();
  const activeGroups: ActiveGroup[] = [];

  for (const group of groups) {
    const firstEvent = group[0];
    if (!firstEvent) continue;

    removeInactiveGroups(activeGroups, eventStart(firstEvent));

    const reusedEvent = placeInFreeLeftColumn(group, activeGroups);
    if (reusedEvent) {
      layouts.set(reusedEvent.event, reusedEvent.layout);
      continue;
    }

    const coverLevel = nextCoverLevel(activeGroups);
    const placedEvents = layoutTitleGroup(group, coverLevel);

    for (const placedEvent of placedEvents) {
      layouts.set(placedEvent.event, placedEvent.layout);
    }

    activeGroups.push({
      end: titleGroupEnd(group),
      coverLevel,
      columns: placedEvents[0]?.layout.columns ?? 1,
      leftColumnEnd: placedLeftColumnEnd(placedEvents),
    });
  }

  return sortedEvents.map(function (event, index) {
    const layout = layouts.get(event) ?? DEFAULT_LAYOUT;

    return {
      ...event,
      layoutStyle: {
        position: 'absolute',
        zIndex: 10 + index,
        ...horizontalStyle(layout),
      },
    };
  });
}
</script>

<template>
  <div
    class="day-timeline"
    :class="{
      'dragging-cursor': isCreating,
      'moving-cursor': isMoving,
      'resizing-cursor': isResizing,
    }"
  >
    <div class="timeline-grid" ref="timeline-grid-ref" @pointerdown="startCreate">
      <TimelineEvent
        v-if="previewEvent"
        class="drag-preview"
        :event="previewEvent"
        :start-hour="startHour"
        :end-hour="endHour"
        :date="date"
        :temporary="true"
        :interactive="false"
        :style="previewLayoutStyle"
      />

      <TimelineEvent
        v-for="event in laidOutEvents"
        :key="event.id"
        :event="event"
        :start-hour="startHour"
        :end-hour="endHour"
        :date="date"
        :style="eventLayoutStyle(event)"
        :interactive="drag.canEdit(event)"
        @move-start="drag.startMove($event, event)"
        @resize-start="(edge, pointerEvent) => drag.startResize(pointerEvent, event, edge)"
        @click="openEvent(event, $event)"
      />

      <CursorToday v-if="dateIsToday" :start-hour="startHour" :end-hour="endHour" />
    </div>
  </div>
</template>

<style scoped>
.day-timeline {
  position: relative;

  touch-action: none;
  user-select: none;
  -webkit-user-select: none;

  &:has(.today-highlight) {
    background-color: color-mix(in srgb, var(--git-color-real) 8%, transparent);
  }
}

.timeline-grid {
  position: relative;
  height: 100%;
  padding: 0 min(10%, 1rem) 0 0.25rem;

  &:has(.temporary) .timeline-event:hover {
    filter: none;
    cursor: ns-resize;
  }
}

.drag-preview {
  z-index: 600;
  pointer-events: none;
}

.dragging-cursor,
.resizing-cursor {
  cursor: ns-resize;
}

.moving-cursor {
  cursor: grabbing;
}
</style>
