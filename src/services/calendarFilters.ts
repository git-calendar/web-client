import { computed, reactive } from 'vue';
import { cachedCalendars } from '@/services/calendarCache';

export type GetEventsFilter = Record<string, string[]>;

const storageKey = 'calendar-filters';

const stored = JSON.parse(localStorage.getItem(storageKey) ?? '{}');

const hiddenCalendars = reactive(new Set<string>(stored['hidden-calendars'] ?? []));
const hiddenTags = reactive(new Set<string>(stored['hidden-tags'] ?? []));

function tagKey(calendar: string, tagId: string): string {
  return `${calendar}:${tagId}`;
}

function saveFilters() {
  localStorage.setItem(
    storageKey,
    JSON.stringify({
      'hidden-calendars': [...hiddenCalendars],
      'hidden-tags': [...hiddenTags],
    }),
  );
}

export function useCalendarFilters() {
  const filter = computed<GetEventsFilter | null>(() => {
    if (hiddenCalendars.size === 0 && hiddenTags.size === 0) {
      return null;
    }

    const out: GetEventsFilter = {};

    for (const cal of cachedCalendars.value) {
      if (hiddenCalendars.has(cal.name)) {
        continue;
      }

      if (cal.tags == null) {
        out[cal.name] = [];
        continue;
      }

      const tagIds = cal.tags.flatMap((tag) => {
        if (!tag.id || hiddenTags.has(tagKey(cal.name, tag.id))) {
          return [];
        }

        return [tag.id];
      });

      if (tagIds.length > 0) {
        out[cal.name] = tagIds;
      }
    }

    return out;
  });

  function toggleCalendar(calendar: string) {
    if (hiddenCalendars.has(calendar)) {
      hiddenCalendars.delete(calendar);
      saveFilters();
      return;
    }

    hiddenCalendars.add(calendar);
    saveFilters();
  }

  function toggleTag(calendar: string, tagId: string) {
    const key = tagKey(calendar, tagId);

    if (hiddenTags.has(key)) {
      hiddenTags.delete(key);
      saveFilters();
      return;
    }

    hiddenTags.add(key);
    saveFilters();
  }

  function isCalendarVisible(calendar: string): boolean {
    return !hiddenCalendars.has(calendar);
  }

  function isTagVisible(calendar: string, tagId?: string): boolean {
    if (!tagId) {
      return false;
    }

    return !hiddenTags.has(tagKey(calendar, tagId));
  }

  return {
    filter,
    toggleCalendar,
    toggleTag,
    isCalendarVisible,
    isTagVisible,
  };
}
