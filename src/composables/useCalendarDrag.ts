import { computed, onScopeDispose, ref, shallowRef } from 'vue';
import { DateTime } from 'luxon';

import { useAlertModal } from '@/composables/modals/useAlertModal';
import { useEventModal } from '@/composables/modals/useEventModal';
import { getCalendar } from '@/services/calendarCache';
import { syncAllWrapper } from '@/services/gitSync';
import { settings } from '@/services/settings';
import type { CalendarEvent } from '@/types/core';
import { CalendarCore } from '@/wasm/core-wrapper';

export type CalendarDragMode = 'none' | 'create' | 'create-all-day' | 'move' | 'resize-top' | 'resize-bottom';

type ResizeEdge = 'top' | 'bottom';

const DRAG_THRESHOLD_PX = 4;
const CLICK_SUPPRESSION_MS = 350;

export function useCalendarDrag(refreshEvents: () => Promise<void>) {
  const mode = ref<CalendarDragMode>('none');
  const active = shallowRef<CalendarEvent | null>(null);
  const source = shallowRef<CalendarEvent | null>(null);
  const activeColumnDate = shallowRef<DateTime | null>(null);
  const moved = ref(false);
  const saving = ref(false);

  const eventModal = useEventModal();
  const { alert } = useAlertModal();

  let dates: DateTime[] = [];
  let startHour = 0;
  let endHour = 24;
  let timedGrid: HTMLElement | null = null;
  let allDayGrid: HTMLElement | null = null;
  let pointerId: number | null = null;
  let pointerCaptureTarget: Element | null = null;
  let pointerStartX = 0;
  let pointerStartY = 0;
  let moveGrabOffsetMinutes = 0;
  let resizeDate: DateTime | null = null;
  let createAnchor: DateTime | null = null;
  let allDayAnchorIndex = 0;
  let suppressClickUntil = 0;

  const isTimedDrag = computed(() => mode.value === 'create' || mode.value === 'move' || isResizeMode(mode.value));

  function isResizeMode(value: CalendarDragMode) {
    return value === 'resize-top' || value === 'resize-bottom';
  }

  function isActive() {
    return mode.value !== 'none' && active.value !== null;
  }

  function registerGrid(element: HTMLElement | null, nextDates: DateTime[], start: number, end: number) {
    timedGrid = element;
    dates = nextDates;
    startHour = start;
    endHour = end;
  }

  function precisionMinutes() {
    return Math.max(1, settings.value.dragPrecisionMinutes);
  }

  function totalGridMinutes() {
    return Math.max((endHour - startHour) * 60, precisionMinutes());
  }

  function snap(value: number) {
    const step = precisionMinutes();
    return Math.round(value / step) * step;
  }

  function timedRect() {
    return timedGrid?.getBoundingClientRect() ?? null;
  }

  function snapMinutes(clientY: number) {
    const rect = timedRect();
    if (!rect || rect.height <= 0) return 0;

    const relative = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    return Math.max(0, Math.min(totalGridMinutes(), snap(totalGridMinutes() * relative)));
  }

  function snapDay(clientX: number, rect = timedRect()) {
    if (!rect || rect.width <= 0 || dates.length === 0) return 0;

    const dayWidth = rect.width / dates.length;
    const index = Math.floor((clientX - rect.left) / dayWidth);
    return Math.max(0, Math.min(index, dates.length - 1));
  }

  function dateAt(dayIndex: number, minutes: number) {
    const date = dates[dayIndex] ?? dates[0] ?? DateTime.now();
    return date.startOf('day').plus({ minutes: startHour * 60 + minutes });
  }

  function gridMinutesFor(date: DateTime, columnDate = date) {
    const gridStart = columnDate.startOf('day').plus({ minutes: startHour * 60 });
    return date.diff(gridStart, 'minutes').minutes;
  }

  function blankEvent(from: DateTime, to: DateTime): CalendarEvent {
    return {
      title: '',
      description: '',
      location: '',
      from,
      to,
      calendar: '',
      tagId: '',
    };
  }

  function canEdit(event: CalendarEvent) {
    return getCalendar(event.calendar)?.readonly !== true;
  }

  function isSupportedPointer(event: PointerEvent) {
    return event.isPrimary && (event.pointerType !== 'mouse' || event.button === 0);
  }

  function startPointer(event: PointerEvent) {
    pointerId = event.pointerId;
    pointerStartX = event.clientX;
    pointerStartY = event.clientY;
    moved.value = false;

    event.preventDefault();
    if (event.currentTarget instanceof Element) {
      pointerCaptureTarget = event.currentTarget;
      pointerCaptureTarget.setPointerCapture(event.pointerId);
    }

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
    window.addEventListener('blur', onWindowBlur);
  }

  function startCreate(event: PointerEvent) {
    if (!isSupportedPointer(event) || isActive() || !timedRect() || dates.length === 0) return;

    const dayIndex = snapDay(event.clientX);
    const latestStart = Math.max(0, totalGridMinutes() - precisionMinutes());
    const from = dateAt(dayIndex, Math.min(snapMinutes(event.clientY), latestStart));

    mode.value = 'create';
    activeColumnDate.value = dates[dayIndex] ?? null;
    createAnchor = from;
    active.value = blankEvent(from, from.plus({ minutes: precisionMinutes() }));
    source.value = null;
    startPointer(event);
  }

  function startMove(event: PointerEvent, calendarEvent: CalendarEvent) {
    if (!isSupportedPointer(event) || isActive() || !timedRect() || !canEdit(calendarEvent)) return;

    mode.value = 'move';
    source.value = calendarEvent;
    active.value = { ...calendarEvent };
    activeColumnDate.value = dates[snapDay(event.clientX)] ?? calendarEvent.from.startOf('day');

    const snappedPointerMinutes = snapMinutes(event.clientY);
    const snappedStartMinutes = snap(gridMinutesFor(calendarEvent.from, activeColumnDate.value ?? calendarEvent.from));
    moveGrabOffsetMinutes = snappedPointerMinutes - snappedStartMinutes;
    startPointer(event);
  }

  function startResize(event: PointerEvent, calendarEvent: CalendarEvent, edge: ResizeEdge) {
    if (!isSupportedPointer(event) || isActive() || !timedRect() || !canEdit(calendarEvent)) return;

    mode.value = edge === 'top' ? 'resize-top' : 'resize-bottom';
    source.value = calendarEvent;
    active.value = { ...calendarEvent };
    activeColumnDate.value = dates[snapDay(event.clientX)] ?? calendarEvent.from.startOf('day');
    resizeDate = activeColumnDate.value ?? calendarEvent.from.startOf('day');
    startPointer(event);
  }

  function startCreateAllDay(event: PointerEvent, element: HTMLElement) {
    if (!isSupportedPointer(event) || isActive() || dates.length === 0) return;

    allDayGrid = element;
    const rect = element.getBoundingClientRect();
    allDayAnchorIndex = snapDay(event.clientX, rect);
    const date = dates[allDayAnchorIndex] ?? DateTime.now();

    mode.value = 'create-all-day';
    activeColumnDate.value = null;
    source.value = null;
    active.value = blankEvent(date.startOf('day'), date.endOf('day'));
    startPointer(event);
  }

  function updateMove(clientX: number, clientY: number) {
    const event = active.value;
    if (!event) return;

    const durationMinutes = Math.max(event.to.diff(event.from, 'minutes').minutes, precisionMinutes());
    const maxStart = Math.max(0, totalGridMinutes() - durationMinutes);
    const snappedMaxStart = Math.floor(maxStart / precisionMinutes()) * precisionMinutes();
    const startMinutes = Math.max(0, Math.min(snappedMaxStart, snapMinutes(clientY) - moveGrabOffsetMinutes));
    const dayIndex = snapDay(clientX);
    const from = dateAt(dayIndex, startMinutes);
    activeColumnDate.value = dates[dayIndex] ?? null;

    active.value = {
      ...event,
      from,
      to: from.plus({ minutes: durationMinutes }),
    };
  }

  function updateResize(clientY: number) {
    const event = active.value;
    const columnDate = resizeDate;
    if (!event || !columnDate) return;

    const edge = mode.value === 'resize-top' ? 'top' : 'bottom';
    const dayIndex = Math.max(
      0,
      dates.findIndex((date) => date.hasSame(columnDate, 'day')),
    );
    const candidate = dateAt(dayIndex, snapMinutes(clientY));
    const minimumDuration = { minutes: precisionMinutes() };

    if (edge === 'top') {
      active.value = {
        ...event,
        from: DateTime.min(candidate, event.to.minus(minimumDuration)),
      };
    } else {
      active.value = {
        ...event,
        to: DateTime.max(candidate, event.from.plus(minimumDuration)),
      };
    }
  }

  function updateCreate(clientY: number) {
    const anchor = createAnchor;
    if (!anchor) return;

    const columnDate = activeColumnDate.value ?? anchor.startOf('day');
    const dayIndex = Math.max(
      0,
      dates.findIndex((date) => date.hasSame(columnDate, 'day')),
    );
    const pointerDate = dateAt(dayIndex, snapMinutes(clientY));
    const from = DateTime.min(anchor, pointerDate);
    let to = DateTime.max(anchor, pointerDate);

    if (to.toMillis() === from.toMillis()) {
      to = from.plus({ minutes: precisionMinutes() });
    }

    active.value = blankEvent(from, to);
  }

  function updateCreateAllDay(clientX: number) {
    const rect = allDayGrid?.getBoundingClientRect();
    if (!rect) return;

    const pointerIndex = snapDay(clientX, rect);
    const firstIndex = Math.min(allDayAnchorIndex, pointerIndex);
    const lastIndex = Math.max(allDayAnchorIndex, pointerIndex);
    const firstDate = dates[firstIndex];
    const lastDate = dates[lastIndex];
    if (!firstDate || !lastDate) return;

    active.value = blankEvent(firstDate.startOf('day'), lastDate.endOf('day'));
  }

  function onPointerMove(event: PointerEvent) {
    if (event.pointerId !== pointerId) return;

    if (event.pointerType === 'mouse' && event.buttons === 0) {
      removePointerListeners();
      void complete();
      return;
    }

    const distance = Math.hypot(event.clientX - pointerStartX, event.clientY - pointerStartY);
    if (!moved.value && distance < DRAG_THRESHOLD_PX) return;

    moved.value = true;
    event.preventDefault();

    switch (mode.value) {
      case 'move':
        updateMove(event.clientX, event.clientY);
        break;
      case 'resize-top':
      case 'resize-bottom':
        updateResize(event.clientY);
        break;
      case 'create':
        updateCreate(event.clientY);
        break;
      case 'create-all-day':
        updateCreateAllDay(event.clientX);
        break;
    }
  }

  function removePointerListeners() {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerCancel);
    window.removeEventListener('blur', onWindowBlur);

    if (pointerId !== null && pointerCaptureTarget?.hasPointerCapture(pointerId)) {
      pointerCaptureTarget.releasePointerCapture(pointerId);
    }

    pointerCaptureTarget = null;
    pointerId = null;
  }

  function reset() {
    mode.value = 'none';
    active.value = null;
    source.value = null;
    activeColumnDate.value = null;
    moved.value = false;
    saving.value = false;
    allDayGrid = null;
    createAnchor = null;
    resizeDate = null;
  }

  async function complete() {
    const completedMode = mode.value;
    const completedEvent = active.value;
    const completedSource = source.value;
    const wasMoved = moved.value;

    if (!completedEvent) {
      reset();
      return;
    }

    if ((completedMode === 'move' || isResizeMode(completedMode)) && wasMoved) {
      suppressClickUntil = Date.now() + CLICK_SUPPRESSION_MS;
    }

    if (completedMode === 'create' || completedMode === 'create-all-day') {
      reset();
      eventModal.open(completedEvent);
      return;
    }

    if (!wasMoved || (completedMode !== 'move' && !isResizeMode(completedMode))) {
      reset();
      return;
    }

    if (completedEvent.repeat) {
      reset();
      eventModal.openDraft(completedEvent, completedSource ?? completedEvent);
      return;
    }

    saving.value = true;

    try {
      await CalendarCore.updateEvent(completedEvent);
    } catch (error) {
      reset();
      await alert(String(error));
      return;
    }

    try {
      await refreshEvents();
    } catch (error) {
      reset();
      void syncAllWrapper();
      await alert(String(error));
      return;
    }

    reset();
    void syncAllWrapper();
  }

  function onPointerUp(event: PointerEvent) {
    if (event.pointerId !== pointerId) return;
    removePointerListeners();
    void complete();
  }

  function onPointerCancel(event: PointerEvent) {
    if (event.pointerId !== pointerId) return;
    removePointerListeners();
    reset();
  }

  function onWindowBlur() {
    removePointerListeners();
    reset();
  }

  function isSourceEvent(event: CalendarEvent) {
    const original = source.value;
    if (!original || mode.value === 'none' || !moved.value) return false;

    if (original.id !== undefined && event.id !== undefined) {
      return original.id === event.id;
    }

    return original === event;
  }

  function consumeClick() {
    if (Date.now() >= suppressClickUntil) return false;

    suppressClickUntil = 0;
    return true;
  }

  onScopeDispose(removePointerListeners);

  return {
    active,
    activeColumnDate,
    mode,
    moved,
    saving,
    isTimedDrag,
    registerGrid,
    startCreate,
    startMove,
    startResize,
    startCreateAllDay,
    canEdit,
    isSourceEvent,
    consumeClick,
  };
}

export type CalendarDragController = ReturnType<typeof useCalendarDrag>;
