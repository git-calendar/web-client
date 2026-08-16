<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { cachedCalendars, refreshCalendars } from '@/services/calendarCache';
import { exportICal, exportZip } from '@/utils';
import { CalendarCore } from '@/wasm/core-wrapper';
import { useAlertModal } from '@/composables/modals/useAlertModal';
import { notifyEventsChanged } from '@/composables/useEventsRefresh';

type ExportFormat = 'zip' | 'ical';

const { t } = useI18n();
const { alert, confirm } = useAlertModal();
const zipInput = useTemplateRef<HTMLInputElement>('zipInput');

const selectedCalendarName = ref('');
const exportFormat = ref<ExportFormat>('zip');
const isExporting = ref(false);
const isRestoring = ref(false);

const isBusy = computed(() => isExporting.value || isRestoring.value);
const isUrlCalendar = computed(() =>
  Boolean(cachedCalendars.value.find((calendar) => calendar.name === selectedCalendarName.value)?.icalUrl),
);

function adjustFormatForCalendar() {
  if (isUrlCalendar.value) exportFormat.value = 'ical';
}

function adjustCalendarForFormat() {
  if (exportFormat.value === 'zip' && isUrlCalendar.value) selectedCalendarName.value = '';
}

async function exportCalendar() {
  if (isBusy.value) return;

  isExporting.value = true;
  try {
    if (exportFormat.value === 'ical') {
      await exportICal(selectedCalendarName.value);
    } else {
      await exportZip(selectedCalendarName.value);
    }
  } catch (err) {
    if (!(err instanceof DOMException && err.name === 'AbortError')) {
      await alert(String(err));
    }
  } finally {
    isExporting.value = false;
  }
}

function openZipPicker() {
  zipInput.value?.click();
}

async function selectZip(event: Event) {
  const input = event.currentTarget as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;

  if (!(await confirm(t('settings.dataManagement.confirmRestore', { name: file.name })))) return;

  isRestoring.value = true;
  try {
    const data = new Uint8Array(await file.arrayBuffer());
    await CalendarCore.restoreZip(data);
    await refreshCalendars();
    selectedCalendarName.value = '';
    exportFormat.value = 'zip';
    notifyEventsChanged();
    await alert(t('settings.dataManagement.restoreSuccess'));
  } catch (err) {
    await alert(String(err));
  } finally {
    isRestoring.value = false;
  }
}
</script>

<template>
  <section class="data-management" :aria-busy="isBusy">
    <h2>{{ $t('settings.dataManagement.title') }}</h2>

    <div class="export-controls">
      <span class="control-label">{{ $t('settings.dataManagement.export') }}</span>

      <select
        v-model="selectedCalendarName"
        name="export-calendar"
        :disabled="isBusy"
        :aria-label="$t('settings.dataManagement.exportCalendar')"
        @change="adjustFormatForCalendar"
      >
        <option value="">{{ $t('settings.dataManagement.allData') }}</option>
        <option v-for="calendar in cachedCalendars" :key="calendar.name" :value="calendar.name">
          {{ calendar.name }}
        </option>
      </select>

      <select
        v-model="exportFormat"
        name="export-format"
        :disabled="isBusy"
        :aria-label="$t('settings.dataManagement.exportFormat')"
        @change="adjustCalendarForFormat"
      >
        <option value="zip">ZIP</option>
        <option value="ical">iCalendar</option>
      </select>

      <button type="button" :disabled="isBusy" @click="exportCalendar">
        {{ $t(isExporting ? 'settings.dataManagement.exporting' : 'settings.dataManagement.export') }}
      </button>
    </div>

    <div class="import-controls">
      <input
        ref="zipInput"
        class="hidden-file-input"
        type="file"
        accept=".zip,application/zip"
        tabindex="-1"
        aria-hidden="true"
        @change="selectZip"
      />
      <button type="button" :disabled="isBusy" @click="openZipPicker">
        {{ $t(isRestoring ? 'settings.dataManagement.restoring' : 'settings.dataManagement.importZip') }}
      </button>
      <small class="restore-warning">{{ $t('settings.dataManagement.restoreWarning') }}</small>
    </div>
  </section>
</template>

<style scoped>
.data-management {
  display: grid;
  width: 100%;
  min-width: 0;
  gap: 0.75rem;
  margin-top: 0.5rem;
  padding-top: 1.5rem;
  border-top: var(--grid-border);
  cursor: default;

  h2 {
    font-size: 1.1rem;
  }
}

.export-controls,
.import-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.control-label {
  cursor: text;
}

.export-controls select[name='export-calendar'] {
  min-width: 0;
  flex: 1;
}

.export-controls > button,
.import-controls > button {
  flex-shrink: 0;
  white-space: nowrap;
}

.hidden-file-input {
  display: none;
}

.restore-warning {
  min-width: 0;
  max-width: 25rem;
  color: var(--text-color);
  opacity: 0.8;
}

@media (max-width: 22rem) {
  .export-controls,
  .import-controls {
    align-items: stretch;
    flex-direction: column;
  }

  .export-controls > *,
  .import-controls > button {
    width: 100%;
  }
}
</style>
