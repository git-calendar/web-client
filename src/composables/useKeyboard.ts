import { onMounted } from 'vue';
import { onKeyStroke } from '@vueuse/core';
import router from '@/router';
import { getCurrentViewDatetime, getWeekAlignedRedirect, moveView } from '@/utils';
import { DateTime } from 'luxon';
import { useEventModal } from '@/composables/modals/useEventModal';
import { useCalendarModal } from '@/composables/modals/useCalendarModal';
import { useStrategyModal } from '@/composables/modals/useStrategyModal';
import { useTagModal } from '@/composables/modals/useTagModal';
import { useSidebar } from '@/composables/useSidebar';

const calendarModal = useCalendarModal();
const tagModal = useTagModal();
const eventModal = useEventModal();
const strategyModal = useStrategyModal();
const sidebar = useSidebar();

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
      if (!tagModal.isOpen.value && !calendarModal.isOpen.value) eventModal.open();
    });

    // S -> toggle sidebar
    onKeyStroke('s', (e) => {
      if (inputNeededElsewhere()) return;
      e.preventDefault();
      sidebar.toggle();
    });

    // T -> go to today
    onKeyStroke('t', (e) => {
      if (inputNeededElsewhere()) return;
      e.preventDefault();

      router.replace(getWeekAlignedRedirect(DateTime.now()));
    });

    // 4 -> switch to 4-day view
    onKeyStroke('4', (e) => {
      if (inputNeededElsewhere()) return;
      e.preventDefault();
      router.replace({
        params: { ...router.currentRoute.value.params, view: '4d' },
      });
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

      const activeDate = getCurrentViewDatetime(router.currentRoute.value.params);
      router.replace({
        name: 'calendar',
        params: { view: 'm', year: activeDate.year, month: activeDate.month, day: activeDate.day },
      });
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

      if (calendarModal.isOpen.value) {
        calendarModal.close();
      } else if (tagModal.isOpen.value) {
        tagModal.close();
      } else if (eventModal.isOpen.value && !strategyModal.isOpen.value) {
        eventModal.close();
      } else if (eventModal.isOpen.value && strategyModal.isOpen.value) {
        strategyModal.close();
      }
    });
  });
}
