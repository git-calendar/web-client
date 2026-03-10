<script setup lang="ts">
import { CalendarCore } from '@/wasm/core-wrapper';
import { FiPlus } from 'vue-icons-plus/fi';
import { onMounted, ref } from 'vue';

onMounted(async () => {
  await updateData();
});

interface Calendar {
  name: string;
  checked: boolean;
}

const calendars = ref<Calendar[]>([]);

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
      <button class="create-new">
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
        hidden
      />
      <span class="custom-checkbox" />
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

.custom-checkbox {
  width: 0.9rem;
  height: 0.9rem;
  border-radius: var(--small-border-radius);
  border: 2px solid var(--text-color);
}

input:checked + .custom-checkbox {
  background-color: var(--text-color);
}
</style>
