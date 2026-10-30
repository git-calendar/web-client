<script setup lang="ts">
import { FiPlusCircle } from 'vue-icons-plus/fi';
import { useEventModal } from '@/composables/modals/useEventModal';

const eventModal = useEventModal();
</script>

<template>
  <button
    class="new-event-btn"
    :title="$t('actions.newEvent')"
    :aria-label="$t('actions.newEvent')"
    @click="eventModal.open()"
  >
    <FiPlusCircle />
    <span>{{ $t('newEventBtn') }}</span>
  </button>
</template>

<style scoped>
.new-event-btn {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  justify-content: flex-start;
  white-space: nowrap;
  container-type: inline-size; /* the label shows only when the button is wide enough for it (content box, so without padding) */

  > svg {
    width: 1.2rem;
    flex-shrink: 0;
  }
}

@container (width < 7.4rem) {
  .new-event-btn > span {
    display: none;
  }
}
</style>
