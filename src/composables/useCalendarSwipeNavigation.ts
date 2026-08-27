import type { MaybeRefOrGetter } from 'vue';
import { useSwipe, type UseSwipeDirection } from '@vueuse/core';
import { useRouter } from 'vue-router';

import { moveView } from '@/utils';

const SWIPE_THRESHOLD_PX = 50;

function isHorizontalSwipe(direction: UseSwipeDirection): direction is 'left' | 'right' {
  return direction === 'left' || direction === 'right';
}

export function useCalendarSwipeNavigation(target: MaybeRefOrGetter<EventTarget | null | undefined>) {
  const router = useRouter();

  useSwipe(target, {
    threshold: SWIPE_THRESHOLD_PX,
    passive: false,
    onSwipeEnd: (_event, direction) => {
      if (!isHorizontalSwipe(direction)) return;

      moveView(direction === 'right', router);
    },
  });
}
