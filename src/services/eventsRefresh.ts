import { readonly, ref } from 'vue';

const eventsRevisionRef = ref(0);

export const eventsRevision = readonly(eventsRevisionRef);

export function notifyEventsChanged() {
  eventsRevisionRef.value++;
}
