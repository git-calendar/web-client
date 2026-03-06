import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router';
import CalendarView from '@/views/CalendarView.vue';
import SettingsView from '@/views/SettingsView.vue';
import { DateTime } from 'luxon';

import { useSettings } from '@/composables/useSettings';

const { settings } = useSettings();
const isGitHubPages = import.meta.env.VITE_GITHUB_PAGES == 'true'; // needs to have VITE_ prefix

const router = createRouter({
  // localy, we use classic sexy /settings, but on gh pages, that will result in 404 so we need to use hash router
  history: isGitHubPages ? createWebHashHistory(import.meta.env.BASE_URL) : createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      name: 'calendar',
      path: '/:view(month|week|4days)/:year(\\d+)/:month(\\d+)/:day(\\d*)', // for example: /m/2026/3 -> shows March 2026
      component: CalendarView,
    },
    { path: '/settings', component: SettingsView },
    {
      path: '/:pathMatch(.*)*', // anything
      redirect: () => {
        const now = DateTime.now();
        return {
          name: 'calendar',
          params: { view: settings.value.defaultView, year: now.year, month: now.month, day: now.day }, // today
        };
      },
    },
  ],
});

export default router;
