import { ref, computed } from 'vue';
import type { Ref } from 'vue';
import type { CalendarEvent } from '@/types/core.ts';
import { DateTime } from 'luxon';
import { useMouse } from '@vueuse/core';
import { numberOfHours, timeRangeFormat } from '@/utils';
import { useEventModal } from '@/composables/modals/useEventModal';
import { settings } from '@/services/settings';

export function useDraggingEvent(timelineRef: Ref<HTMLElement | null>, date: Ref<DateTime>) {
  const { y } = useMouse();
  const eventModal = useEventModal();

  const drag = ref({ active: false, anchorY: 0 });
  let holdTimeout: number | null = null;

  const snapToGridHeight = computed(() => {
    if (!timelineRef.value) return 0;
    return timelineRef.value.clientHeight / numberOfHours() / (60 / settings.value.dragPrecisionMinutes);
  });

  const maxY = computed(() => timelineRef.value?.clientHeight ?? 0);

  // mouse Y relative to the top of the timeline, snapped to the grid
  const snappedMouseY = computed(() => {
    if (!timelineRef.value || snapToGridHeight.value === 0) return 0;

    let relY = y.value - timelineRef.value.getBoundingClientRect().y;
    relY = Math.max(0, Math.min(relY, maxY.value));

    return Math.round(relY / snapToGridHeight.value) * snapToGridHeight.value;
  });

  // the top of the placeholder is whichever is higher: anchor or current mouse
  const topY = computed(() => Math.min(drag.value.anchorY, snappedMouseY.value));

  // height spans from top to bottom, with a minimum of one grid slot
  const snappedHeight = computed(() => {
    const bottom = Math.max(drag.value.anchorY, snappedMouseY.value);
    return Math.max(snapToGridHeight.value, bottom - topY.value);
  });

  const placeholderTop = computed(() => `${topY.value}px`);
  const placeholderHeight = computed(() => `${snappedHeight.value}px`);

  const placeholderSubtitle = computed(() => {
    const [startTime, endTime] = getEventTimes();
    return timeRangeFormat(startTime, endTime);
  });

  function getEventTimes(): [DateTime, DateTime] {
    if (!timelineRef.value || snapToGridHeight.value === 0) return [date.value, date.value];

    // number of 30min slots from top
    const startSlots = Math.round(topY.value / snapToGridHeight.value);
    const durationSlots = Math.round(snappedHeight.value / snapToGridHeight.value);

    const startTotalMinutes = startSlots * settings.value.dragPrecisionMinutes;
    const endTotalMinutes = (startSlots + durationSlots) * settings.value.dragPrecisionMinutes;

    const startTime = date.value
      .set({ hour: settings.value.dayViewStartHour, minute: 0 })
      .plus({ minutes: startTotalMinutes });

    const endTime = date.value
      .set({ hour: settings.value.dayViewStartHour, minute: 0 })
      .plus({ minutes: endTotalMinutes });

    return [startTime, endTime];
  }

  function startDragging(_: PointerEvent) {
    drag.value.active = true;

    // snap the anchor to the grid on press
    const relY = Math.max(0, y.value - timelineRef.value!.getBoundingClientRect().y);
    drag.value.anchorY = Math.floor(relY / snapToGridHeight.value) * snapToGridHeight.value;

    window.addEventListener('pointerup', dragStop); // listen for stop
  }

  function cancelHold() {
    if (holdTimeout) {
      clearTimeout(holdTimeout);
      holdTimeout = null;
    }
    window.removeEventListener('pointerup', cancelHold);
    window.removeEventListener('pointermove', cancelHold);
  }

  function dragStart(e: PointerEvent) {
    if (drag.value.active) return; // already dragging

    const targetClasses = (e.target as Element).classList;
    const isValidTarget =
      targetClasses.contains('timeline-group') ||
      targetClasses.contains('timeline-grid') ||
      targetClasses.contains('day-timeline');

    if (!isValidTarget) return;

    if (e.pointerType === 'touch') {
      e.preventDefault();
      holdTimeout = window.setTimeout(() => startDragging(e), 400);
      window.addEventListener('pointerup', cancelHold);
      window.addEventListener('pointermove', cancelHold);
    } else {
      startDragging(e); // mouse = immediate
    }
  }

  function dragStop(_: PointerEvent) {
    if (!drag.value.active) return; // not dragging

    drag.value.active = false;

    const [startTime, endTime] = getEventTimes();
    const event: CalendarEvent = {
      title: '',
      description: '',
      location: '',
      from: startTime,
      to: endTime,
      calendar: 'default',
      tag: '',
    };
    eventModal.open(event);

    window.removeEventListener('pointerup', dragStop); // cleanup
  }

  return {
    drag,
    placeholderTop,
    placeholderHeight,
    placeholderSubtitle,
    dragStart,
  };
}
