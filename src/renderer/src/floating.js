import { createApp } from 'vue';
import { createPinia } from 'pinia';
import VueFluent from '@creatorsn/vfluent3';
import '@creatorsn/vfluent3/style.css';
import i18n from '@/js/i18n';
import { useAppConfigStore } from '@/stores/appConfig';
import FloatingMonitor from '@/views/floatingMonitor/index.vue';

const app = createApp(FloatingMonitor);
app.use(createPinia());
app.use(VueFluent);
const config = useAppConfigStore();
config.initialize();
config.reviseI18N(i18n);
const applyDesktopState = (state) => {
    const patch = { theme: state.theme, language: state.language };
    if (Object.entries(patch).some(([key, value]) => config.config[key] !== value)) config.updateConfig(patch);
};
window.api.desktop.onState(applyDesktopState);
window.api.desktop.getState().then(applyDesktopState).catch((error) => console.error('Desktop state failed:', error));
app.mount('#app');
