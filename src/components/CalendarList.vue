<script setup lang="ts">
import { CalendarCore } from '@/wasm/core-wrapper';
import { FiPlus, FiEdit2 } from 'vue-icons-plus/fi';
import { onMounted, ref } from 'vue';
import { useCalendarModal } from '@/composables/useCalendarModal';

const calendarModal = useCalendarModal();
const emit = defineEmits(['refresh-data']);
interface CalendarItem {
  name: string;
  checked: boolean;
}
const calendars = ref<CalendarItem[]>([]);

onMounted(async () => {
  await updateData();
});

function toggle(cal: CalendarItem) {
  cal.checked = !cal.checked;
}

function checkboxName(calName: string): string {
  return `cal-${calName.toLowerCase()}`;
}

async function updateData() {
  const calendarNames = await CalendarCore.listCalendars();

  calendars.value = [];

  if (calendarNames) {
    for (const name of calendarNames) {
      calendars.value.push({ name: name, checked: true });
    }
  }
}

defineExpose({ updateData });
</script>

<template>
  <div class="calendars">
    <div class="top-bar">
      <span class="title">{{ $t('calendarsTitle') }}:</span>
      <button class="create-new" @click="calendarModal.open()">
        <FiPlus />
      </button>
    </div>
    <div v-for="cal in calendars" :key="cal.name" class="calendar">
      <label class="cal-label">
        <input
          type="checkbox"
          :id="checkboxName(cal.name)"
          :name="checkboxName(cal.name)"
          :checked="cal.checked"
          @change="toggle(cal)"
        />
        <span class="cal-name">{{ cal.name }}</span>
      </label>
      <button @click="calendarModal.open({ name: cal.name })">
        <FiEdit2 />
      </button>
    </div>
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

.calendar {
  display: flex;
  height: 2rem;
  padding: 0.3rem;

  border-radius: var(--small-border-radius);

  &:hover {
    background-color: var(--sidebar-hover-color);
  }

  > button {
    height: 100%;
    aspect-ratio: 1/1;
    padding: 0.25rem;
    margin-left: auto;
    background-color: var(--sidebar-bg-color);

    &:hover:not(:disabled) {
      background-color: color-mix(in srgb, var(--sidebar-color), white 20%);
    }
  }
}

.cal-label {
  display: flex;
  align-items: center;
  gap: 0.7rem;

  cursor: pointer;
  user-select: none;
}

.cal-name {
  font-weight: 500;
}
</style>
