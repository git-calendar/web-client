import { createApp } from 'vue';
import App from '@/App.vue';
import router from '@/router';
import '@/assets/styles.css';
import '@/services/settings'; // init settings
import { useTranslation } from '@/composables/useTranslation';
import { registerSW } from 'virtual:pwa-register';

registerSW({
  immediate: true,
  onNeedReload() {}, // disables auto reload which could interrupt running app
});

const { i18n } = useTranslation();

const app = createApp(App);
app.use(router);
app.use(i18n);
app.mount('#app');
