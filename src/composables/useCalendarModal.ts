import type { Calendar } from '@/types/core';
import { ref, shallowRef, readonly, computed } from 'vue';

const isOpen = ref(false);
const editingCalendar = shallowRef<Calendar | undefined>(undefined);

export function useCalendarModal() {
  return {
    isOpen: readonly(isOpen),
    calendar: readonly(editingCalendar),
    isNew: computed(() => editingCalendar.value === undefined),

    open(calendar?: Calendar) {
      editingCalendar.value = calendar;
      isOpen.value = true;
    },

    close() {
      isOpen.value = false;
      editingCalendar.value = undefined;
    },
  };
}
