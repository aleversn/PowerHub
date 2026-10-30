import { createApp } from 'vue';
import { createPinia } from 'pinia';

import App from './App.vue';
import router from '@/router/index.js';

import VueFluent from '@creatorsn/vfluent3';
import PowerEditor from '@creatorsn/powereditor3';
import '@creatorsn/vfluent3/style.css';
import '@creatorsn/powereditor3/powereditor3.css';
import '@/style/powerhub.scss';

const app = createApp(App);

app.use(VueFluent);
app.use(PowerEditor);
app.use(createPinia());
app.use(router);

app.mount('#app');
