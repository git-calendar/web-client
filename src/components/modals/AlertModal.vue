<script setup lang="ts">
import { useAlertModal } from '@/composables/modals/useAlertModal';

const { alertModalState, close } = useAlertModal();
</script>

<template>
  <div v-if="alertModalState.isOpen" id="alert-modal" class="modal">
    <form @submit.prevent="close(true)">
      <p>{{ alertModalState.message }}</p>

      <div class="bottom-btns">
        <template v-if="alertModalState.type === 'alert'">
          <button type="submit">{{ alertModalState.confirmText }}</button>
        </template>

        <template v-if="alertModalState.type === 'confirm'">
          <button type="submit">{{ alertModalState.confirmText }}</button>
          <button type="button" @click="close(false)">{{ alertModalState.cancelText }}</button>
        </template>
      </div>
    </form>
  </div>
</template>

<style scoped>
#alert-modal {
  z-index: 1001;

  > form {
    max-width: 30rem;
    min-width: 20rem;
    width: auto;
  }
}
</style>
