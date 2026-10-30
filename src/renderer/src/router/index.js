import { createRouter, createWebHashHistory } from 'vue-router';

import tool from './tools';

const AsyncLoad = tool.AsyncLoad;

const router = createRouter({
    history: createWebHashHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            component: AsyncLoad(() => import('@/views/layout/index.vue')),
            redirect: { name: 'dashboard' },
            children: [
                {
                    path: 'dashboard',
                    name: 'dashboard',
                    component: AsyncLoad(
                        () => import('@/views/dashboard/index.vue')
                    ),
                    meta: {
                        title: 'Overview',
                        description: 'Quickly inspect endpoint health, schedules, and recent executions.'
                    }
                },
                {
                    path: 'endpoints',
                    name: 'endpoints',
                    component: AsyncLoad(
                        () => import('@/views/endpoints/index.vue')
                    ),
                    meta: {
                        title: 'Endpoints',
                        description: 'Manage HTTP requests, default headers, and monitor health.'
                    }
                },
                {
                    path: 'schedules',
                    name: 'schedules',
                    component: AsyncLoad(
                        () => import('@/views/schedules/index.vue')
                    ),
                    meta: {
                        title: 'Schedules',
                        description: 'Run HTTP requests on a Cron or interval plan. Demo data is local.'
                    }
                },
                {
                    path: 'runs',
                    name: 'runs',
                    component: AsyncLoad(
                        () => import('@/views/runs/index.vue')
                    ),
                    meta: {
                        title: 'Run history',
                        description: 'Inspect recent request results, status codes, and duration.'
                    }
                },
                {
                    path: 'server-status',
                    name: 'server-status',
                    component: AsyncLoad(
                        () => import('@/views/serverStatus/index.vue')
                    ),
                    meta: {
                        title: 'Server Status',
                        description: 'Monitor load, memory, disk, and network activity across your servers.'
                    }
                },
                {
                    path: 'server-status/:id',
                    name: 'server-detail',
                    component: AsyncLoad(
                        () => import('@/views/serverDetail/index.vue')
                    ),
                    meta: {
                        title: 'Server Detail',
                        description: 'Inspect CPU, memory, GPU, network, and disk details for one server.'
                    }
                },
                {
                    path: 'servers',
                    name: 'servers',
                    component: AsyncLoad(
                        () => import('@/views/servers/index.vue')
                    ),
                    meta: {
                        title: 'Servers',
                        description: 'Add and manage the servers PowerHub should monitor.'
                    }
                },
                {
                    path: 'settings',
                    name: 'settings',
                    component: AsyncLoad(
                        () => import('@/views/settings/index.vue')
                    ),
                    meta: {
                        title: 'Settings',
                        description: 'Configure theme, language, and scheduler defaults.'
                    }
                }
            ]
        },
        {
            path: '/:pathMatch(.*)*',
            redirect: { name: 'dashboard' }
        }
    ]
});

router.afterEach((to) => {
    document.title = to.meta?.title || 'PowerHub';
});

export default router;
