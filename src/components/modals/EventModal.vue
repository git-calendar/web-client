<script setup lang="ts">
import { ref, shallowRef, reactive, watch, onMounted, useTemplateRef, toRaw, computed, nextTick } from 'vue';
import { UpdateStrategy, type CalendarEvent } from '@/types/core';
import { DateTime } from 'luxon';
import { datetime, RRule, RRuleSet, rrulestr, type Frequency } from 'rrule';
import { CalendarCore } from '@/wasm/core-wrapper';
import { useEventModal } from '@/composables/modals/useEventModal';
import StrategyModal from '@/components/modals/StrategyModal.vue';
import RepeatModal from '@/components/modals/RepeatModal.vue';
import { useStrategyModal } from '@/composables/modals/useStrategyModal';
import { useAlertModal } from '@/composables/modals/useAlertModal';
import { syncAllWrapper } from '@/services/gitSync';
import cloneDeep from 'lodash-es/cloneDeep';
import { notifyEventsChanged } from '@/composables/useEventsRefresh';
import { cachedCalendars, getDefaultCalendar, loadCalendars } from '@/services/calendarCache';
import { getAllDayEndDate, isWholeDay } from '@/utils';

const repeatEndOptions = [
  { value: 'never', translationKey: 'never' },
  { value: 'on', translationKey: 'endOn' },
  { value: 'after', translationKey: 'endAfter' },
];
const frequencyOptions = [
  { value: 'never', frequency: null },
  { value: 'daily', frequency: RRule.DAILY },
  { value: 'weekly', frequency: RRule.WEEKLY },
  { value: 'monthly', frequency: RRule.MONTHLY },
  { value: 'yearly', frequency: RRule.YEARLY },
  { value: 'custom', frequency: undefined },
];

function defaultCustomRepeat(from: DateTime = DateTime.now()): RRule {
  const start = from.isValid ? from : DateTime.now();
  return new RRule({
    freq: RRule.WEEKLY,
    dtstart: start.toJSDate(),
    interval: 2,
    byweekday: [start.weekday - 1],
    count: 5,
  });
}

function frequencyForSelection(selection: string): Frequency | null {
  return frequencyOptions.find((option) => option.value === selection)?.frequency ?? null;
}

function selectionForFrequency(frequency: Frequency): string {
  return frequencyOptions.find((option) => option.frequency === frequency)?.value ?? 'never';
}

const thisModal = useEventModal();
const strategyModal = useStrategyModal();
const { alert } = useAlertModal();

const isRepeatModalOpen = ref(false);
let isNewCustomSelection = false;
let hasCustomRepeat = false;
let lastRegularRepeatSelection = 'never';
const customRepeat = shallowRef(defaultCustomRepeat());

const isSaving = ref(false);
const isDeleting = ref(false);
const isUpdatingWithStrategy = ref(false);
const isLocked = computed(() => isSaving.value || isDeleting.value || isUpdatingWithStrategy.value);
const isReadonly = computed(
  () => cachedCalendars.value.find((calendar) => calendar.name === thisModal.event.value?.calendar)?.readonly ?? false,
);

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
  tagId: '',

  repeatSelection: 'never',
  repeatEnd: 'after',
  repeatEndOn: DateTime.now().plus({ week: 1 }).toISODate() ?? '',
  repeatEndAfter: 5,
});
const errors = reactive({
  missingTitle: false,
  badToDate: false,
  badFromDate: false,
  badUntilDate: false,
  badRepeatCount: false,
});

function getDefaultWritableCalendar() {
  const defaultCalendar = getDefaultCalendar();
  return defaultCalendar && !defaultCalendar.readonly
    ? defaultCalendar
    : cachedCalendars.value.find((calendar) => !calendar.readonly);
}

