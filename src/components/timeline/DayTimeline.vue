<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import type { CalendarEvent } from '@/types/core.ts';
import { DateTime } from 'luxon';
import TimelineEvent from '@/components/timeline/TimelineEvent.vue';
import BaseEvent from '@/components/timeline/BaseEvent.vue';
import { useEventModal } from '@/composables/modals/useEventModal';
import CursorToday from '@/components/timeline/CursorToday.vue';
import { useDraggingEvent } from '@/composables/useDraggingEvent';

interface Props {
  date: DateTime;
  events: CalendarEvent[];
}
const props = defineProps<Props>();

const eventModal = useEventModal();

function onEventClick(event: CalendarEvent) {
  eventModal.open(event);
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
    if (!placed) lanes.push([event]);
  }

  return lanes;
});

// ------------ dragging ------------

const timelineRef = useTemplateRef<HTMLElement>('timeline-ref');
const dateRef = computed(() => props.date);

const { drag, placeholderTop, placeholderHeight, placeholderSubtitle, dragStart } = useDraggingEvent(
  timelineRef,
  dateRef,
);
</script>

<template>
  <div class="day-timeline" :class="{ 'dragging-cursor': drag.active }" @pointerdown="dragStart" ref="timeline-ref">
    <div class="timeline-grid">
      <!-- placeholder event for dragging -->
      <BaseEvent
        v-if="drag.active"
        :top-style="placeholderTop"
        :height-style="placeholderHeight"
        :title="$t('event.new')"
        :subtitle="placeholderSubtitle"
        :temporary="true"
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
  position: relative;

  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

.timeline-grid {
  position: relative;
  display: grid;
  grid-auto-flow: column;
  height: 100%;
  padding: 0 min(10%, 1rem) 0 4px;

  &:has(.temporary) .timeline-event:hover {
    filter: none;
    cursor: ns-resize;
  }
}

.timeline-group {
  position: relative;
}

.dragging-cursor {
  cursor: ns-resize;
}
</style>
