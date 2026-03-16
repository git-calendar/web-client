<script setup lang="ts">
import { ref, computed, useTemplateRef, inject } from 'vue';
import type { CalendarEvent } from '@/types/core.ts';
import { DateTime } from 'luxon';
import TimelineEvent from '@/components/timeline/TimelineEvent.vue';
import { useMouse } from '@vueuse/core';
import BaseEvent from '@/components/timeline/BaseEvent.vue';
import { numberOfHours, timeRangeFormat } from '@/utils';
import { useSettings } from '@/composables/useSettings';
import { openEventModalKey } from '@/types/injectionKeys';
import CursorToday from './CursorToday.vue';

// TODO
// - mobile press-hold-drag
// - multi day event create with horizontal drag

const { y } = useMouse(); // const { x, y, sourceType } = useMouse();
const { settings } = useSettings();

interface Props {
  date: DateTime;
  events: CalendarEvent[];
}
const props = defineProps<Props>();

const editEventModal = inject(openEventModalKey);
function onEventClick(event: CalendarEvent) {
  editEventModal?.(event);
}

const dateIsToday = computed(() => {
  const today = DateTime.now();
  return props.date.day === today.day && props.date.month === today.month && props.date.year === today.year;
});

// expects events to be sorted by "from" beforehand in Wasm
const nonoverlappingGroups = computed(() => {
  if (!props.events || props.events.length === 0) return [];

  // each inner array is a lane/timeline
  const lanes: CalendarEvent[][] = [];

  for (const event of props.events) {
    let placed = false;

    // try to find an existing lane where this event fits
    for (const lane of lanes) {
      const lastEventInLane = lane[lane.length - 1]!;

      // if the event starts after (or when) the last event in this lane ends
      if (event.from.toSeconds() >= lastEventInLane.to.toSeconds()) {
        lane.push(event);
        placed = true;
        break;
      }
    }

    // if it overlapped with the end of every existing lane, create a new lane
    if (!placed) {
      lanes.push([event]);
    }
  }

  return lanes;
});

// ------------ dragging ------------

const timelineRef = useTemplateRef('timeline-ref');
const drag = ref({ active: false, startY: 0 });

const snapToGridHeight = computed(() => {
  if (!timelineRef.value) return 0;
  return timelineRef.value.clientHeight / numberOfHours() / 2; // 30 min grid
});

const snappedHeight = computed(() => {
  if (!timelineRef.value) return 0;
  let rawHeight = y.value - timelineRef.value.getBoundingClientRect().y - drag.value.startY;
  rawHeight = Math.max(snapToGridHeight.value, rawHeight);
  return Math.round(rawHeight / snapToGridHeight.value) * snapToGridHeight.value;
});
const placeholderHeight = computed(() => `${snappedHeight.value}px`);

const placeholderSubtitle = computed(() => {
  const [startTime, endTime] = getEventTimes();
  return timeRangeFormat(startTime, endTime);
});

function getEventTimes(): [DateTime, DateTime] {
  if (!timelineRef.value) return [props.date, props.date];

  // number of 30min slots from top
  const startSlots = Math.round(drag.value.startY / snapToGridHeight.value);
  const durationSlots = Math.round(snappedHeight.value / snapToGridHeight.value);

  const endSlots = startSlots + durationSlots;

  const startTotalMinutes = startSlots * 30;
  const endTotalMinutes = endSlots * 30;

  const startTime = props.date
    .set({
      hour: settings.value.dayViewStartHour,
      minute: 0,
    })
    .plus({ minutes: startTotalMinutes });

  const endTime = props.date
    .set({
      hour: settings.value.dayViewStartHour,
      minute: 0,
    })
    .plus({ minutes: endTotalMinutes });

  return [startTime, endTime];
}

function dragStart(e: PointerEvent) {
  if (drag.value.active) return; // already dragging

  const targetClasses = (e.target as Element).classList;
  if (
    !(
      targetClasses.contains('timeline-group') ||
      targetClasses.contains('timeline-grid') ||
      targetClasses.contains('day-timeline')
    )
  )
    return; // clicked on existing event

  drag.value.active = true;
  const snapToGridHeight = timelineRef.value?.clientHeight! / numberOfHours() / 2;

  let startY = y.value - timelineRef.value!.getBoundingClientRect().y;
  startY = Math.max(0, startY);
  startY = Math.floor(startY / snapToGridHeight) * snapToGridHeight;

  drag.value.startY = startY;

  window.addEventListener('pointerup', dragStop); // listen for stop
}

function dragStop(_: MouseEvent) {
  if (!drag.value.active) return; // not dragging

  drag.value.active = false;

  const [startTime, endTime] = getEventTimes();
  const event: CalendarEvent = { title: '', from: startTime, to: endTime, calendar: 'main', tag: '' };
  editEventModal?.(event);

  window.removeEventListener('pointerup', dragStop); // cleanup
}
</script>

<template>
  <div class="day-timeline" :class="{ 'dragging-cursor': drag.active }" @pointerdown="dragStart" ref="timeline-ref">
    <div class="timeline-grid">
      <!-- placeholder event for dragging -->
      <BaseEvent
        v-show="drag.active"
        :top-style="`${drag.startY}px`"
        :height-style="placeholderHeight"
        :title="$t('event.new')"
        :subtitle="placeholderSubtitle"
      />

      <!-- real events -->
      <div class="timeline-group" v-for="(g, i) in nonoverlappingGroups" :key="i">
        <TimelineEvent v-for="e in g" :key="e.id" :event="e" @click="onEventClick(e)" />
      </div>

      <CursorToday v-if="dateIsToday" />
    </div>
  </div>
</template>

<style scoped>
.day-timeline {
  border-left: var(--grid-border);
  position: relative;
}

.timeline-grid {
  position: relative;
  display: grid;
  grid-auto-flow: column;
  gap: 0.5rem;
  height: 100%;
  padding: 0 min(10%, 1rem) 0 5px;
}

.timeline-group {
  position: relative;
}

.dragging-cursor {
  cursor: ns-resize;
}
</style>
