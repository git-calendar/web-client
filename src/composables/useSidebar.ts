import { ref, readonly } from 'vue';

const storageKey = 'sidebar-open';
const stored = localStorage.getItem(storageKey);
const isOpen = ref(stored === null ? window.innerWidth >= 768 : JSON.parse(stored));

function save() {
  localStorage.setItem(storageKey, JSON.stringify(isOpen.value));
}

export function useSidebar() {
  return {
    isOpen: readonly(isOpen),

    open() {
      isOpen.value = true;
      save();
    },

    close() {
      isOpen.value = false;
      save();
    },

    toggle() {
      isOpen.value = !isOpen.value;
      save();
    },
  };
}
