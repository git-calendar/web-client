<script setup lang="ts">
import { reactive, watch, onMounted, useTemplateRef, ref } from 'vue';
import MultiToggle from '@/components/MultiToggle.vue';
import { CalendarCore } from '@/wasm/core-wrapper';
import { useCalendarModal } from '@/composables/modals/useCalendarModal';
import type { Calendar } from '@/types/core';
import { useAlertModal } from '@/composables/modals/useAlertModal';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const emit = defineEmits(['refresh-data']);
const thisModal = useCalendarModal();
const { alert, confirm } = useAlertModal();

const howOptions = ['Init', 'Clone'];
const form = reactive({
  how: 'Init',
  name: '',
  url: '',
  username: '',
  password: '',
  encrypted: false,
  decryptionKey: '',
});
const errors = reactive({
  missingName: false,
  badURL: false,
});

const originalCalendar = ref<Calendar | undefined>();

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
  form.decryptionKey = ''; // secret

  if (calendar.remotes && calendar.remotes.length !== 0) {
    const remoteUrl = authFromUrl(calendar.remotes[0]);
    form.url = remoteUrl.url;
    form.username = remoteUrl.username;
    form.password = remoteUrl.password;
  }
}

async function saveCalendar(e: Event) {
  e.preventDefault();

  if (!validate()) return;

  try {
    if (thisModal.isNew.value) {
      await createCalendar();
    } else {
      await updateCalendar();
    }

    await CalendarCore.loadCalendars();
  } catch (err) {
    alert(String(err));
    return;
  }

  emit('refresh-data');
  thisModal.close();
}

async function createCalendar() {
  switch (form.how) {
    case 'Init':
      await CalendarCore.createCalendar(form.name.trim(), form.encrypted ? form.decryptionKey : '');
      break;

    case 'Clone':
      await CalendarCore.cloneCalendar(
        urlWithAuth(form.url.trim(), form.username, form.password),
        form.encrypted ? form.decryptionKey : '',
      );
      break;
  }
}

async function updateCalendar() {
  const calendar = originalCalendar.value;
  const origName = calendar?.name;

  if (!origName) throw new Error('Cannot update calendar. This should not happen...');

  let calendarName = origName;
  if (origName !== form.name) {
    await CalendarCore.renameCalendar(origName, form.name);
    calendarName = form.name;
  }

  const rawUrl = form.url?.trim();
  if (rawUrl && !rawUrl) {
    errors.badURL = true;
    return;
  }

  const newRemoteUrl = urlWithAuth(rawUrl, form.username, form.password);
  const currentRemoteUrl = calendar.remotes?.[0] ?? '';
  if (currentRemoteUrl !== newRemoteUrl) {
    await CalendarCore.updateRemotes(calendarName, newRemoteUrl);
  }
}

async function deleteCal() {
  if (!originalCalendar.value) throw new Error('Cannot delete calendar. This should not happen...');

  let ok = await confirm(t('message.confirmCalendarDelete'));
  if (!ok) return;

  try {
    await CalendarCore.removeCalendar(originalCalendar.value.name);
    await CalendarCore.loadCalendars();
  } catch (err) {
    alert(String(err));
    return;
  }

  emit('refresh-data');
  thisModal.close();
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

  form.url = form.url.trim();
  if (needsURL && form.url === '') {
    errors.badURL = true;
    return false;
  }

  if (form.url !== '') {
    if (!isValidUrl(form.url)) {
      errors.badURL = true;
      return false;
    }

    if (!form.url.endsWith('.git')) {
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
  form.url = '';
  form.username = '';
  form.password = '';
  form.encrypted = false;
  form.decryptionKey = '';

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
    <form>
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
        v-model="form.url"
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

      <div id="encryption" v-if="thisModal.isNew.value">
        <!-- TODO: re-encrypt option for existing calendars -->
        <label>
          {{ $t('calendar.encrypted') }}
          <input type="checkbox" v-model="form.encrypted" />
        </label>

        <input
          v-if="form.encrypted"
          type="password"
          name="decryption-key"
          :placeholder="$t('calendar.decryptionKey')"
          autocomplete="current-password"
          v-model="form.decryptionKey"
        />
      </div>

      <div class="bottom-btns">
        <button type="submit" @click="saveCalendar">{{ $t('saveBtn') }}</button>
        <button type="button" @click="thisModal.close">{{ $t('closeBtn') }}</button>
        <button v-if="!thisModal.isNew.value" type="button" @click="deleteCal" class="delete-btn">
          {{ $t('deleteBtn') }}
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
#calendar-modal {
  form {
    > #git-credentials {
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
  }
}

.delete-btn {
  border: 1px solid var(--git-color);
  background-color: var(--btn-red-bg-color);

  &:hover:not(:focus):not(:disabled) {
    background-color: var(--btn-red-bg-color-hover);
  }
}
</style>
