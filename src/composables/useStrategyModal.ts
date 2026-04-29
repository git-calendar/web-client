import { ref, readonly } from 'vue';

type Action = 'update' | 'delete';

const isOpen = ref(false);
const action = ref('' as Action);

export function useStrategyModal() {
  return {
    isOpen: readonly(isOpen),

    open(ac: Action) {
      action.value = ac;
      isOpen.value = true;
    },

    close() {
      isOpen.value = false;
      action.value = '' as Action;
    },

    getAction(): Action {
      return action.value;
    },
  };
}
