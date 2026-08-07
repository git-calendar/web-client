import { createRouter, createWebHistory } from 'vue-router';
import { DateTime } from 'luxon';
import CalendarView from '@/views/CalendarView.vue';
import SettingsView from '@/views/SettingsView.vue';
import FileExplorer from '@/views/FileExplorer.vue';
import Guide from '@/views/Guide.vue';
import { settings, type CalendarView as CalendarViewName } from '@/services/settings';
import { getCalendarRedirect } from '@/utils';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/week', redirect: '/w' }, // TODO: delete compatibility
    { path: '/4days', redirect: '/4d' },
    {
      path: '/:view(4d|w|m)',
      redirect: (to) => getCalendarRedirect(String(to.params.view) as CalendarViewName, DateTime.now()),
    },
    {
      name: 'calendar',
      path: '/:view(4d|w|m)/:year(\\d+)/:month(\\d+)/:day(\\d+)',
      component: CalendarView,
    },

    { path: '/settings', component: SettingsView },
    { path: '/guide', component: Guide },
    { path: '/files', component: FileExplorer },
    {
      path: '/:pathMatch(.*)*', // anything
      redirect: () => getCalendarRedirect(settings.value.defaultView, DateTime.now()),
    },
  ],
});

export default router;
