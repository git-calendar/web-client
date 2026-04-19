<script setup lang="ts">
import XDaysView from '@/components/timeline/XDaysView.vue';
import SideBar from '@/components/SideBar.vue';
import MonthSideMap from '@/components/MonthSideMap.vue';
import TopBar from '@/components/TopBar.vue';
import CalendarList from '@/components/CalendarList.vue';
import EventModal from '@/components/EventModal.vue';
import CalendarModal from '@/components/CalendarModal.vue';

import { computed, type ComputedRef, useTemplateRef } from 'vue';
import { useRoute } from 'vue-router';
import { useSettings, type CalendarView } from '@/composables/useSettings';
import { useKeyboard } from '@/composables/useKeyboard';
import { useCalendarModal } from '@/composables/useCalendarModal';
import { useEventModal } from '@/composables/useEventModal';
import { useSidebar } from '@/composables/useSidebar';
import { CALENDAR_VIEWS } from '@/constants';

useKeyboard();
const calendarModal = useCalendarModal();
const eventModal = useEventModal();
const { settings } = useSettings();
const route = useRoute();
const sidebar = useSidebar();

const activeView: ComputedRef<CalendarView> = computed(() => {
  const param = route.params.view;
  if (!param) {
    return settings.value.defaultView;
  }
  const viewParam = Array.isArray(param) ? param[0] : String(param); // convert to string

  if (CALENDAR_VIEWS.includes(viewParam as CalendarView)) {
    return viewParam as CalendarView;
  }
  return settings.value.defaultView;
});

const views = {
  '4days': [XDaysView, 4],
  week: [XDaysView, 7],
  month: [null, null],
};

const viewComponent = useTemplateRef('calendar-view');
const calendarsList = useTemplateRef('calendars-list');
function updateCallDown() {
  viewComponent.value?.updateData();
  calendarsList.value?.updateData();
}
</script>

<template>
  <div id="calendar-view">
    <SideBar :hidden="!sidebar.isOpen.value">
      <MonthSideMap />
      <CalendarList ref="calendars-list" @refresh-data="updateCallDown" />
    </SideBar>

    <TopBar />
    <component :is="views[activeView][0]" :num-of-days="views[activeView][1]" ref="calendar-view" />

    <EventModal v-if="eventModal.isOpen.value" @refresh-data="updateCallDown" />
    <CalendarModal v-if="calendarModal.isOpen.value" @refresh-data="updateCallDown" />
  </div>
  <span id="alpha">Alpha version</span>
</template>

<style scoped>
#alpha {
  position: absolute;
  bottom: 0.5rem;
  right: 0.5rem;
  padding: 0.1rem 0.3rem;

  font-size: 0.7rem;
  font-weight: bold;
  color: var(--git-color);
  border: 1px solid var(--git-color);
  border-radius: 2rem;
  z-index: 1;
  pointer-events: none;
  background-color: var(--bg-color);
}

#calendar-view:has(aside[hidden]) {
  grid-template-columns: auto;
  grid-template-areas:
    'topbar'
    'content';
}

aside[hidden] {
  position: absolute;
  height: 100%;
  left: calc(-1 * var(--sidebar-width));
  width: var(--sidebar-width);
}

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

@media (max-width: 768px) {
  aside {
    position: absolute;
    height: 100%;
    width: var(--sidebar-width);
    z-index: 600;
  }

  #calendar-view {
    grid-template-columns: auto;
    grid-template-areas:
      'topbar'
      'content';
  }
}
</style>
