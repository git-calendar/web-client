<script setup lang="ts">
import { CalendarCore } from '@/wasm/core-wrapper';
import { FiPlus, FiEdit2 } from 'vue-icons-plus/fi';
import { ref, watch } from 'vue';
import { useCalendarModal } from '@/composables/modals/useCalendarModal';
import type { Calendar } from '@/types/core';
import { eventsRevision } from '@/composables/useEventsRefresh';

const calendarModal = useCalendarModal();
const calendars = ref<Calendar[]>([]);
const hidden = ref(new Map<string, boolean>());

function getCalId(calName: string): string {
  return `cal_${calName}`;
}

function getTagId(calName: string, tagName: string): string {
  return `tag_${calName}_${tagName}`;
}

function toggleVisibility(id: string) {
  hidden.value.set(id, !(hidden.value.get(id) ?? false));
}

function isVisible(id: string): boolean {
  return !(hidden.value.get(id) ?? false);
}

async function updateData() {
  calendars.value = await CalendarCore.listCalendars();
}

watch(
  eventsRevision,
  () => {
    void updateData();
  },
  { immediate: true },
);
</script>

<template>
  <div class="calendars">
    <div class="top-bar">
      <span class="title">{{ $t('calendarsTitle') }}:</span>
      <button class="create-new" @click="calendarModal.open()">
        <FiPlus />
      </button>
    </div>

    <div v-for="cal in calendars" :key="cal.name" class="calendar-wrapper">
      <div class="calendar-header">
        <label class="cal-label">
          <input
            type="checkbox"
            :id="getCalId(cal.name)"
            :name="getCalId(cal.name)"
            :checked="isVisible(getCalId(cal.name))"
            @change="toggleVisibility(getCalId(cal.name))"
          />
          <span class="cal-name">{{ cal.name }}</span>
        </label>

        <button class="edit-btn" @click="calendarModal.open(cal.name)">
          <FiEdit2 />
        </button>
      </div>

      <div v-if="cal.tags && cal.tags.length" class="tags-list">
        <label v-for="tag in cal.tags" :key="tag.name" class="tag-label">
          <input
            type="checkbox"
            :id="getTagId(cal.name, tag.name)"
            :name="getTagId(cal.name, tag.name)"
            :checked="isVisible(getTagId(cal.name, tag.name))"
            @change="toggleVisibility(getTagId(cal.name, tag.name))"
            :style="{ '--tag-color': tag.color }"
          />
          <span class="tag-name">{{ tag.name }}</span>
        </label>
      </div>
    </div>
  </div>
</template>

<style scoped>
.calendars {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.top-bar {
  display: flex;
  align-items: center;
  padding-left: 0.4rem;
  justify-content: space-between;

  .title {
    font-weight: bold;
  }

  .create-new {
    width: 1.8rem;
    height: 1.8rem;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.25rem;
    background-color: transparent;

    &:hover {
      background-color: var(--sidebar-hover-color);
    }
  }
}

.calendar-wrapper {
  display: flex;
  flex-direction: column;
}

.calendar-header {
  display: flex;
  align-items: center;
  height: 2rem;
  border-radius: var(--small-border-radius);

  &:hover {
    background-color: var(--sidebar-hover-color);

    /* reveal the edit button on row hover */
    .edit-btn {
      opacity: 1;
      pointer-events: auto;
    }
  }
}

.edit-btn {
  height: calc(100% - 2 * 0.25rem);
  aspect-ratio: 1/1;
  padding: 0.25rem;
  margin: 0.25rem;
  background-color: transparent;
  border-radius: var(--small-border-radius);
  cursor: pointer;

  /* hidden by default until hovered */
  opacity: 0;
  pointer-events: none;

  &:hover:not(:disabled) {
    background-color: color-mix(in srgb, var(--sidebar-color), white 20%);
  }
}

.cal-label {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  cursor: pointer;
  user-select: none;
  flex-grow: 1;
  padding: 0.3rem;
}

.cal-name {
  font-weight: 500;
}

/* Enhanced child indentation */
.tags-list {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  padding-left: 1.8rem;
  margin-top: 0.1rem;
}

.tag-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.4rem;
  border-radius: var(--small-border-radius);
  cursor: pointer;
  user-select: none;

  &:hover {
    background-color: var(--sidebar-hover-color);
  }

  input[type='checkbox']:checked::before {
    background-color: var(--tag-color);
  }
}

.tag-name {
  font-size: 0.9em;
  opacity: 0.85;
}
</style>
