<template>
    <header class="app-header">
        <div class="app-header-left">
            <div class="page-heading">
                <h1>{{ pageTitle }}</h1>
                <p>{{ pageDescription }}</p>
            </div>
        </div>

        <div class="app-header-actions">
            <div class="status-chip">
                <span></span>
                {{ local('Local scheduler') }}
            </div>
            <fv-button
                :theme="resolvedTheme"
                border-radius="8"
                style="width: 36px; height: 36px"
                :title="
                    isDark
                        ? local('Light')
                        : local('Dark')
                "
                @click="toggleTheme"
            >
                <i
                    class="ms-Icon"
                    :class="
                        isDark
                            ? 'ms-Icon--Sunny'
                            : 'ms-Icon--ClearNight'
                    "
                ></i>
            </fv-button>
        </div>
    </header>
</template>

<script>
import { mapActions, mapState } from 'pinia';

import { useAppConfigStore } from '@/stores/appConfig';

export default {
    name: 'AppHeader',
    computed: {
        ...mapState(useAppConfigStore, [
            'resolvedTheme',
            'isDark',
            'local'
        ]),
        pageTitle() {
            return this.local(this.$route.meta?.title || 'Run overview');
        },
        pageDescription() {
            return this.local(this.$route.meta?.description || '');
        }
    },
    methods: {
        ...mapActions(useAppConfigStore, ['toggleTheme'])
    }
};
</script>

<style lang="scss" scoped>
.app-header {
    min-height: 80px;
    padding: 14px 22px;
    backdrop-filter: blur(18px);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;

    .ms-Icon {
        color: var(--ph-text-secondary);
        font-size: 16px;
    }

    .app-header-left,
    .app-header-actions {
        display: flex;
        align-items: center;
    }

    .app-header-left {
        min-width: 0;
        gap: 12px;
    }

    .app-header-actions {
        flex-shrink: 0;
        gap: 10px;
    }

    .page-heading {
        min-width: 0;

        h1 {
            @include nowrap;

            margin: 0;
            color: var(--ph-text);
            font-size: 20px;
            font-weight: 500;
            line-height: 1.25;
        }

        p {
            @include nowrap;

            margin: 4px 0 0;
            color: var(--ph-text-secondary);
            font-size: 12px;
            line-height: 1.4;
        }
    }

    .status-chip {
        height: 32px;
        padding: 0 10px;
        border: 1px solid var(--ph-border);
        border-radius: 999px;
        background: var(--ph-surface-soft);
        color: var(--ph-text-secondary);
        display: flex;
        align-items: center;
        gap: 7px;
        font-size: 11px;

        span {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: var(--ph-success);
            box-shadow: 0 0 0 3px rgba(16, 124, 16, 0.12);
        }
    }

    @media (max-width: 640px) {
        align-items: flex-start;
        flex-direction: column;

        .app-header-actions {
            width: 100%;
            justify-content: flex-end;
        }

        .status-chip {
            display: none;
        }
    }
}
</style>
