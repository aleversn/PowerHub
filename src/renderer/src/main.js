import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';

import router from '@/router/index.js';

import VueFluent from '@creatorsn/vfluent3';
import '@creatorsn/vfluent3/style.css';

const app = createApp(App);
app.use(VueFluent);

app.use(createPinia());
app.use(router);

app.mount('#app');
