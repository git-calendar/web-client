<script setup lang="ts">
import XDaysView from '@/components/timeline/XDaysView.vue';
import SideBar from '@/components/SideBar.vue';
import MonthSideMap from '@/components/MonthSideMap.vue';
import TopBar from '@/components/TopBar.vue';
import CalendarList from '@/components/CalendarList.vue';
import EventModal from '@/components/EventModal.vue';
import TestWasm from '@/components/TestWasm.vue';
import CalendarModal from '@/components/CalendarModal.vue';

import { calendarViewValues, useSettings, type CalendarView } from '@/composables/useSettings';
import { provide, ref, computed, type ComputedRef, useTemplateRef } from 'vue';
import { useRoute } from 'vue-router';
import { openCalendarModalKey, openEventModalKey } from '@/types/injectionKeys';
import type { CalendarEvent } from '@/types/core';

import { useKeyboard } from '@/composables/useKeyboard';
useKeyboard();

const { settings } = useSettings();
const route = useRoute();

const activeView: ComputedRef<CalendarView> = computed(() => {
  const param = route.params.view;
  if (!param) {
    return settings.value.defaultView;
  }
  const viewParam = Array.isArray(param) ? param[0] : String(param); // convert to string

  if (calendarViewValues.includes(viewParam as CalendarView)) {
    return viewParam as CalendarView;
  }
  return settings.value.defaultView;
});

const views = {
  week: [XDaysView, 7],
  '4days': [null, 4], //[XDaysView, 4],
  month: [null, null],
};

const viewComponent = useTemplateRef('calendar-view');
const calendarsList = useTemplateRef('calendars-list');
function updateCallDown() {
  viewComponent.value?.updateData();
  calendarsList.value?.updateData();
}

// --------- Modals/Popups ---------

const showEventModal = ref(false);
const editingEvent = ref<CalendarEvent | undefined>(undefined);
const creatingNewEvent = ref<boolean>(false);
function openEventModal(event?: CalendarEvent, newEvent?: boolean) {
  if (event) editingEvent.value = event;
  showEventModal.value = true;
  creatingNewEvent.value = newEvent!;
}
provide(openEventModalKey, openEventModal);

const showCalendarModal = ref(false);
function openCalendarModal() {
  showCalendarModal.value = true;
}
provide(openCalendarModalKey, openCalendarModal);
</script>

<template>
  <div id="calendar-view">
    <SideBar>
      <MonthSideMap />
      <CalendarList ref="calendars-list" />
      <TestWasm @refresh-data="updateCallDown" />
    </SideBar>

    <TopBar />
    <component :is="views[activeView][0]" :num-of-days="views[activeView][1]" ref="calendar-view" />

    <EventModal
      v-if="showEventModal"
      :event="editingEvent"
      :creating-new="creatingNewEvent"
      @close="showEventModal = false"
      @refresh-data="updateCallDown"
    />

    <CalendarModal v-if="showCalendarModal" @close="showCalendarModal = false" @refresh-data="updateCallDown" />
  </div>
</template>

<style scoped>
#calendar-view {
  display: grid;
  grid-template-columns: var(--sidebar-width) auto;
  grid-template-rows: var(--topbar-height) auto;
  grid-template-areas:
    'sidebar topbar'
    'sidebar content';

  height: 100%;
}

component {
  background-color: red;
}

/* mobile TODO better */
@media (max-width: 768px) {
  aside {
    display: none !important;
  }

  #calendar-view {
    grid-template-columns: auto;
    grid-template-areas:
      'topbar'
      'content';
  }
}
</style>
