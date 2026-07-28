import { computed, reactive } from 'vue';
import { cachedCalendars } from '@/services/calendarCache';

export type GetEventsFilter = Record<string, string[]>;

const storageKey = 'calendar-filters';

const stored = JSON.parse(localStorage.getItem(storageKey) ?? '{}');

const hiddenTags = reactive(new Set<string>(stored['hidden-tags'] ?? []));

function tagKey(calendar: string, tagId: string): string {
  return `${calendar}:${tagId}`;
}

function saveFilters() {
  localStorage.setItem(
    storageKey,
    JSON.stringify({
      'hidden-tags': [...hiddenTags],
    }),
  );
}

export function useCalendarFilters() {
  const filter = computed<GetEventsFilter | null>(() => {
    if (hiddenTags.size === 0) {
      return null;
    }

    const out: GetEventsFilter = {};

    for (const cal of cachedCalendars.value) {
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

      out[cal.name] = tagIds;
    }

    return out;
  });

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

  function isTagVisible(calendar: string, tagId?: string): boolean {
    return !hiddenTags.has(tagKey(calendar, tagId ?? ''));
  }

  function isEventVisible(calendar: string, tagId?: string): boolean {
    return isTagVisible(calendar, tagId);
  }

  return {
    filter,
    toggleTag,
    isTagVisible,
    isEventVisible,
  };
}
