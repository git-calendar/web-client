import { createSharedComposable, useEventListener, useNow } from '@vueuse/core';
import { DateTime } from 'luxon';
import { computed } from 'vue';

export const useCurrentTime = createSharedComposable(() => {
  const now = useNow({ interval: 1_000 });
  const refresh = () => (now.value = new Date());

  useEventListener(window, 'focus', refresh);
  useEventListener(document, 'visibilitychange', refresh);

  return computed(() => DateTime.fromJSDate(now.value));
});
