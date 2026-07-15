import { createRouter, createWebHistory } from 'vue-router';
import CalendarView from '@/views/CalendarView.vue';
import SettingsView from '@/views/SettingsView.vue';
import FileExplorer from '@/views/FileExplorer.vue';
import { settings } from '@/services/settings';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      name: 'calendar',
      path: '/:view(4d|w|m)/:year(\\d+)?/:month(\\d+)?/:day(\\d+)?',
      component: CalendarView,
    },

    { path: '/settings', component: SettingsView },
    { path: '/files', component: FileExplorer },
    {
      path: '/:pathMatch(.*)*', // anything
      redirect: () => ({
        name: 'calendar',
        params: { view: settings.value.defaultView },
      }),
    },
  ],
});

export default router;
