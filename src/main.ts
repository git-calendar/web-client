import { createApp } from 'vue';
import App from '@/App.vue';
import router from '@/router.ts';
import '@/assets/styles.css';
import { CalendarCore } from '@/wasm/core-wrapper.ts';
import '@/composables/useSettings.ts'; // init settings
import { useTranslation } from '@/composables/useTranslation';

await CalendarCore.setCorsProxy('http://localhost:8080'); // TODO
await CalendarCore.createCalendar('main');
await CalendarCore.loadCalendars();

const { i18n } = useTranslation();

const app = createApp(App);
app.use(router);
app.use(i18n);
app.mount('#app');
