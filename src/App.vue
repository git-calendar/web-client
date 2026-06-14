<script setup lang="ts">
import LoadingView from '@/views/LoadingView.vue';
import { CalendarCore, CoreLoadingState } from '@/wasm/core-wrapper';
import { onBeforeMount, ref } from 'vue';
import AlertModal from '@/components/modals/AlertModal.vue';
import { createCalendarOnce } from '@/utils';
import { syncAllWrapper } from '@/services/gitSync';
import { settings } from './services/settings';

const coreReady = ref(false); // waits for loadCalendars etc.

onBeforeMount(async () => {
  try {
    await CalendarCore.setCorsProxy(settings.value.corsProxyURL);
  } catch {
    // TODO
  }

  await createCalendarOnce();
  await CalendarCore.loadCalendars();
  syncAllWrapper();
  coreReady.value = true;
});
</script>

<template>
  <AlertModal />
  <LoadingView v-if="CoreLoadingState.percentage < 100 || !coreReady" />
  <RouterView v-else />
</template>

<style scoped>
main {
  height: 100%;
}
</style>
