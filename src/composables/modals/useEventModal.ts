import { ref, shallowRef, readonly, computed } from 'vue';
import type { CalendarEvent } from '@/types/core';
import { DateTime } from 'luxon';

const isOpen = ref(false);
const editingEvent = shallowRef<CalendarEvent | undefined>(undefined);

export function useEventModal() {
  return {
    isOpen: readonly(isOpen),
    event: readonly(editingEvent),
    isNew: computed(() => editingEvent.value && editingEvent.value.id === undefined),

    open(event?: CalendarEvent) {
      if (event) {
        editingEvent.value = event;
      } else {
        editingEvent.value = {
          title: '',
          description: '',
          location: '',
          from: DateTime.now(),
          to: DateTime.now().plus({ hour: 2 }),
          calendar: '',
          tagId: '',
        };
      }

      isOpen.value = true;
    },

    close() {
      isOpen.value = false;
      editingEvent.value = undefined;
    },
  };
}
