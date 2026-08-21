<script setup lang="ts">
import { reactive, watch, onMounted, useTemplateRef, ref, computed, type DeepReadonly } from 'vue';
import MultiToggle from '@/components/MultiToggle.vue';
import { CalendarCore } from '@/wasm/core-wrapper';
import { useCalendarModal } from '@/composables/modals/useCalendarModal';
import type { Calendar } from '@/types/core';
import { useAlertModal } from '@/composables/modals/useAlertModal';
import { useI18n } from 'vue-i18n';
import { syncAllWrapper } from '@/services/gitSync';
import { cachedCalendars, refreshCalendars } from '@/services/calendarCache';
import { notifyEventsChanged } from '@/composables/useEventsRefresh';
import { logError } from '@/services/errorHandling';

const { t } = useI18n();
const thisModal = useCalendarModal();
const { alert, confirm } = useAlertModal();

const originalCalendar = ref<DeepReadonly<Calendar>>();
const isSaving = ref(false);
const isDeleting = ref(false);
const isLocked = computed(() => isSaving.value || isDeleting.value);

const howOptions = ['Init', 'Clone', 'iCal'];
const iCalSourceOptions = ['URL', 'File'];
const writableCalendars = computed(() => cachedCalendars.value.filter((calendar) => !calendar.readonly));
const destinationTags = computed(
  () => writableCalendars.value.find((calendar) => calendar.name === form.destination)?.tags ?? [],
);
const form = reactive({
  how: 'Init',
  iCalSource: 'URL',
  name: '',
  remoteURL: '',
  username: '',
  password: '',
  encrypted: false,
  encryptionKey: '',
  readonly: false,
  destination: writableCalendars.value[0]?.name ?? '',
  destinationTagId: '',
  file: undefined as File | undefined,
});

const isICal = computed(() => form.how === 'iCal');
const isICalURL = computed(() => isICal.value && form.iCalSource === 'URL');
const isICalFile = computed(() => isICal.value && form.iCalSource === 'File');
const modeDescription = computed(() => {
  if (!thisModal.isNew.value || isICalFile.value) return '';
  switch (form.how) {
    case 'Init':
      return 'calendar.initDescription';
    case 'Clone':
      return 'calendar.cloneDescription';
    case 'iCal':
      return 'calendar.urlImportDescription';
  }
});
const saveButtonText = computed(() => {
  if (thisModal.isNew.value && isICal.value) {
    return t(isSaving.value ? 'importingBtn' : 'importBtn');
  }
  return t(isSaving.value ? 'savingBtn' : 'saveBtn');
});
const urlPlaceholder = computed(() => {
  if (isICal.value) return 'URL';
  return form.how === 'Init' ? `Remote URL (${t('optionalText')})` : 'Remote URL';
});

watch(
  thisModal.openedCalendarName,
  (name) => {
    resetForm();
    originalCalendar.value = cachedCalendars.value.find((calendar) => calendar.name === name);
    if (originalCalendar.value) updateFormFromCalendar(originalCalendar.value);
  },
  { immediate: true },
);

watch(
  () => form.destination,
  () => {
    form.destinationTagId = '';
  },
);

function updateFormFromCalendar(calendar: DeepReadonly<Calendar>) {
  form.name = calendar.name;
  form.encrypted = calendar.encrypted;
  form.encryptionKey = ''; // secret
  form.readonly = calendar.readonly;

  if (calendar.icalUrl) {
    form.how = 'iCal';
    form.iCalSource = 'URL';
    form.remoteURL = calendar.icalUrl;
    return;
  }

  if (calendar.remoteUrl) {
    const remoteUrl = authFromUrl(calendar.remoteUrl);
    form.remoteURL = remoteUrl.url;
    form.username = remoteUrl.username;
    form.password = remoteUrl.password;
  }
}

