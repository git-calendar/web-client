<script setup lang="ts">
import { ref, reactive, watch, onMounted, useTemplateRef, toRaw, computed } from 'vue';
import { Freq, UpdateStrategy, type Calendar, type CalendarEvent } from '@/types/core';
import { DateTime } from 'luxon';
import { CalendarCore } from '@/wasm/core-wrapper';
import { useEventModal } from '@/composables/modals/useEventModal';
import StrategyModal from '@/components/modals/StrategyModal.vue';
import { useStrategyModal } from '@/composables/modals/useStrategyModal';
import { useAlertModal } from '@/composables/modals/useAlertModal';
import { syncAllWrapper } from '@/services/gitSync';
import cloneDeep from 'lodash-es/cloneDeep';
import { notifyEventsChanged } from '@/composables/useEventsRefresh';

const repeatEndOptions = [
  { value: 'on', label: 'On' },
  { value: 'after', label: 'After' },
];
const frequencyOptions = [
  { value: Freq.Invalid, label: 'never' },
  { value: Freq.Day, label: 'daily' },
  { value: Freq.Week, label: 'weekly' },
  { value: Freq.Month, label: 'monthly' },
  { value: Freq.Year, label: 'yearly' },
];

const thisModal = useEventModal();
const strategyModal = useStrategyModal();
const { alert } = useAlertModal();

const isSaving = ref(false);
const isDeleting = ref(false);
const isUpdatingWithStrategy = ref(false);
const isLocked = computed(() => isSaving.value || isDeleting.value || isUpdatingWithStrategy.value);

const form = reactive({
  title: '',
  description: '',
  location: '',
  fromDate: '',
  fromTime: '',
  toDate: '',
  toTime: '',
  calendar: '',
  entireDay: false,
  tag: '',

  repeatFreq: Freq.Invalid,
  repeatEnd: 'after',
  repeatEndOn: DateTime.now().plus({ week: 1 }).toISODate(),
  repeatEndAfter: 5,
});
const errors = reactive({
  missingName: false,
  badToDate: false,
  badFromDate: false,
  badUntilDate: false,
});

const calendars = ref<Map<string, Calendar>>(new Map());
const calendarsLoaded = ref(false);

async function loadCalendars() {
  try {
    const cals = await CalendarCore.listCalendars();

    for (const cal of cals) {
      calendars.value.set(cal.name, cal);
    }
  } catch (err) {
    alert(String(err));
  } finally {
    // This acts as our reactive trigger signal
    calendarsLoaded.value = true;
  }
}

let originalEvent: CalendarEvent | undefined = undefined;

watch(
  [() => thisModal.event.value, calendarsLoaded], // Watch the boolean loaded state instead
  ([newEvent, isLoaded]) => {
    if (!newEvent) {
      originalEvent = undefined;
      return;
    }

    originalEvent = cloneDeep(toRaw(newEvent));
    const eventForForm = cloneDeep(originalEvent);

    if (eventForForm.calendar === '') {
      if (!isLoaded) return;

      const firstKey = calendars.value.keys().next().value ?? '';
      const defaultCal = calendars.value.has('default') ? 'default' : firstKey;

      originalEvent.calendar = eventForForm.calendar = defaultCal;

      const firstTagName = calendars.value.get(defaultCal)?.tags?.[0]?.name ?? '';
      originalEvent.tag = eventForForm.tag = firstTagName;
    }

    updateFormFromEvent(originalEvent);
  },
  { immediate: true },
);

function updateFormFromEvent(event: CalendarEvent | undefined) {
  if (!event) return;

  form.title = event.title;
  form.location = event.location ?? '';
  form.description = event.description ?? '';

  [form.fromDate, form.fromTime] = dateTimeToIsoDateAndTime(event.from);
  [form.toDate, form.toTime] = dateTimeToIsoDateAndTime(event.to);
  form.repeatEndOn = event.from.plus({ week: 1 }).toISODate() ?? ''; // the default

  if (form.fromTime == '00:00' && form.toTime == '23:59') {
    form.entireDay = true;
    form.fromTime = '14:00'; // TODO some defaults
    form.toTime = '16:00';
  } else {
    form.entireDay = false;
  }

  if (event.repeat) {
    form.repeatFreq = event.repeat.frequency;

    if (event.repeat.count && event.repeat.count > 1) {
      form.repeatEnd = 'after';
      form.repeatEndAfter = event.repeat.count;
    } else if (event.repeat.until) {
      form.repeatEnd = 'on';
      form.repeatEndOn = event.repeat.until.toISODate() ?? '';
    } else {
      console.log('Something went wrong with the events repetition. Both Until and Count are undefined or invalid.');
    }
  }

  form.calendar = event.calendar;
  form.tag = event.tag;
}

