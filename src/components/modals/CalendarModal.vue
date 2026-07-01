<script setup lang="ts">
import { reactive, watch, onMounted, useTemplateRef, ref, computed } from 'vue';
import MultiToggle from '@/components/MultiToggle.vue';
import { CalendarCore } from '@/wasm/core-wrapper';
import { useCalendarModal } from '@/composables/modals/useCalendarModal';
import type { Calendar } from '@/types/core';
import { useAlertModal } from '@/composables/modals/useAlertModal';
import { useI18n } from 'vue-i18n';
import { syncAllWrapper } from '@/services/gitSync';
import { refreshCalendars } from '@/services/calendarCache';

const { t } = useI18n();
const thisModal = useCalendarModal();
const { alert, confirm } = useAlertModal();

const originalCalendar = ref<Calendar | undefined>();
const isSaving = ref(false);
const isDeleting = ref(false);
const isLocked = computed(() => isSaving.value || isDeleting.value);

const howOptions = ['Init', 'Clone'];
const form = reactive({
  how: 'Init',
  name: '',
  remoteURL: '',
  username: '',
  password: '',
  encrypted: false,
  encryptionKey: '',
  readonly: false,
});
const errors = reactive({
  missingName: false,
  badURL: false,
});

watch(
  () => thisModal.openedCalendarName,
  async (newName) => {
    const calendars = await CalendarCore.listCalendars();
    for (const cal of calendars) {
      if (cal.name === newName.value) {
        originalCalendar.value = cal;
        break;
      }
    }
    if (originalCalendar.value) {
      updateFormFromCalendar(originalCalendar.value);
    }
  },
  { immediate: true },
);

function updateFormFromCalendar(calendar: Calendar) {
  resetForm();

  if (!calendar) return;

  form.how = '';
  form.name = calendar.name ?? '';
  form.encrypted = calendar.encrypted;
  form.encryptionKey = ''; // secret
  form.readonly = calendar.readonly;

  if (calendar.remoteUrl) {
    const remoteUrl = authFromUrl(calendar.remoteUrl);
    form.remoteURL = remoteUrl.url;
    form.username = remoteUrl.username;
    form.password = remoteUrl.password;
  }
}

async function saveCalendar(e: Event) {
  if (isLocked.value) return;
  if (!validate()) return;

  isSaving.value = true;

  e.preventDefault();

  try {
    if (thisModal.isNew.value) {
      await createCalendar();
    } else {
      await updateCalendar();
    }
    await CalendarCore.loadCalendars();

    refreshCalendars();
    thisModal.close();
  } catch (err) {
    alert(String(err));
  } finally {
    isSaving.value = false;
  }
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
  }
}

async function updateCalendar() {
  const calendar = originalCalendar.value;
  const origName = calendar?.name;

  console.log('updating calendar', origName);

  if (!origName) throw new Error('Cannot update calendar. This should not happen...');

  let calendarName = origName;
  if (origName !== form.name) {
    await CalendarCore.renameCalendar(origName, form.name);
    calendarName = form.name;
  }

  const rawUrl = form.remoteURL.trim();
  if (rawUrl !== '') {
    const newRemoteUrl = urlWithAuth(rawUrl, form.username, form.password);
    if (calendar.remoteUrl !== newRemoteUrl || originalCalendar.value?.readonly !== form.readonly) {
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
    let ok = await confirm(t('message.confirmCalendarDelete'));
    if (!ok) return;

    await CalendarCore.removeCalendar(originalCalendar.value.name);
    await CalendarCore.loadCalendars();

    refreshCalendars();
    thisModal.close();
  } catch (err) {
    alert(String(err));
  } finally {
    isDeleting.value = false;
  }
}

function validate(): boolean {
  resetErrors();

  const needsName = !thisModal.isNew.value || form.how === 'Init';
  const needsURL = thisModal.isNew.value && form.how === 'Clone';

  form.name = form.name.trim();
  if (needsName && form.name === '') {
    errors.missingName = true;
    return false;
  }

  form.remoteURL = form.remoteURL.trim();
  if (needsURL && form.remoteURL === '') {
    errors.badURL = true;
    return false;
  }

  if (form.remoteURL !== '') {
    if (!isValidUrl(form.remoteURL)) {
      errors.badURL = true;
      return false;
    }

    if (!form.remoteURL.endsWith('.git')) {
      errors.badURL = true;
      alert(t('message.errorRemoteUrlEndDotGit'));
      return false;
    }
  }

  return true;
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function resetForm() {
  form.how = howOptions[0];
  form.name = '';
  form.remoteURL = '';
  form.username = '';
  form.password = '';
  form.encrypted = false;
  form.encryptionKey = '';
  form.readonly = false;

  resetErrors();
}

function resetErrors() {
  errors.missingName = false;
  errors.badURL = false;
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
    <form @submit.prevent="saveCalendar" :aria-busy="isLocked">
      <fieldset :disabled="isLocked">
        <MultiToggle v-if="thisModal.isNew.value" v-model="form.how" :options="howOptions" style="align-self: center" />

        <input
          type="text"
          name="name"
          :placeholder="$t('calendar.name')"
          autocomplete="none"
          :disabled="thisModal.isNew.value && form.how != 'Init'"
          v-model="form.name"
          ref="name-input-field"
          :class="{ red: errors.missingName }"
          @input="errors.missingName = false"
        />

        <input
          type="url"
          name="url"
          :placeholder="`Remote URL ${form.how == 'Init' ? '(' + $t('optionalText') + ')' : ''}`"
          autocomplete="none"
          v-model="form.remoteURL"
          :class="{ red: errors.badURL }"
          @input="errors.badURL = false"
        />

        <div id="git-credentials">
          {{ $t('calendar.gitCredentials') }}
          <div>
            <input
              type="text"
              name="username"
              :placeholder="$t('calendar.username')"
              autocomplete="username"
              v-model="form.username"
            />
            <input
              type="password"
              name="password"
              :placeholder="$t('calendar.password')"
              autocomplete="current-password"
              v-model="form.password"
            />
          </div>
        </div>

        <label v-if="form.how === 'Clone' || (form.how === '' && form.remoteURL !== '')">
          {{ $t('calendar.readonly') }}
          <input type="checkbox" name="readonly" v-model="form.readonly" />
        </label>

        <div id="encryption" v-if="thisModal.isNew.value">
          <!-- TODO: re-encrypt option for existing calendars -->
          <label>
            {{ $t('calendar.encrypted') }}
            <input type="checkbox" name="encrypted" v-model="form.encrypted" />
          </label>

          <input
            v-if="form.encrypted"
            type="password"
            name="encryption-key"
            :placeholder="$t('calendar.encryptionKey')"
            autocomplete="current-password"
            v-model="form.encryptionKey"
          />
        </div>

        <div class="bottom-btns">
          <button type="submit">
            {{ isSaving ? $t('savingBtn') : $t('saveBtn') }}
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
#git-credentials,
#encryption {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;

  > div {
    width: 100%;
    display: flex;
    gap: 1rem;
    justify-content: stretch;

    > * {
      flex: 1;
      width: 100%;
    }
  }
}
</style>
