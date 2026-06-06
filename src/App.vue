<script setup lang="ts">
import LoadingView from '@/views/LoadingView.vue';
import { useSettings } from '@/composables/useSettings.ts';
import { CalendarCore, CoreLoadingState } from '@/wasm/core-wrapper';
import { onBeforeMount, ref } from 'vue';
import AlertModal from '@/components/modals/AlertModal.vue';
import { createCalendarOnce } from '@/utils';

const { settings } = useSettings();
const coreReady = ref(false); // waits for loadCalendars etc.

onBeforeMount(async () => {
  try {
    await CalendarCore.setCorsProxy(settings.value.corsProxyURL);
  } catch {
    // TODO
  }

  await createCalendarOnce();
  await CalendarCore.loadCalendars();
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