function reconstructEvent(): CalendarEvent {
  const event: CalendarEvent = {
    id: thisModal.event.value?.id,
    title: form.title,
    location: form.location,
    description: form.description,
    calendar: form.calendar,
    tag: form.tag,
    from: form.entireDay
      ? DateTime.fromISO(`${form.fromDate}T00:00`, { zone: originalEvent?.from.zone })
      : DateTime.fromISO(`${form.fromDate}T${form.fromTime}`, { zone: originalEvent?.from.zone }),
    to: form.entireDay
      ? DateTime.fromISO(`${form.toDate}T23:59`, { zone: originalEvent?.to.zone })
      : DateTime.fromISO(`${form.toDate}T${form.toTime}`, { zone: originalEvent?.to.zone }),
    repeat:
      form.repeatFreq != Freq.Invalid
        ? {
            frequency: form.repeatFreq,
            interval: 1,
            until:
              form.repeatEnd === 'on'
                ? DateTime.fromISO(form.repeatEndOn, { zone: originalEvent?.repeat?.until?.zone })
                : undefined,
            count: form.repeatEnd === 'after' ? form.repeatEndAfter : 0,
            exceptions: originalEvent?.repeat?.exceptions ?? [],
          }
        : undefined,
    parentId: originalEvent?.parentId,
  };
  return event;
}

function dateTimeToIsoDateAndTime(time: DateTime): [string, string] {
  return [time.toISODate() ?? '', time.toFormat('HH:mm')];
}

async function saveEvent() {
  if (isLocked.value) return;

  const event = reconstructEvent();
  if (!validate(event)) return;

  isSaving.value = true;

  try {
    if (thisModal.isNew.value) {
      console.time('Time to create event');
      const newEvent = await CalendarCore.createEvent(event);
      console.timeEnd('Time to create event');
      console.log('created event:', newEvent);
    } else if (!originalEvent?.repeat) {
      const newEvent = await CalendarCore.updateEvent(event);
      console.log('updated event:', newEvent);
    } else {
      strategyModal.open('update'); // pop-up with strategy options
      return; // don't close this eventModal just yet
    }

    notifyEventsChanged();
    void syncAllWrapper();
    thisModal.close();
  } catch (err) {
    alert(String(err));
  } finally {
    isSaving.value = false;
  }
}

async function deleteEvent() {
  if (isLocked.value) return;

  const event = reconstructEvent();

  isDeleting.value = true;

  try {
    if (!event.repeat) {
      console.time('Time to delete event');
      await CalendarCore.removeEvent(event);
      console.timeEnd('Time to delete event');

      console.log('deleted event:', event);
    } else {
      strategyModal.open('delete'); // pop-up with strategy options
      return; // don't close this eventModal just yet
    }

    notifyEventsChanged();
    void syncAllWrapper();
    thisModal.close();
  } catch (err) {
    alert(String(err));
  } finally {
    isDeleting.value = false;
  }
}

async function updateWithStrategy(strategy: UpdateStrategy) {
  if (isLocked.value) return;
  isUpdatingWithStrategy.value = true;

  try {
    switch (strategyModal.getAction()) {
      case 'delete':
        await deleteRepeatingEvent(strategy);
        break;
      case 'update':
        await saveRepeatingEvent(strategy);
        break;
    }

    notifyEventsChanged();
    strategyModal.close();
    void syncAllWrapper();
    thisModal.close();
  } catch (err) {
    alert(String(err));
  } finally {
    isUpdatingWithStrategy.value = false;
  }
}

async function saveRepeatingEvent(strategy: UpdateStrategy) {
  const event = reconstructEvent();
  const newEvent = await CalendarCore.updateRepeatingEvent(originalEvent!, event, strategy);
  console.log('updated event with strategy:', newEvent);
}

async function deleteRepeatingEvent(strategy: UpdateStrategy) {
  const event = reconstructEvent();
  await CalendarCore.removeRepeatingEvent(event, strategy);
  console.log('deleted repeating event:', event);
}

function validate(event: CalendarEvent): boolean {
  if (event.title == '') {
    errors.missingName = true;
    return false;
  }

  if (!event.from.isValid) {
    errors.badFromDate = true;
    return false;
  }
  if (!event.to.isValid) {
    errors.badToDate = true;
    return false;
  }

  if (event.to.diff(event.from).as('milliseconds') < 0) {
    errors.badToDate = true;
    return false;
  }

  if (event.repeat && event.repeat.count == 0) {
    if (!event.repeat.until?.isValid) {
      errors.badUntilDate = true;
      return false;
    }
    if (event.repeat.until.diff(event.from).as('milliseconds') < 0) {
      errors.badUntilDate = true;
      return false;
    }
  }

  return true; // ok
}

const nameInputField = useTemplateRef('name-input-field');
onMounted(async () => {
  nameInputField.value?.focus(); // focus name field
  void loadCalendars();
});
</script>

