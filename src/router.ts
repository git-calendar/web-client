import { createRouter, createWebHistory } from 'vue-router';
import CalendarView from '@/views/CalendarView.vue';
import SettingsView from '@/views/SettingsView.vue';
import FileExplorer from '@/views/FileExplorer.vue';
import Guide from '@/views/Guide.vue';
import { settings } from '@/services/settings';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/week', redirect: '/w' }, // TODO: delete compatibility
    { path: '/4days', redirect: '/4d' },
    {
      name: 'calendar',
      path: '/:view(4d|w|m)/:year(\\d+)?/:month(\\d+)?/:day(\\d+)?',
      component: CalendarView,
    },

    { path: '/settings', component: SettingsView },
    { path: '/guide', component: Guide },
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
