<script setup lang="ts">
import { CalendarCore } from '@/wasm/core-wrapper';
import { FiPlus, FiEdit2 } from 'vue-icons-plus/fi';
import { ref, watch } from 'vue';
import { useCalendarModal } from '@/composables/modals/useCalendarModal';
import type { Calendar } from '@/types/core';
import { eventsRevision } from '@/composables/useEventsRefresh';
import { useTagModal } from '@/composables/modals/useTagModal';
import { getTagColorHex } from '@/services/calendarCache';

const calendarModal = useCalendarModal();
const tagModal = useTagModal();
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
      <div class="calendar">
        <label>
          <input
            type="checkbox"
            :id="getCalId(cal.name)"
            :name="getCalId(cal.name)"
            :checked="isVisible(getCalId(cal.name))"
            @change="toggleVisibility(getCalId(cal.name))"
          />
          <span class="name">{{ cal.name }}</span>
        </label>

        <button class="edit-btn" @click="calendarModal.open(cal.name)">
          <FiEdit2 />
        </button>
      </div>

      <div v-if="cal.tags && cal.tags.length" class="tags-list">
        <div class="tag" v-for="tag in cal.tags" :key="tag.name">
          <label>
            <input
              type="checkbox"
              :id="getTagId(cal.name, tag.name)"
              :name="getTagId(cal.name, tag.name)"
              :checked="isVisible(getTagId(cal.name, tag.name))"
              @change="toggleVisibility(getTagId(cal.name, tag.name))"
              :style="{ '--tag-color': getTagColorHex(cal.name, tag.id!) }"
            />
            <span class="tag-name">{{ tag.name }}</span>
          </label>

          <button class="edit-btn" @click="tagModal.open(cal.name, tag)">
            <FiEdit2 />
          </button>
        </div>
        <div class="tag new" @click="tagModal.open(cal.name)">
          <FiPlus />
        </div>
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
  gap: 0.1rem;

  .calendar {
    height: 2rem;
    padding-right: 0.25rem;

    label {
      display: flex;
      align-items: center;
      gap: 0.7rem;
      cursor: pointer;
      user-select: none;
      flex-grow: 1;
      padding: 0.3rem;
    }

    .name {
      font-weight: 500;
    }
  }
}

.calendar,
.tag {
  display: flex;
  align-items: center;
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
  height: 76%;
  aspect-ratio: 1/1;
  padding: 0.25rem;
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

.tags-list {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  padding-left: 1.8rem;

  .tag {
    padding-right: 0.25rem;
    height: 1.7rem;

    label,
    &.new {
      display: flex;
      padding: 0.25rem 0.4rem;
      align-items: center;
      gap: 0.5rem;
      border-radius: var(--small-border-radius);
      cursor: pointer;
      user-select: none;
      flex-grow: 1;

      input[type='checkbox']:checked::before {
        background-color: var(--tag-color);
      }
    }

    .name {
      font-size: 0.9em;
      opacity: 0.85;
    }

    .edit-btn {
      padding: 0.15rem;
    }
  }
}

.tag.new {
  width: max-content;

  svg {
    transform: scale(1.3);
    width: 1rem;
    height: 1rem;
  }
}
</style>
