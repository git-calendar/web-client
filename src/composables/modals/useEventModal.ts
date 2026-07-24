import { ref, shallowRef, readonly, computed } from 'vue';
import type { CalendarEvent } from '@/types/core';
import { DateTime } from 'luxon';

const isOpen = ref(false);
const editingEvent = shallowRef<CalendarEvent | undefined>(undefined);
const originalEditingEvent = shallowRef<CalendarEvent | undefined>(undefined);

function showEvent(event: CalendarEvent, originalEvent = event) {
  editingEvent.value = event;
  originalEditingEvent.value = originalEvent;
  isOpen.value = true;
}

function createBlankEvent(): CalendarEvent {
  return {
    title: '',
    description: '',
    location: '',
    from: DateTime.now().set({ minute: 0 }).plus({ hour: 1 }),
    to: DateTime.now().set({ minute: 0 }).plus({ hour: 3 }),
    calendar: '',
    tagId: '',
  };
}

export function useEventModal() {
  return {
    isOpen: readonly(isOpen),
    event: readonly(editingEvent),
    originalEvent: readonly(originalEditingEvent),
    isNew: computed(() => editingEvent.value && editingEvent.value.id === undefined),

    open(event = createBlankEvent()) {
      showEvent(event);
    },

    openDraft(event: CalendarEvent, originalEvent: CalendarEvent) {
      showEvent(event, originalEvent);
    },

    close() {
      isOpen.value = false;
      editingEvent.value = undefined;
      originalEditingEvent.value = undefined;
    },
  };
}