async function saveCalendar() {
  if (isLocked.value) return;
  if (!validate()) return;

  isSaving.value = true;

  try {
    if (thisModal.isNew.value) {
      await createCalendar();
    } else {
      await updateCalendar();
    }
    if (!isICal.value) {
      await CalendarCore.loadCalendars();
    }

    await refreshCalendars();
    notifyEventsChanged();
    thisModal.close();
  } catch (err) {
    const calendarName = affectedCalendarName();
    logError(err, calendarName);
    alert(err, calendarName);
  } finally {
    isSaving.value = false;
  }
}

function affectedCalendarName(): string | undefined {
  if (isICalFile.value) return form.destination || undefined;
  if (form.how === 'Clone') return undefined;
  return form.name || originalCalendar.value?.name;
}

async function createCalendar() {
  console.log('creating calendar', form.name, form.remoteURL);

  switch (form.how) {
    case 'Init':
      await CalendarCore.createCalendar(form.name.trim(), form.encrypted ? form.encryptionKey : '');
      if (form.remoteURL !== '') {
        await CalendarCore.updateRemote(
          form.name.trim(),
          urlWithAuth(form.remoteURL.trim(), form.username, form.password),
          form.readonly,
        );
      }
      break;

    case 'Clone':
      await CalendarCore.cloneCalendar(
        urlWithAuth(form.remoteURL.trim(), form.username, form.password),
        form.encrypted ? form.encryptionKey : '',
        form.readonly,
      );
      break;

    case 'iCal':
      if (form.iCalSource === 'URL') {
        await CalendarCore.importICalURL(form.name, form.remoteURL);
      } else {
        if (!form.file) throw new Error('No iCalendar file selected');

        await CalendarCore.importICalFile(form.destination, form.destinationTagId, await form.file.text());
        void syncAllWrapper();
      }
      break;
  }
}

async function updateCalendar() {
  const calendar = originalCalendar.value;
  if (!calendar) throw new Error('Cannot update calendar. This should not happen...');
  let calendarName = calendar.name;
  console.log('updating calendar', calendarName);

  if (calendar.name !== form.name) {
    await CalendarCore.renameCalendar(calendar.name, form.name);
    calendarName = form.name;
  }

  const rawUrl = form.remoteURL;
  if (calendar.icalUrl) {
    if (calendar.icalUrl !== rawUrl) {
      await CalendarCore.updateICalURL(calendarName, rawUrl);
    }
    return;
  }

  if (rawUrl) {
    const newRemoteUrl = urlWithAuth(rawUrl, form.username, form.password);
    if (calendar.remoteUrl !== newRemoteUrl || calendar.readonly !== form.readonly) {
      await CalendarCore.updateRemote(calendarName, newRemoteUrl, form.readonly);
      await syncAllWrapper(); // merge/pull or whatever
    }
  }
}

async function deleteCal() {
  if (isLocked.value) return;
  console.log('deleting calendar', originalCalendar.value?.name);
  if (!originalCalendar.value) throw new Error('Cannot delete calendar. This should not happen...');

  isDeleting.value = true;

  try {
    const ok = await confirm(t('message.confirmCalendarDelete'));
    if (!ok) return;

    await CalendarCore.removeCalendar(originalCalendar.value.name);
    await CalendarCore.loadCalendars();

    await refreshCalendars();
    notifyEventsChanged();
    thisModal.close();
  } catch (err) {
    const calendarName = originalCalendar.value?.name;
    logError(err, calendarName);
    alert(err, calendarName);
  } finally {
    isDeleting.value = false;
  }
}

