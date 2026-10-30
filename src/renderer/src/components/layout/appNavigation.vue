<template>
    <aside class="app-navigation">
        <fv-navigation-view
            v-model="currentNavItem"
            :title="appName"
            :options="navigationOptions"
            :expand="!collapsed"
            :expand-width="260"
            :compact-width="76"
            :flyout-display="880"
            :mobile-display="640"
            background="transparent"
            :foreground="headerForeground"
            :show-back="false"
            :show-search="false"
            :setting-title="local('Settings')"
            class="navigation-view"
            @item-click="onItemClick"
            @setting-click="openSettings"
            @expand-change="onExpandChange"
        ></fv-navigation-view>
    </aside>
</template>

<script>
import { mapActions, mapState } from 'pinia';

import { useAppConfigStore } from '@/stores/appConfig';

export default {
    name: 'AppNavigation',
    data() {
        return {
            currentNavItem: {}
        };
    },
    computed: {
        ...mapState(useAppConfigStore, [
            'appName',
            'config',
            'local',
            'resolvedTheme'
        ]),
        collapsed() {
            return this.config.sidebarCollapsed;
        },
        headerForeground() {
            return this.resolvedTheme === 'dark' ? '#8ecbff' : '#0067b8';
        },
        navigationOptions() {
            return [
                {
                    key: 'api-requests',
                    name: () => this.local('API Requests'),
                    type: 'header'
                },
                {
                    key: 'dashboard',
                    name: () => this.local('Overview'),
                    icon: 'Home',
                    route: '/dashboard'
                },
                {
                    key: 'endpoints',
                    name: () => this.local('Endpoints'),
                    icon: 'LightningBolt',
                    route: '/endpoints'
                },
                {
                    key: 'schedules',
                    name: () => this.local('Schedules'),
                    icon: 'DateTime',
                    route: '/schedules'
                },
                {
                    key: 'runs',
                    name: () => this.local('Run history'),
                    icon: 'History',
                    route: '/runs'
                },
                {
                    key: 'server-monitoring',
                    name: () => this.local('Server Monitoring'),
                    type: 'header'
                },
                {
                    key: 'server-status',
                    name: () => this.local('Server Status'),
                    icon: 'Health',
                    route: '/server-status',
                    disabled: true
                },
                {
                    key: 'servers',
                    name: () => this.local('Servers'),
                    icon: 'Server',
                    route: '/servers',
                    disabled: true
                }
            ];
        }
    },
    watch: {
        '$route.path': {
            immediate: true,
            handler() {
                this.syncCurrentNav();
            }
        }
    },
    mounted() {
        this.syncCurrentNav();
    },
    methods: {
        ...mapActions(useAppConfigStore, ['setSidebarCollapsed']),
        onItemClick(item) {
            if (!item || item.disabled || !item.route) return;
            this.$router.push(item.route);
        },
        onExpandChange(expanded) {
            this.setSidebarCollapsed(!expanded);
        },
        openSettings() {
            this.$router.push({ name: 'settings' });
        },
        syncCurrentNav() {
            const options = this.navigationOptions
                .filter((item) => item.type !== 'header' && item.route)
                .sort((left, right) => right.route.length - left.route.length);
            const currentPath = this.$route.path;
            this.currentNavItem =
                options.find((item) => currentPath.startsWith(item.route)) ||
                options[0] ||
                {};
        }
    }
};
</script>

<style lang="scss" scoped>
.app-navigation {
    position: relative;
    height: 100%;
    min-height: 0;
    flex: 0 0 auto;
    border-right: 1px solid var(--ph-border);
    background: var(--ph-sidebar);
    display: flex;
    z-index: 2;

    .navigation-view {
        height: 100%;
    }

    :deep(.panel-container) {
        overflow: hidden;
    }

    :deep(.template) {
        overflow: hidden;
    }

    :deep(.navigation-list) {
        height: 100%;
        overflow: hidden;
    }

    :deep(.list-view-container) {
        padding: 6px 8px;
        overflow-x: hidden;
        overflow-y: auto;
        scrollbar-width: thin;
        scrollbar-color: rgba(120, 130, 145, 0.35) transparent;
    }

    :deep(.list-view-container::-webkit-scrollbar) {
        width: 8px;
        height: 8px;
    }

    :deep(.list-view-container::-webkit-scrollbar-track) {
        background: transparent;
    }

    :deep(.list-view-container::-webkit-scrollbar-thumb) {
        border: 2px solid transparent;
        border-radius: 999px;
        background: rgba(120, 130, 145, 0.35);
        background-clip: padding-box;
    }

    :deep(.list-view-container::-webkit-scrollbar-thumb:hover) {
        background: rgba(120, 130, 145, 0.6);
        background-clip: padding-box;
    }

    :deep(.list-view-item) {
        border-radius: 6px;
    }

    :deep(.name) {
        font-size: 13px;
        font-weight: 500;
    }

    :deep(.list-view-item .ms-Icon) {
        color: var(--ph-accent);
        font-size: 16px;
    }

    :deep(.name.title) {
        color: var(--ph-text);
    }

    :deep(.list-view-item.header .name) {
        padding-left: 4px;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.06em;
        text-transform: uppercase;
    }
}
</style>