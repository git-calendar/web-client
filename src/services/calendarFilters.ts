import { computed, reactive } from 'vue';
import { cachedCalendars } from '@/services/calendarCache';

export type GetEventsFilter = Record<string, string[]>;

const storageKey = 'calendar-filters';

function loadHiddenTags(): string[] {
  try {
    const tags: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '{}')?.['hidden-tags'];
    return Array.isArray(tags) ? tags.filter((tag): tag is string => typeof tag === 'string') : [];
  } catch {
    return [];
  }
}

const hiddenTags = reactive(new Set(loadHiddenTags()));

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
    const out: GetEventsFilter = {};
    let hasActiveFilter = false;

    for (const cal of cachedCalendars.value) {
      const tagIds = ['', ...(cal.tags ?? []).flatMap((tag) => (tag.id ? [tag.id] : []))];
      const visibleTagIds = tagIds.filter((tagId) => !hiddenTags.has(tagKey(cal.name, tagId)));

      hasActiveFilter ||= visibleTagIds.length < tagIds.length;
      out[cal.name] = visibleTagIds;
    }

    return hasActiveFilter ? out : null;
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
