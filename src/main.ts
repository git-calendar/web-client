import { createApp } from 'vue';
import App from '@/App.vue';
import router from '@/router.ts';
import '@/assets/styles.css';
import '@/services/settings.ts'; // init settings
import { useTranslation } from '@/composables/useTranslation.ts';

import { registerSW } from 'virtual:pwa-register';

registerSW({
  immediate: true,
});

const { i18n } = useTranslation();

const app = createApp(App);
app.use(router);
app.use(i18n);
app.mount('#app');
