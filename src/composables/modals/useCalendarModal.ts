import { ref, readonly, computed } from 'vue';

const isOpen = ref(false);
const openedCalendarName = ref('');

export function useCalendarModal() {
  return {
    isOpen: readonly(isOpen),
    openedCalendarName: readonly(openedCalendarName),
    isNew: computed(() => openedCalendarName.value === ''),

    open(name?: string) {
      openedCalendarName.value = name ?? '';
      isOpen.value = true;
    },

    close() {
      isOpen.value = false;
    },
  };
}