<template>
  <div id="event-modal" class="modal">
    <form @submit.prevent="saveEvent" :aria-busy="isLocked">
      <fieldset :disabled="isLocked">
        <input
          type="text"
          name="title"
          :placeholder="$t('event.title')"
          autocomplete="none"
          v-model="form.title"
          ref="name-input-field"
          :class="{ red: errors.missingName }"
          @input="errors.missingName = false"
        />

        <div class="dates">
          <span>{{ $t('event.from') }}:</span>
          <div class="datetime" :class="{ red: errors.badFromDate }">
            <input type="date" name="from-date" v-model="form.fromDate" @change="errors.badFromDate = false" />
            <input
              type="time"
              name="from-time"
              v-model="form.fromTime"
              v-if="!form.entireDay"
              @change="errors.badFromDate = false"
            />
          </div>

          <span>{{ $t('event.to') }}:</span>
          <div class="datetime" :class="{ red: errors.badToDate }">
            <input type="date" name="to-date" v-model="form.toDate" @change="errors.badToDate = false" />
            <input
              type="time"
              name="to-time"
              v-model="form.toTime"
              v-if="!form.entireDay"
              @change="errors.badToDate = false"
            />
          </div>
        </div>

        <label>
          {{ $t('event.entireDay') }}
          <input type="checkbox" v-model="form.entireDay" />
        </label>

        <label>
          {{ $t('event.repeat.repeat') }}:
          <select name="repeat" v-model="form.repeatFreq">
            <option v-for="freq in frequencyOptions" :value="freq.value" :key="freq.label">
              {{ $t(`event.repeat.${freq.label}`) }}
            </option>
          </select>
        </label>

        <label v-if="form.repeatFreq">
          {{ $t('event.repeat.end') }}:
          <select name="end" v-model="form.repeatEnd">
            <option v-for="end in repeatEndOptions" :value="end.value" :key="end.label">
              {{ $t(`event.repeat.end${end.label}`) }}
            </option>
          </select>

          <input
            v-if="form.repeatEnd == 'on'"
            type="date"
            name="end-on"
            v-model="form.repeatEndOn"
            :class="{ red: errors.badUntilDate }"
            @change="errors.badUntilDate = false"
          />
          <input v-if="form.repeatEnd == 'after'" type="number" name="end-after" v-model="form.repeatEndAfter" />
        </label>

        <label>
          {{ $t('event.calendar') }}:
          <select name="calendar" v-model="form.calendar">
            <option v-for="calendarName in calendars.keys()" :value="calendarName" :key="calendarName">
              {{ calendarName }}
            </option>
          </select>
        </label>

        <label>
          Tag:
          <select name="tag" id="tag" v-model="form.tag">
            <option v-for="tag in calendars.get(form.calendar)?.tags ?? []" :key="tag.name" :value="tag.name">
              {{ tag.name }}
            </option>
          </select>
        </label>

        <input
          type="text"
          name="location"
          :placeholder="$t('event.location')"
          autocomplete="none"
          v-model="form.location"
        />

        <textarea name="description" rows="3" :placeholder="$t('event.description')" v-model="form.description" />

        <div class="bottom-btns">
          <button type="submit">
            {{ isSaving ? $t('savingBtn') : $t('saveBtn') }}
          </button>
          <button type="button" @click="thisModal.close">{{ $t('closeBtn') }}</button>
          <button v-if="!thisModal.isNew.value" type="button" @click="deleteEvent" class="delete-btn">
            {{ isDeleting ? $t('deletingBtn') : $t('deleteBtn') }}
          </button>
        </div>
      </fieldset>
    </form>
  </div>

  <StrategyModal v-if="strategyModal.isOpen.value" @cancel-update="strategyModal.close" @update="updateWithStrategy" />
</template>

<style scoped>
label:has(select[name='end']) {
  margin-left: 4.3rem;

  input[name='end-after'] {
    width: 5rem;
  }

  input[name='end-on'] {
    width: 10rem;
  }
}

label:has(select) {
  display: flex;
  align-items: center;
  gap: 0.8rem;

  select {
    flex: 1 1 auto;
  }
}

.dates {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.7rem;

  > span {
    align-self: center;
  }
}

.datetime {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.7rem;
}

.delete-btn {
  border: 1px solid var(--git-color);
  background-color: var(--btn-red-bg-color);

  &:hover:not(:focus):not(:disabled) {
    background-color: var(--btn-red-bg-color-hover);
  }
}

fieldset {
  display: contents;
  border: 0;
  padding: 0;
  margin: 0;

  &:disabled label,
  &:disabled .dates > span {
    opacity: 0.5;
  }

  &:disabled select {
    opacity: 1; /* it was dimmed 2 times idk */
  }
}

@media (max-width: 450px) {
  label:has(select[name='end']) {
    margin-left: 1.5rem;
  }
}
</style>
