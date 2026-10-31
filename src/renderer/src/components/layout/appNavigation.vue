<template>
    <aside class="app-navigation" :class="{ dark: resolvedTheme === 'dark' }">
        <fv-navigation-view
            v-model="currentNavItem"
            :title="''"
            :theme="resolvedTheme"
            :options="navigationOptions"
            :expand="!collapsed"
            :expand-width="260"
            :compact-width="50"
            :flyout-display="880"
            :full-size-display="0"
            :mobile-display="640"
            background="transparent"
            :foreground="'rgba(211, 230, 110, 1)'"
            :show-back="false"
            :show-search="false"
            :setting-title="local('Settings')"
            class="navigation-view"
            @item-click="onItemClick"
            @setting-click="openSettings"
            @expand-change="onExpandChange"
        >
            <template v-slot:banner>
                <div class="banner">
                    <img :src="imgs.logo" alt="logo" />
                    <p>{{ appName }}</p>
                </div>
            </template>
            <template #listItem="{ item, valueTrigger }">
                <div class="custom-list-view-item">
                    <span
                        v-if="item.image"
                        class="nav-icon"
                        :class="{ selected: currentNavItem.key === item.key }"
                    >
                        <img :src="item.image" alt="" />
                    </span>
                    <div
                        class="nav-text"
                        :class="{
                            header: valueTrigger(item.type) === 'header',
                            selected: currentNavItem.key === item.key
                        }"
                    >
                        {{ valueTrigger(item.name) }}
                    </div>
                </div>
            </template>
        </fv-navigation-view>
    </aside>
</template>

<script>
import { mapActions, mapState } from 'pinia';

import logo from '@/assets/logo_acrylic.png';
import homeIcon from '@/assets/nav/home.svg';
import apiIcon from '@/assets/nav/api.svg';
import variableIcon from '@/assets/nav/variable.svg';
import calendarIcon from '@/assets/nav/calendar.svg';
import recentIcon from '@/assets/nav/recent.svg';
import monitorIcon from '@/assets/nav/monitor.svg';
import serverIcon from '@/assets/nav/server.svg';

import { useAppConfigStore } from '@/stores/appConfig';
import { useThemeStore } from '@/stores/theme';

export default {
    name: 'AppNavigation',
    data() {
        return {
            currentNavItem: {},
            imgs: {
                logo
            }
        };
    },
    computed: {
        ...mapState(useAppConfigStore, [
            'appName',
            'config',
            'local',
            'resolvedTheme'
        ]),
        ...mapState(useThemeStore, ['theme', 'color', 'subColor']),
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
                    image: homeIcon,
                    route: '/dashboard'
                },
                {
                    key: 'endpoints',
                    name: () => this.local('Endpoints'),
                    image: apiIcon,
                    route: '/endpoints'
                },
                {
                    key: 'variables',
                    name: () => this.local('Variables'),
                    image: variableIcon,
                    route: '/variables'
                },
                {
                    key: 'schedules',
                    name: () => this.local('Schedules'),
                    image: calendarIcon,
                    route: '/schedules'
                },
                {
                    key: 'runs',
                    name: () => this.local('Run history'),
                    image: recentIcon,
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
                    image: monitorIcon,
                    route: '/server-status'
                },
                {
                    key: 'servers',
                    name: () => this.local('Servers'),
                    image: serverIcon,
                    route: '/servers'
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
    display: flex;
    z-index: 2;

    .navigation-view {
        height: 100%;
    }

    .banner {
        position: relative;
        gap: 12px;
        padding: 5px 12px;
        display: flex;
        align-items: center;
        user-select: none;

        p {
            font-size: 13px;
            font-weight: 600;
            color: rgba(153, 158, 162, 1);
            letter-spacing: 0.06em;
            text-transform: uppercase;
        }

        img {
            width: 25px;
            height: 25px;
            object-fit: contain;
            display: flex;
            align-items: center;
            justify-content: center;
        }
    }

    .custom-list-view-item {
        @include Vcenter;

        width: 100%;
        height: 100%;
        padding: 0px 5px;
        gap: 15px;

        .nav-icon {
            width: 20px;
            height: 100%;
            flex: 0 0 20px;
            display: flex;
            align-items: center;
            justify-content: center;

            img {
                width: 18px;
                height: 18px;
                object-fit: contain;
                filter: brightness(200%) saturate(100%) invert(48%);
                transition: filter 140ms ease;
                opacity: 0.5;
            }

            &.selected img {
                filter: brightness(0) saturate(100%);
                opacity: 1;
            }
        }

        .nav-text {
            flex: 1;
            font-size: 12px;

            &.header {
                font-size: 12px;
                color: rgba(30, 30, 30, 0.8);
            }

            &.selected {
                font-weight: bold;
            }
        }
    }

    &.dark {
        .custom-list-view-item {
            .nav-icon.selected {
                position: relative;

                img {
                    position: relative;
                    filter: invert(100%);
                }
            }

            .nav-text {
                color: rgba(255, 255, 255, 0.8);
            }
        }

        .banner {
            p {
                color: whitesmoke;
            }
        }
    }
}
</style>
