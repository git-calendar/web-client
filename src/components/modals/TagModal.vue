<script setup lang="ts">
import { colorsList, getColorI18nKey } from '@/colors';
import { useAlertModal } from '@/composables/modals/useAlertModal';
import { useTagModal } from '@/composables/modals/useTagModal';
import { refreshCalendars } from '@/services/calendarCache';
import { syncAllWrapper } from '@/services/gitSync';
import type { Tag } from '@/types/core';
import { CalendarCore } from '@/wasm/core-wrapper';
import { cloneDeep } from 'lodash-es';
import { ref, reactive, computed, watch, onMounted, useTemplateRef } from 'vue';

const thisModal = useTagModal();
const { alert } = useAlertModal();

const isSaving = ref(false);
const isDeleting = ref(false);
const isLocked = computed(() => isSaving.value || isDeleting.value);

const form = reactive({
  name: '',
  color: '',
});
const errors = reactive({
  missingName: false,
  missingColor: false,
});

watch(
  () => thisModal.tag.value,
  (newTag) => {
    if (!newTag) {
      return;
    }
    const tagForForm = cloneDeep(newTag);
    updateFormFromTag(tagForForm);
  },
  { immediate: true },
);

const isNew = computed(() => {
  return thisModal.tag.value?.id === undefined;
});

function updateFormFromTag(tag: Tag | undefined) {
  if (!tag) return;

  form.name = tag.name;
  form.color = tag.color ?? '';
}

function reconstructTag(): Tag {
  const tag: Tag = {
    id: thisModal.tag.value?.id,
    name: form.name,
    color: form.color,
  };
  return tag;
}

async function saveTag() {
  const tag = reconstructTag();
  if (!validate(tag)) return;
  if (!thisModal.calendarName.value) {
    alert('Something went wrong...');
    console.error('Calendar name was not set?!');
    return;
  }

  isSaving.value = true;
  try {
    if (isNew.value) {
      await CalendarCore.createTag(thisModal.calendarName.value, tag);
    } else {
      await CalendarCore.updateTag(thisModal.calendarName.value, tag);
    }
    void syncAllWrapper();
    refreshCalendars();
    thisModal.close();
  } catch (err) {
    alert(String(err));
  } finally {
    isSaving.value = false;
  }
}

async function deleteTag() {
  const tag = reconstructTag();
  if (!tag.id) {
    alert('Something went wrong...');
    console.error('Tag has no ID?!');
    return;
  }
  if (!thisModal.calendarName.value) {
    alert('Something went wrong...');
    console.error('Calendar name was not set?!');
    return;
  }

  isDeleting.value = true;
  try {
    await CalendarCore.removeTag(thisModal.calendarName.value, tag.id);
    void syncAllWrapper();
    refreshCalendars();
    thisModal.close();
  } catch (err) {
    alert(String(err));
  } finally {
    isDeleting.value = false;
  }
}

function validate(tag: Tag): boolean {
  if (tag.name == '') {
    errors.missingName = true;
    return false;
  }

  if (tag.color == '') {
    errors.missingColor = true;
    return false;
  }

  return true; // ok
}

const nameInputField = useTemplateRef('name-input-field');
onMounted(async () => {
  nameInputField.value?.focus(); // focus name field
});
</script>

<template>
  <div id="tag-modal" class="modal">
    <form @submit.prevent="saveTag" :aria-busy="isLocked">
      <fieldset :disabled="isLocked">
        <input
          type="text"
          name="name"
          :placeholder="$t('tag.name')"
          autocomplete="none"
          v-model="form.name"
          ref="name-input-field"
          :class="{ red: errors.missingName }"
          @input="errors.missingName = false"
        />

        <!-- TODO: prettier color picker -->
        <label>
          {{ $t('tag.color') }}:
          <select name="color" id="color" v-model="form.color">
            <option v-for="color in colorsList" :key="color" :value="color">
              {{ $t(getColorI18nKey(color)) }}
            </option>
          </select>
        </label>

        <div class="bottom-btns">
          <button type="submit">
            {{ isSaving ? $t('savingBtn') : $t('saveBtn') }}
          </button>
          <button type="button" @click="thisModal.close">{{ $t('closeBtn') }}</button>
          <button v-if="!thisModal.isNew.value" type="button" @click="deleteTag" class="delete-btn">
            {{ isDeleting ? $t('deletingBtn') : $t('deleteBtn') }}
          </button>
        </div>
      </fieldset>
    </form>
  </div>
</template>

<style scoped>
#tag-modal {
  > form {
    min-width: 20rem;
    width: auto;
  }
}
</style>
