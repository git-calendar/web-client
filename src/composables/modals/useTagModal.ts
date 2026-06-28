import { ref, shallowRef, readonly, computed } from 'vue';
import type { Tag } from '@/types/core';

const isOpen = ref(false);
const editingTag = shallowRef<Tag | undefined>(undefined);
const editingTagCalendarName = shallowRef<string | undefined>(undefined); // ughhh idk this feels stupid

export function useTagModal() {
  return {
    isOpen: readonly(isOpen),
    tag: readonly(editingTag),
    calendarName: readonly(editingTagCalendarName),
    isNew: computed(() => editingTag.value && editingTag.value.id === undefined),

    open(calendar: string, tag?: Tag) {
      if (tag) {
        editingTag.value = tag;
        editingTagCalendarName.value = calendar;
      } else {
        editingTag.value = {
          name: '',
          color: 'blue',
        };
        editingTagCalendarName.value = calendar;
      }

      isOpen.value = true;
    },

    close() {
      isOpen.value = false;
      editingTag.value = undefined;
      editingTagCalendarName.value = undefined;
    },
  };
}
