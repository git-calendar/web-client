import { computed, reactive } from 'vue';
import { cachedCalendars } from '@/services/calendarCache';
import type { GetEventsFilter } from '@/types/core';

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
    const out: GetEventsFilter = new Map();

    for (const cal of cachedCalendars.value) {
      const hiddenTagIds = (cal.tags ?? []).flatMap((tag) =>
        tag.id && hiddenTags.has(tagKey(cal.name, tag.id)) ? [tag.id] : [],
      );
      const hideUntagged = hiddenTags.has(tagKey(cal.name, ''));

      if (hiddenTagIds.length > 0 || hideUntagged) {
        out.set(cal.name, { hiddenTagIds, hideUntagged });
      }
    }

    return out.size > 0 ? out : null;
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

  return {
    filter,
    toggleTag,
    isTagVisible,
  };
}
