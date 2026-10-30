<template>
    <aside class="app-navigation" :class="{ collapsed }">
        <div class="app-navigation-brand">
            <div class="brand-mark">
                <span></span>
                <span></span>
                <span></span>
            </div>
            <div class="brand-copy">
                <strong>{{ appName }}</strong>
                <span>{{ local('API scheduling and run monitoring') }}</span>
            </div>
        </div>

        <nav class="app-navigation-links" aria-label="Primary">
            <router-link
                v-for="item in navigationItems"
                :key="item.name"
                :to="{ name: item.name }"
                class="navigation-link"
            >
                <i class="ms-Icon" :class="item.icon"></i>
                <span>{{ local(item.label) }}</span>
            </router-link>
        </nav>

        <div class="app-navigation-footer">
            <div class="footer-icon">
                <i class="ms-Icon ms-Icon--CloudDownload"></i>
            </div>
            <div class="footer-copy">
                <strong>{{ local('Demo data') }}</strong>
                <span>{{ local('Local workspace') }}</span>
            </div>
        </div>
    </aside>
</template>

<script>
import { mapState } from 'pinia';

import { useAppConfigStore } from '@/stores/appConfig';

export default {
    name: 'AppNavigation',
    data() {
        return {
            navigationItems: [
                {
                    name: 'dashboard',
                    label: 'Overview',
                    icon: 'ms-Icon--Home'
                },
                {
                    name: 'endpoints',
                    label: 'Endpoints',
                    icon: 'ms-Icon--LightningBolt'
                },
                {
                    name: 'schedules',
                    label: 'Schedules',
                    icon: 'ms-Icon--DateTime'
                },
                {
                    name: 'runs',
                    label: 'Run history',
                    icon: 'ms-Icon--History'
                },
                {
                    name: 'settings',
                    label: 'Settings',
                    icon: 'ms-Icon--Settings'
                }
            ]
        };
    },
    computed: {
        ...mapState(useAppConfigStore, ['config', 'appName', 'local']),
        collapsed() {
            return this.config.sidebarCollapsed;
        }
    }
};
</script>

<style lang="scss" scoped>
.app-navigation {
    width: 260px;
    flex: 0 0 260px;
    min-height: 0;
    padding: 18px 14px;
    border-right: 1px solid var(--ph-border);
    background: var(--ph-sidebar);
    display: flex;
    flex-direction: column;
    gap: 18px;
    transition:
        width 180ms ease,
        flex-basis 180ms ease;

    &.collapsed {
        width: 76px;
        flex-basis: 76px;

        .brand-copy,
        .navigation-link span,
        .footer-copy {
            display: none;
        }

        .app-navigation-brand,
        .navigation-link,
        .app-navigation-footer {
            justify-content: center;
        }
    }

    .app-navigation-brand {
        min-height: 52px;
        padding: 8px;
        border-radius: 14px;
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .brand-mark {
        width: 36px;
        height: 36px;
        flex: 0 0 36px;
        border-radius: 11px;
        background: var(--ph-brand-gradient);
        display: grid;
        grid-template-columns: repeat(2, 8px);
        grid-template-rows: repeat(2, 8px);
        place-content: center;
        gap: 3px;
        box-shadow: 0 8px 22px rgba(89, 82, 205, 0.26);

        span {
            border-radius: 3px;
            background: rgba(255, 255, 255, 0.94);

            &:first-child {
                grid-row: span 2;
            }
        }
    }

    .brand-copy {
        min-width: 0;
        display: flex;
        flex-direction: column;

        strong {
            color: var(--ph-text);
            font-size: 16px;
            line-height: 1.35;
        }

        span {
            @include nowrap;

            margin-top: 2px;
            color: var(--ph-text-muted);
            font-size: 11px;
        }
    }

    .app-navigation-links {
        min-height: 0;
        display: flex;
        flex-direction: column;
        gap: 5px;
        overflow-y: auto;
    }

    .navigation-link {
        position: relative;
        min-height: 42px;
        padding: 0 12px;
        border-radius: 10px;
        color: var(--ph-text-secondary);
        text-decoration: none;
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 13px;
        transition:
            background 160ms ease,
            color 160ms ease;

        .ms-Icon {
            width: 18px;
            flex: 0 0 18px;
            text-align: center;
            font-size: 16px;
        }

        &:hover {
            background: var(--ph-surface-hover);
            color: var(--ph-text);
        }

        &.router-link-active {
            background: var(--ph-accent-soft);
            color: var(--ph-accent);

            &::before {
                position: absolute;
                left: 0;
                width: 3px;
                height: 18px;
                border-radius: 0 3px 3px 0;
                background: var(--ph-accent);
                content: '';
            }
        }
    }

    .app-navigation-footer {
        margin-top: auto;
        padding: 11px;
        border: 1px solid var(--ph-border);
        border-radius: 12px;
        background: var(--ph-surface-soft);
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .footer-icon {
        width: 32px;
        height: 32px;
        flex: 0 0 32px;
        border-radius: 9px;
        background: var(--ph-accent-soft);
        color: var(--ph-accent);
        display: grid;
        place-items: center;
    }

    .footer-copy {
        min-width: 0;
        display: flex;
        flex-direction: column;

        strong {
            color: var(--ph-text);
            font-size: 12px;
        }

        span {
            @include nowrap;

            color: var(--ph-text-muted);
            font-size: 10px;
        }
    }

    @media (max-width: 880px) {
        width: 76px;
        flex-basis: 76px;

        .brand-copy,
        .navigation-link span,
        .footer-copy {
            display: none;
        }

        .app-navigation-brand,
        .navigation-link,
        .app-navigation-footer {
            justify-content: center;
        }
    }
}
</style>