let originalEvent: CalendarEvent | undefined;
watch(
  () => thisModal.event.value,
  (newEvent) => {
    if (!newEvent) {
      originalEvent = undefined;
      return;
    }

    originalEvent = cloneDeep(toRaw(thisModal.originalEvent.value ?? newEvent));
    const eventForForm = cloneDeep(toRaw(newEvent)) as CalendarEvent;

    if (eventForForm.calendar === '') {
      const defaultCalendar = getDefaultWritableCalendar();
      originalEvent.calendar = eventForForm.calendar = defaultCalendar?.name ?? '';
    }

    updateFormFromEvent(eventForForm);
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
  form.repeatSelection = 'never';
  form.repeatEnd = 'after';
  form.repeatEndAfter = 5;
  form.repeatEndOn = event.from.plus({ week: 1 }).toISODate() ?? ''; // the default
  customRepeat.value = defaultCustomRepeat(event.from);
  hasCustomRepeat = false;
  lastRegularRepeatSelection = 'never';

  if (isWholeDay(event)) {
    form.entireDay = true;
    form.toDate = getAllDayEndDate(event).toISODate() ?? form.toDate;
    form.fromTime = '14:00'; // defaults used when switching back to a timed event
    form.toTime = '16:00';
  } else {
    form.entireDay = false;
  }

  if (event.repeat) {
    const rule = parseRepeat(event.repeat).rrules()[0];
    if (rule) {
      const { count, freq, interval, until } = rule.options;
      const isCustom = interval > 1 || rule.origOptions.byweekday !== undefined;
      form.repeatSelection = isCustom ? 'custom' : selectionForFrequency(freq);
      lastRegularRepeatSelection = selectionForFrequency(freq);

      if (isCustom) {
        hasCustomRepeat = true;
        customRepeat.value = rule;
      } else if (count && count > 0) {
        form.repeatEndAfter = count;
      } else if (until) {
        form.repeatEnd = 'on';
        form.repeatEndOn = DateTime.fromJSDate(until, { zone: event.from.zone }).toISODate() ?? '';
      } else {
        form.repeatEnd = 'never';
      }
    }
  }

  form.calendar = event.calendar;
  form.tagId = event.tagId ?? '';
}

function handleRepeatSelectionChange() {
  if (form.repeatSelection === 'custom') {
    if (!hasCustomRepeat) {
      const from = DateTime.fromISO(form.fromDate);
      const start = from.isValid ? from : DateTime.now();
      const frequency = frequencyForSelection(lastRegularRepeatSelection) ?? RRule.WEEKLY;
      const until = DateTime.fromISO(form.repeatEndOn);
      customRepeat.value = new RRule({
        freq: frequency,
        dtstart: start.toJSDate(),
        interval: 2,
        byweekday: frequency === RRule.WEEKLY ? [start.weekday - 1] : undefined,
        count: form.repeatEnd === 'after' ? form.repeatEndAfter : undefined,
        until: form.repeatEnd === 'on' && until.isValid ? until.toJSDate() : undefined,
      });
    }
    isNewCustomSelection = true;
    isRepeatModalOpen.value = true;
    return;
  }

  lastRegularRepeatSelection = form.repeatSelection;
}

function editCustomRepeat() {
  isNewCustomSelection = false;
  isRepeatModalOpen.value = true;
}

function saveCustomRepeat(value: RRule) {
  customRepeat.value = value;
  form.repeatSelection = 'custom';
  hasCustomRepeat = true;
  isNewCustomSelection = false;
  isRepeatModalOpen.value = false;
  void nextTick(() => repeatSelect.value?.focus());
}

function cancelCustomRepeat() {
  if (isNewCustomSelection) form.repeatSelection = lastRegularRepeatSelection;
  isNewCustomSelection = false;
  isRepeatModalOpen.value = false;
  void nextTick(() => repeatSelect.value?.focus());
}

function reconstructEvent(): CalendarEvent {
  const event: CalendarEvent = {
    id: thisModal.event.value?.id,
    title: form.title,
    location: form.location,
    description: form.description,
    calendar: form.calendar,
    tagId: form.tagId === '' ? undefined : form.tagId,
    from: form.entireDay
      ? DateTime.fromISO(`${form.fromDate}T00:00`, { zone: originalEvent?.from.zone })
      : DateTime.fromISO(`${form.fromDate}T${form.fromTime}`, { zone: originalEvent?.from.zone }),
    to: form.entireDay
      ? DateTime.fromISO(`${form.toDate}T00:00`, { zone: originalEvent?.to.zone }).plus({ days: 1 })
      : DateTime.fromISO(`${form.toDate}T${form.toTime}`, { zone: originalEvent?.to.zone }),
    parentId: originalEvent?.parentId,
  };
  const repeat = buildRepeat(event.from);
  if (repeat) event.repeat = repeat;
  return event;
}

function parseRepeat(repeat: string): RRuleSet {
  return rrulestr(repeat, { forceset: true }) as RRuleSet;
}

const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

function toRRuleDateTime(value: DateTime): Date {
  return datetime(value.year, value.month, value.day, value.hour, value.minute, value.second);
}

function buildRepeat(from: DateTime): string | undefined {
  if (form.repeatSelection === 'never' || !from.isValid) return;

  const recurrence = new RRuleSet();
  const dtstart = toRRuleDateTime(from);

  if (form.repeatSelection === 'custom') {
    const options = customRepeat.value.options;
    const until = options.until
      ? DateTime.fromJSDate(options.until, { zone: from.zone }).set({
          hour: from.hour,
          minute: from.minute,
          second: from.second,
          millisecond: from.millisecond,
        })
      : undefined;

    recurrence.rrule(
      new RRule({
        freq: options.freq,
        dtstart,
        tzid: localTimeZone,
        interval: options.interval,
        byweekday: options.freq === RRule.WEEKLY ? options.byweekday : undefined,
        count: options.count || undefined,
        until: until ? toRRuleDateTime(until) : undefined,
      }),
    );
  } else {
    const frequency = frequencyForSelection(form.repeatSelection);
    if (frequency === null) return;

    const until = DateTime.fromISO(form.repeatEndOn, { zone: from.zone }).set({
      hour: from.hour,
      minute: from.minute,
      second: from.second,
      millisecond: from.millisecond,
    });
    if (form.repeatEnd === 'on' && !until.isValid) return;

    recurrence.rrule(
      new RRule({
        freq: frequency,
        dtstart,
        tzid: localTimeZone,
        count: form.repeatEnd === 'after' ? form.repeatEndAfter : undefined,
        until: form.repeatEnd === 'on' ? toRRuleDateTime(until) : undefined,
      }),
    );
  }

  if (originalEvent?.repeat) {
    for (const exception of parseRepeat(originalEvent.repeat).exdates()) recurrence.exdate(exception);
  }

  return recurrence.toString();
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
    errors.missingTitle = true;
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

  if (form.repeatSelection !== 'never') {
    const isCustom = form.repeatSelection === 'custom';
    const options = customRepeat.value.options;
    const repeatEnd = isCustom ? (options.until ? 'on' : options.count ? 'after' : 'never') : form.repeatEnd;
    const repeatEndAfter = isCustom ? options.count : form.repeatEndAfter;
    const repeatEndOn =
      isCustom && options.until
        ? (DateTime.fromJSDate(options.until, { zone: event.from.zone }).toISODate() ?? '')
        : form.repeatEndOn;

    if (
      isCustom &&
      (!Number.isInteger(options.interval) ||
        options.interval < 1 ||
        (options.freq === RRule.WEEKLY && options.byweekday.length === 0))
    ) {
      isRepeatModalOpen.value = true;
      return false;
    }

    if (repeatEnd === 'after') {
      if (!repeatEndAfter || !Number.isInteger(repeatEndAfter) || repeatEndAfter < 1) {
        errors.badRepeatCount = true;
        if (isCustom) isRepeatModalOpen.value = true;
        return false;
      }
    } else if (repeatEnd === 'on') {
      const until = DateTime.fromISO(repeatEndOn, { zone: event.from.zone });
      if (!until.isValid || until.startOf('day') < event.from.startOf('day')) {
        errors.badUntilDate = true;
        if (isCustom) isRepeatModalOpen.value = true;
        return false;
      }
    }
  }

  return true; // ok
}

const titleInputField = useTemplateRef('title-input-field');
const repeatSelect = useTemplateRef('repeat-select');
onMounted(async () => {
  titleInputField.value?.focus(); // focus title field

  await loadCalendars();

  if (form.calendar === '') {
    const calendar = getDefaultWritableCalendar();

    form.calendar = calendar?.name ?? '';
    form.tagId = calendar?.tags[0]?.id ?? '';
  }
});
</script>

<template>
  <div id="event-modal" class="modal" :inert="isRepeatModalOpen">
    <form @submit.prevent="saveEvent" :aria-busy="isLocked">
      <fieldset :disabled="isLocked || isReadonly" :class="{ readonly: isReadonly && !isLocked }">
        <input
          type="text"
          name="title"
          :placeholder="$t('event.title')"
          autocomplete="none"
          v-model="form.title"
          ref="title-input-field"
          :class="{ red: errors.missingTitle }"
          @input="errors.missingTitle = false"
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

        <div class="repeat-row">
          <label for="repeat">{{ $t('event.repeat.repeat') }}:</label>
          <select
            id="repeat"
            name="repeat"
            v-model="form.repeatSelection"
            ref="repeat-select"
            @change="handleRepeatSelectionChange"
          >
            <option v-for="freq in frequencyOptions" :value="freq.value" :key="freq.value">
              {{ $t(`event.repeat.${freq.value}`) }}
            </option>
          </select>
          <button v-if="form.repeatSelection === 'custom'" type="button" @click="editCustomRepeat">
            {{ $t('event.repeat.edit') }}
          </button>
        </div>

        <label v-if="form.repeatSelection !== 'never' && form.repeatSelection !== 'custom'">
          {{ $t('event.repeat.end') }}:
          <select name="end" v-model="form.repeatEnd">
            <option v-for="end in repeatEndOptions" :value="end.value" :key="end.value">
              {{ $t(`event.repeat.${end.translationKey}`) }}
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
          <input
            v-if="form.repeatEnd == 'after'"
            type="number"
            name="end-after"
            min="1"
            step="1"
            v-model="form.repeatEndAfter"
            :class="{ red: errors.badRepeatCount }"
            @input="errors.badRepeatCount = false"
          />
        </label>

        <div class="form-row">
          <select name="calendar" v-model="form.calendar">
            <option
              v-for="calendar in cachedCalendars"
              :key="calendar.name"
              :value="calendar.name"
              :disabled="calendar.readonly"
            >
              {{ calendar.name }}
            </option>
          </select>

          <select name="tag" id="tag" v-model="form.tagId">
            <option value="">{{ $t('tag.notag') }}</option>
            <option
              v-for="tag in cachedCalendars.find((cal) => cal.name == form.calendar)?.tags ?? []"
              :key="tag.id"
              :value="tag.id"
            >
              {{ tag.name }}
            </option>
          </select>
        </div>

        <input
          type="text"
          name="location"
          :placeholder="$t('event.location')"
          autocomplete="none"
          v-model="form.location"
        />

        <textarea name="description" rows="3" :placeholder="$t('event.description')" v-model="form.description" />
      </fieldset>

      <div class="event-modal-footer">
        <div class="bottom-btns">
          <button v-if="!isReadonly" type="submit" :disabled="isLocked">
            {{ isSaving ? $t('savingBtn') : $t('saveBtn') }}
          </button>
          <button type="button" :disabled="isLocked" @click="thisModal.close">{{ $t('closeBtn') }}</button>
          <button
            v-if="!thisModal.isNew.value && !isReadonly"
            type="button"
            class="delete-btn"
            :disabled="isLocked"
            @click="deleteEvent"
          >
            {{ isDeleting ? $t('deletingBtn') : $t('deleteBtn') }}
          </button>
        </div>
        <small v-if="isReadonly" class="readonly-tag">{{ $t('calendar.readonly') }}</small>
      </div>
    </form>
  </div>

  <RepeatModal
    v-if="isRepeatModalOpen"
    :model-value="customRepeat"
    :start-date="form.fromDate"
    @save="saveCustomRepeat"
    @cancel="cancelCustomRepeat"
  />
  <StrategyModal v-if="strategyModal.isOpen.value" @cancel-update="strategyModal.close" @update="updateWithStrategy" />
</template>

<style scoped>
.repeat-row {
  display: flex;
  align-items: center;
  gap: 0.8rem;

  select {
    flex: 1 1 auto;
  }
}

label:has(select[name='end']) {
  margin-left: 4.3rem;

  input[name='end-after'] {
    width: 5rem;
  }

  input[name='end-on'] {
    width: 10rem;
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
  flex-wrap: nowrap;
  gap: 0.7rem;

  > input {
    min-width: 0;
  }

  > input[type='date'] {
    flex: 0 1 9rem;
  }

  > input[type='time'] {
    flex: 0 1 7rem;
  }
}

fieldset.readonly:disabled {
  label,
  .dates > span {
    opacity: 1;
  }

  input,
  textarea,
  select,
  button {
    cursor: default;
    opacity: 1;
  }
}

.event-modal-footer {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  min-height: 2rem;
}

.readonly-tag {
  position: absolute;
  right: 0;
  bottom: 0;
  color: #888;
  font-size: 0.75rem;
  line-height: 1;
}

@media (max-width: 450px) {
  label:has(select[name='end']) {
    margin-left: 1.5rem;
  }
}
</style>
