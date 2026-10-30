import { createRouter, createWebHashHistory } from 'vue-router'

import tool from "./tools";

import home from "@/views/home/index.vue";

const router = createRouter({
    history: createWebHashHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            name: 'home',
            component: home,
        },
    ]
})

export default router