function validate(): boolean {
  form.name = form.name.trim();
  form.remoteURL = form.remoteURL.trim();

  if (isICalFile.value) {
    if (writableCalendars.value.length === 0) {
      return validationError('message.noWritableCalendars');
    }
    if (!form.file) {
      return validationError('message.errorICalFileRequired');
    }
    if (!writableCalendars.value.some((calendar) => calendar.name === form.destination)) {
      return validationError('message.errorICalDestinationRequired');
    }
    return true;
  }

  if (form.how !== 'Clone' && !form.name) {
    return validationError('message.errorCalendarNameRequired');
  }

  if (!form.remoteURL) {
    if (form.how === 'Clone') {
      return validationError('message.errorRemoteUrlRequired');
    }
    if (isICalURL.value) {
      return validationError('message.errorICalUrlRequired');
    }
    if (thisModal.isNew.value && form.encrypted && !form.encryptionKey) {
      return validationError('message.errorEncryptionKeyRequired');
    }
    return true;
  }

  const url = parseURL(form.remoteURL);
  if (!url) {
    return validationError('message.errorInvalidUrl');
  }

  const suffix = isICalURL.value ? '.ics' : '.git';
  if (!url.pathname.toLowerCase().endsWith(suffix)) {
    return validationError(isICalURL.value ? 'message.errorICalUrlEndDotIcs' : 'message.errorRemoteUrlEndDotGit');
  }

  if (thisModal.isNew.value && form.encrypted && !form.encryptionKey) {
    return validationError('message.errorEncryptionKeyRequired');
  }

  return true;
}

function validationError(messageKey: string): false {
  void alert(t(messageKey));
  return false;
}

function parseURL(value: string): URL | undefined {
  try {
    return new URL(value);
  } catch {
    return undefined;
  }
}

function selectICalFile(event: Event) {
  form.file = (event.target as HTMLInputElement).files?.[0];
}

function resetForm() {
  form.how = howOptions[0];
  form.iCalSource = iCalSourceOptions[0];
  form.name = '';
  form.remoteURL = '';
  form.username = '';
  form.password = '';
  form.encrypted = false;
  form.encryptionKey = '';
  form.readonly = false;
  form.destination = writableCalendars.value[0]?.name ?? '';
  form.destinationTagId = '';
  form.file = undefined;
}

function urlWithAuth(repoUrl: string, username: string, password: string): string {
  if (!username && !password) return repoUrl;

  const url = new URL(repoUrl);

  if (!username) {
    // token-only style
    url.username = password;
    url.password = '';
  } else {
    url.username = username;
    url.password = password;
  }

  return url.toString();
}

function authFromUrl(repoUrl: string): {
  url: string;
  username: string;
  password: string;
} {
  const url = new URL(repoUrl);

  const rawUsername = decodeURIComponent(url.username);
  const rawPassword = decodeURIComponent(url.password);

  url.username = '';
  url.password = '';

  const isTokenOnly = rawUsername && !rawPassword;

  return {
    url: url.toString(),
    username: isTokenOnly ? '' : rawUsername,
    password: isTokenOnly ? rawUsername : rawPassword,
  };
}

const nameInputField = useTemplateRef('name-input-field');

onMounted(() => {
  nameInputField.value?.focus();
});
</script>

