import { onMounted } from 'vue';
import { onKeyStroke } from '@vueuse/core';
import router from '@/router';
import { getCurrentViewDatetime, getWeekAlignedRedirect, moveView } from '@/utils';
import { DateTime } from 'luxon';
import { useEventModal } from '@/composables/modals/useEventModal';
import { useCalendarModal } from '@/composables/modals/useCalendarModal';
import { useStrategyModal } from '@/composables/modals/useStrategyModal';

const eventModal = useEventModal();

export function useKeyboard() {
  function inputNeededElsewhere(): boolean {
    return document.activeElement!.matches(
      'input:not([type="radio"]), textarea, select, [contenteditable], [role="textbox"], [role="combobox"]',
    );
  }

  // after mounted/ready cuz of router
  onMounted(() => {
    // N -> open modal for new event
    onKeyStroke('n', (e) => {
      if (inputNeededElsewhere()) return;
      e.preventDefault();
      eventModal.open();
    });

    // T -> go to today
    onKeyStroke('t', (e) => {
      if (inputNeededElsewhere()) return;
      e.preventDefault();

      router.replace(getWeekAlignedRedirect(DateTime.now()));
    });

    // 4 -> switch to 4days view
    onKeyStroke('4', (e) => {
      if (inputNeededElsewhere()) return;
      e.preventDefault();
      router.replace({ params: { view: '4days' } });
    });

    // W -> switch to week view
    onKeyStroke('w', (e) => {
      if (inputNeededElsewhere()) return;
      e.preventDefault();

      const activeDate = getCurrentViewDatetime(router.currentRoute.value.params);
      router.replace(getWeekAlignedRedirect(activeDate));
    });

    // M -> switch to month view
    onKeyStroke('m', (e) => {
      return; // TODO
      if (inputNeededElsewhere()) return;
      e.preventDefault();
      router.replace({ params: { view: 'month' } });
    });

    // < -> move view back
    onKeyStroke('ArrowLeft', (e) => {
      if (inputNeededElsewhere()) return;
      e.preventDefault();
      moveView(true, router);
    });

    // > -> move view forward
    onKeyStroke('ArrowRight', (e) => {
      if (inputNeededElsewhere()) return;
      e.preventDefault();
      moveView(false, router);
    });

    // ESC -> close modal
    onKeyStroke('Escape', (e) => {
      e.preventDefault();

      const calendarModal = useCalendarModal();
      const eventModal = useEventModal();
      const strategyModal = useStrategyModal();

      if (calendarModal.isOpen.value) {
        calendarModal.close();
      } else if (eventModal.isOpen.value && !strategyModal.isOpen.value) {
        eventModal.close();
      } else if (eventModal.isOpen.value && strategyModal.isOpen.value) {
        strategyModal.close();
      }
    });
  });
}
