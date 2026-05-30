<script setup lang="ts">
import { reactive, ref, watch, onMounted, useTemplateRef } from 'vue';
import MultiToggle from '@/components/MultiToggle.vue';
import { CalendarCore } from '@/wasm/core-wrapper';
import { useCalendarModal } from '@/composables/useCalendarModal';
import type { Calendar } from '@/types/core';

const emit = defineEmits(['refresh-data']);
const thisModal = useCalendarModal();

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
  missingURL: false,
});

const originalCalendar = ref<Calendar | undefined>(undefined);

watch(
  () => thisModal.calendar.value,
  (newCalendar) => {
    if (isExistingCalendar(newCalendar)) {
      originalCalendar.value = { ...newCalendar };
    } else {
      originalCalendar.value = undefined;
    }

    updateFormFromCalendar(newCalendar);
  },
  { immediate: true },
);

function isExistingCalendar(calendar: Calendar | undefined): calendar is Calendar {
  return Boolean(calendar?.name?.trim());
}

function updateFormFromCalendar(calendar: Calendar | undefined) {
  resetForm();

  if (!calendar) return;

  form.how = calendar.remoteUrl ? 'Clone' : 'Init';
  form.name = calendar.name ?? '';
  form.url = calendar.remoteUrl ?? '';
  form.username = '';
  form.password = '';
  form.encrypted = calendar.decryptionKey !== undefined;
  form.decryptionKey = ''; // secret
}

function reconstructCalendar(): Calendar {
  const trimmedUrl = form.url.trim();

  return {
    ...originalCalendar.value,
    name: form.name.trim(),
    remoteUrl: trimmedUrl ? urlWithAuth(trimmedUrl, form.username, form.password) : undefined,
    decryptionKey: form.encrypted ? form.decryptionKey || originalCalendar.value?.decryptionKey : undefined,
  };
}

async function saveCalendar() {
  if (!validate()) return;

  try {
    if (thisModal.isNew.value) {
      await createCalendar();
    } else {
      await updateCalendar();
    }

    await CalendarCore.loadCalendars();
  } catch (err) {
    alert(err);
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
  if (!originalCalendar.value) {
    throw new Error('Cannot update calendar: no existing calendar was loaded.');
  }

  const updatedCalendar = reconstructCalendar();

  await CalendarCore.updateCalendar(originalCalendar.value.name, updatedCalendar);
}

async function deleteCal() {
  if (!originalCalendar.value) return;

  try {
    await CalendarCore.removeCalendar(originalCalendar.value.name);
    await CalendarCore.loadCalendars();
  } catch (err) {
    alert(err);
    return;
  }

  emit('refresh-data');
  thisModal.close();
}

function validate(): boolean {
  resetErrors();

  const needsName = !thisModal.isNew.value || form.how === 'Init';
  const needsURL = thisModal.isNew.value && form.how === 'Clone';

  if (needsName && form.name.trim() === '') {
    errors.missingName = true;
    return false;
  }

  if (needsURL && form.url.trim() === '') {
    errors.missingURL = true;
    return false;
  }

  if (form.url.trim() !== '' && !isValidUrl(form.url.trim())) {
    errors.missingURL = true;
    return false;
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
  errors.missingURL = false;
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

const nameInputField = useTemplateRef('name-input-field');

onMounted(() => {
  nameInputField.value?.focus();
});
</script>

<template>
  <div id="calendar-modal" class="modal">
    <form @submit.prevent="saveCalendar">
      {{ thisModal.isNew }}
      <MultiToggle v-if="thisModal.isNew" v-model="form.how" :options="howOptions" style="align-self: center" />

      <input
        type="text"
        name="name"
        :placeholder="$t('calendar.name')"
        autocomplete="none"
        :disabled="thisModal.isNew && form.how != 'Init'"
        v-model="form.name"
        ref="name-input-field"
        :class="{ red: errors.missingName }"
        @input="errors.missingName = false"
      />

      <input
        type="url"
        name="url"
        :placeholder="`Remote URL ${thisModal.isNew && form.how == 'Clone' ? '' : '(' + $t('optionalText') + ')'}`"
        autocomplete="none"
        v-model="form.url"
        :class="{ red: errors.missingURL }"
        @input="errors.missingURL = false"
      />

      <div id="git-credentials">
        {{ $t('calendar.gitCredentials') }}
        <div>
          <input type="text" name="username" :placeholder="$t('calendar.username')" v-model="form.username" />
          <input type="password" name="password" :placeholder="$t('calendar.password')" v-model="form.password" />
        </div>
      </div>

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

      <div class="bottom-btns">
        <button type="submit">{{ $t('saveBtn') }}</button>
        <button type="button" @click="thisModal.close">{{ $t('closeBtn') }}</button>
        <button v-if="!thisModal.isNew" type="button" @click="deleteCal" class="delete-btn">
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