<template>
  <div id="calendar-modal" class="modal">
    <form @submit.prevent="saveCalendar" :aria-busy="isLocked" novalidate>
      <fieldset :disabled="isLocked">
        <MultiToggle v-if="thisModal.isNew.value" v-model="form.how" :options="howOptions" class="mode-toggle" />

        <MultiToggle
          v-if="thisModal.isNew.value && isICal"
          v-model="form.iCalSource"
          :options="iCalSourceOptions"
          :labels="['URL', $t('calendar.file')]"
          class="mode-toggle"
        />

        <p v-if="modeDescription" class="ical-import-description">{{ $t(modeDescription) }}</p>

        <input
          v-if="form.how !== 'Clone' && !isICalFile"
          v-model="form.name"
          ref="name-input-field"
          type="text"
          name="name"
          :placeholder="$t('calendar.name')"
          autocomplete="off"
          required
        />

        <input
          v-if="!isICalFile"
          v-model="form.remoteURL"
          type="url"
          name="url"
          :placeholder="urlPlaceholder"
          autocomplete="url"
          :required="form.how === 'Clone' || isICalURL"
        />

        <template v-if="!isICal">
          <div id="git-credentials">
            {{ $t('calendar.gitCredentials') }} ({{ $t('optionalText') }})
            <div class="form-row">
              <input
                v-model="form.username"
                type="text"
                name="username"
                :placeholder="$t('calendar.username')"
                autocomplete="username"
              />
              <input
                v-model="form.password"
                type="password"
                name="password"
                :placeholder="$t('calendar.password')"
                autocomplete="current-password"
              />
            </div>
          </div>

          <label v-if="form.how === 'Clone' || (!thisModal.isNew.value && form.remoteURL)">
            {{ $t('calendar.readonly') }}
            <input v-model="form.readonly" type="checkbox" name="readonly" />
          </label>

          <div v-if="thisModal.isNew.value" id="encryption">
            <!-- TODO: re-encrypt option for existing calendars -->
            <label>
              {{ $t('calendar.encrypted') }}
              <input v-model="form.encrypted" type="checkbox" name="encrypted" />
            </label>
            <input
              v-if="form.encrypted"
              v-model="form.encryptionKey"
              type="password"
              name="encryption-key"
              :placeholder="$t('calendar.encryptionKey')"
              autocomplete="current-password"
              required
            />
          </div>
        </template>

        <template v-if="isICalFile">
          <p class="ical-import-description">{{ $t('calendar.fileImportDescription') }}</p>

          <input
            class="ical-file-input"
            type="file"
            name="ical-file"
            accept=".ics,text/calendar"
            :aria-label="$t('calendar.file')"
            required
            @change="selectICalFile"
          />

          <div class="ical-destination">
            <select
              v-model="form.destination"
              name="destination-calendar"
              :aria-label="$t('calendar.destination')"
              required
            >
              <option v-for="calendar in writableCalendars" :key="calendar.name" :value="calendar.name">
                {{ calendar.name }}
              </option>
            </select>
            <select v-model="form.destinationTagId" name="destination-tag" :aria-label="$t('event.tag')">
              <option value="">{{ $t('tag.notag') }}</option>
              <option v-for="tag in destinationTags" :key="tag.id" :value="tag.id">
                {{ tag.name }}
              </option>
            </select>
          </div>

          <small v-if="writableCalendars.length === 0" class="ical-warning">
            {{ $t('message.noWritableCalendars') }}
          </small>
        </template>

        <div class="bottom-btns">
          <button type="submit" :disabled="isICalFile && writableCalendars.length === 0">
            {{ saveButtonText }}
          </button>
          <button type="button" @click="thisModal.close">{{ $t('closeBtn') }}</button>
          <button v-if="!thisModal.isNew.value" type="button" @click="deleteCal" class="delete-btn">
            {{ isDeleting ? $t('deletingBtn') : $t('deleteBtn') }}
          </button>
        </div>
      </fieldset>
    </form>
  </div>
</template>

<style scoped>
.mode-toggle {
  align-self: center;
}

.bottom-btns:has(> button:nth-child(2):last-child) {
  position: relative;
  display: block;
  align-self: stretch;
  height: 2rem;

  > button {
    position: absolute;
  }

  > button:first-child {
    right: calc(50% + 0.5rem);
  }

  > button:last-child {
    left: calc(50% + 0.5rem);
  }
}

.ical-file-input {
  padding: 0.2rem;
  cursor: pointer;

  &::file-selector-button {
    height: 1.6rem;
    margin-right: 0.6rem;
    padding: 0 0.6rem;
    border: 0;
    border-radius: var(--small-border-radius);
    background-color: var(--btn-bg-color-checked);
    color: var(--text-color-harder);
    cursor: pointer;
    font: inherit;
  }
}

.ical-destination {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;

  select {
    width: 100%;
  }
}

.ical-import-description {
  margin: 0;
  color: color-mix(in srgb, var(--text-color) 75%, transparent);
  font-size: 0.9rem;
}

.ical-warning {
  color: var(--git-color);
  font-size: 0.8rem;
}

#git-credentials,
#encryption {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
</style>
