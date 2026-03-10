<script setup lang="ts">
import { CalendarCore } from '@/wasm/core-wrapper';
import { FiPlus } from 'vue-icons-plus/fi';
import { onMounted, ref, inject } from 'vue';
import { openCalendarModalKey } from '@/types/injectionKeys';

interface Calendar {
  name: string;
  checked: boolean;
}

const calendars = ref<Calendar[]>([]);

const openCalendarModal = inject(openCalendarModalKey);

onMounted(async () => {
  await updateData();
});

function toggle(cal: Calendar) {
  cal.checked = !cal.checked;
}

function checkboxName(calName: string): string {
  return `cal-${calName.toLowerCase()}`;
}

async function updateData() {
  let calendarNames = await CalendarCore.listCalendars();

  calendars.value = [];
  for (const name of calendarNames) {
    calendars.value.push({ name: name, checked: true });
  }
}
defineExpose({ updateData });
</script>

<template>
  <div class="calendars">
    <div class="top-bar">
      <span class="title">{{ $t('calendarsTitle') }}:</span>
      <button class="create-new" @click="openCalendarModal">
        <FiPlus />
      </button>
    </div>
    <label v-for="cal in calendars" :key="cal.name" class="cal-label">
      <input
        type="checkbox"
        :id="checkboxName(cal.name)"
        :name="checkboxName(cal.name)"
        :checked="cal.checked"
        @change="toggle(cal)"
      />
      <span class="cal-name">{{ cal.name }}</span>
    </label>
  </div>
</template>

<style scoped>
.calendars {
  width: 100%;

  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.top-bar {
  display: flex;
  align-items: center;
  justify-content: center;

  position: relative;

  .title {
    justify-self: center;
    font-weight: bold;
  }

  .create-new {
    position: absolute;
    right: 0;
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

.cal-label {
  display: flex;
  align-items: center;
  gap: 0.7rem;

  padding: 0.3rem 0.5rem;
  border-radius: var(--small-border-radius);

  cursor: pointer;
  user-select: none;

  &:hover {
    background-color: var(--sidebar-hover-color);
  }
}

.cal-name {
  font-weight: 500;
}
</style>
