<script setup lang="ts">
import { FiPlusCircle } from 'vue-icons-plus/fi';
import { useEventModal } from '@/composables/modals/useEventModal';

const eventModal = useEventModal();

defineProps<{ large?: boolean }>();
</script>

<template>
  <button
    class="new-event-btn"
    :class="{ large }"
    :title="$t('actions.newEvent')"
    :aria-label="$t('actions.newEvent')"
    @click="eventModal.open()"
  >
    <FiPlusCircle />
    <span v-if="large">{{ $t('newEventBtn') }}</span>
  </button>
</template>

<style scoped>
.new-event-btn {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  justify-content: flex-start;

  > svg {
    width: 1.2rem;
  }
}
</style>
