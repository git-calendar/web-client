<script setup lang="ts">
import LoadingView from '@/views/LoadingView.vue';
import { useSettings } from '@/composables/useSettings.ts';
import { CalendarCore } from './core/calendar';
import { onBeforeMount, ref } from 'vue';

const { settings } = useSettings();
const coreReady = ref(false); // waits for loadCalendars etc.

onBeforeMount(async () => {
  await CalendarCore.init();
  // try {
  //   await CalendarCore.setCorsProxy(settings.value.corsProxyURL);
  // } catch {
  //   // TODO
  // }

  await CalendarCore.loadCalendars();

  // let events = await CalendarCore.getEvents(DateTime.now().minus({ days: 90 }), DateTime.now());
  // console.log(events);

  // console.log(await CalendarCore.listCalendars());



  coreReady.value = true;
});
</script>

<template>
  <LoadingView v-if="!coreReady" />
  <RouterView v-else />
</template>

<style scoped>
main {
  height: 100%;
}
</style>
