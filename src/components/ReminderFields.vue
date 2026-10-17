<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { FiPlus } from 'vue-icons-plus/fi';
import type { Reminder } from '@/types/core';
import { requestNotificationPermission } from '@/composables/useEventNotifications';

const { t } = useI18n();
const reminders = defineModel<Reminder[]>({ required: true });
const offsets = [15, 0, 5, 10, 30, 60, 1440];
const sortedOffsets = [...offsets].sort((a, b) => a - b);
const nextOffset = computed(() => offsets.find((offset) => !reminders.value.some((r) => r.minutesBefore === offset)));

function reminderLabel(minutes: number): string {
  if (minutes === 0) return t('event.reminders.atStart');
  if (minutes % 1440 === 0) return t('event.reminders.daysBefore', { count: minutes / 1440 });
  if (minutes % 60 === 0) return t('event.reminders.hoursBefore', { count: minutes / 60 });
  return t('event.reminders.minutesBefore', { count: minutes });
}

function addReminder() {
  if (nextOffset.value === undefined) return;
  void requestNotificationPermission();
  reminders.value = [...reminders.value, { minutesBefore: nextOffset.value }];
}

function updateReminder(index: number, value: string) {
  reminders.value = reminders.value.map((reminder, i) => (i === index ? { minutesBefore: Number(value) } : reminder));
}
</script>

<template>
  <div class="reminders">
    <div class="reminders-header">
      <span>{{ $t('event.reminders.title') }}</span>
      <button
        v-if="nextOffset !== undefined"
        type="button"
        class="add-reminder"
        :title="$t('event.reminders.add')"
        :aria-label="$t('event.reminders.add')"
        @click="addReminder"
      >
        <FiPlus aria-hidden="true" />
      </button>
    </div>
    <div v-for="(reminder, index) in reminders" :key="index" class="reminder-row">
      <select
        :aria-label="$t('event.reminders.title')"
        :value="reminder.minutesBefore"
        @change="updateReminder(index, ($event.target as HTMLSelectElement).value)"
      >
        <option v-if="!offsets.includes(reminder.minutesBefore)" :value="reminder.minutesBefore">
          {{ reminderLabel(reminder.minutesBefore) }}
        </option>
        <option
          v-for="offset in sortedOffsets"
          :key="offset"
          :value="offset"
          :disabled="reminders.some((other, i) => i !== index && other.minutesBefore === offset)"
        >
          {{ reminderLabel(offset) }}
        </option>
      </select>
      <button type="button" @click="reminders = reminders.filter((_, i) => i !== index)">
        {{ $t('event.reminders.remove') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.reminders {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: flex-start;
}

.reminders-header {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.add-reminder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.8rem;
  height: 1.8rem;
  padding: 0.25rem;
  background-color: transparent;

  &:hover:not(:disabled) {
    background-color: var(--sidebar-hover-color);
  }
}

.reminder-row {
  display: flex;
  gap: 0.5rem;
  width: 100%;

  select {
    flex: 1;
    min-width: 0;
  }
}
</style>
