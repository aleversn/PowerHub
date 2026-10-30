<template>
    <article class="server-network-panel">
        <header class="panel-head">
            <span>
                <i class="ms-Icon ms-Icon--Network"></i>
                {{ local('Network') }}
            </span>
            <span class="network-summary">
                <span>
                    <small>{{ local('TOTAL UP') }}</small>
                    {{ formatBytes(metrics.netOutTotal) }}
                </span>
                <span>
                    <small>{{ local('TOTAL DOWN') }}</small>
                    {{ formatBytes(metrics.netInTotal) }}
                </span>
            </span>
        </header>
        <div class="network-list">
            <div v-for="item in visibleInterfaces" :key="item.name" class="network-row">
                <div class="network-title">
                    <i class="ms-Icon" :class="item.virtual ? 'ms-Icon--Cloud' : 'ms-Icon--Ethernet'"></i>
                    <strong>{{ item.name }}</strong>
                </div>
                <div class="network-values">
                    <span><small>{{ local('UP') }}</small>{{ formatRate(item.txRate) }}</span>
                    <span><small>{{ local('DOWN') }}</small>{{ formatRate(item.rxRate) }}</span>
                    <span><small>{{ local('TOTAL UP') }}</small>{{ formatBytes(item.txTotal) }}</span>
                    <span><small>{{ local('TOTAL DOWN') }}</small>{{ formatBytes(item.rxTotal) }}</span>
                </div>
                <div class="network-ring" :style="ringStyle(item)">
                    <span></span>
                </div>
            </div>
            <div v-if="!visibleInterfaces.length" class="empty-panel">{{ local('No network data') }}</div>
        </div>
        <button v-if="virtualInterfaces.length" type="button" class="virtual-toggle" @click="showVirtual = !showVirtual">
            <span>{{ local('Virtual interfaces') }}</span>
            <strong>{{ virtualInterfaces.length }}</strong>
            <i class="ms-Icon" :class="showVirtual ? 'ms-Icon--ChevronUp' : 'ms-Icon--ChevronDown'"></i>
        </button>
    </article>
</template>

<script>
import { mapState } from 'pinia';

import { useAppConfigStore } from '@/stores/appConfig';

import { clampPercent, formatBytes, formatRate } from '../utils/format';

export default {
    name: 'ServerNetworkPanel',
    props: {
        metrics: {
            type: Object,
            default: () => ({})
        }
    },
    data() {
        return {
            showVirtual: false
        };
    },
    computed: {
        ...mapState(useAppConfigStore, ['local']),
        interfaces() {
            return this.metrics.netInterfaces || [];
        },
        visibleInterfaces() {
            return this.showVirtual ? this.interfaces : this.interfaces.filter((item) => !item.virtual);
        },
        virtualInterfaces() {
            return this.interfaces.filter((item) => item.virtual);
        }
    },
    methods: {
        formatBytes,
        formatRate,
        ringStyle(item) {
            const ratio = clampPercent(item.txRatio || 0);
            return {
                background: 'conic-gradient(#f59e0b 0 ' + ratio + '%, #10b981 ' + ratio + '% 100%)'
            };
        }
    }
};
</script>

<style lang="scss" scoped>
@use './panel' as panel;

.server-network-panel {
    @include panel.card;

    .panel-head {
        @include panel.head;

        .network-summary {
            display: flex;
            align-items: center;
            gap: 16px;

            > span {
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                gap: 2px;
                color: var(--servercat-text);
                font-size: 13px;
                font-weight: 700;
                font-variant-numeric: tabular-nums;
                white-space: nowrap;
            }

            small {
                color: var(--servercat-muted);
                font-size: 9px;
                font-weight: 800;
                letter-spacing: 0.04em;
            }
        }
    }

    .network-list {
        display: flex;
        flex-direction: column;
    }

    .network-row {
        min-width: 0;
        padding: 10px 0;
        border-bottom: 1px solid var(--servercat-border);
        display: grid;
        grid-template-columns: minmax(120px, 0.9fr) minmax(320px, 2.4fr) 42px;
        align-items: center;
        gap: 12px;
    }

    .network-title {
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 7px;

        i {
            color: #10b981;
        }

        strong {
            @include nowrap;

            color: var(--servercat-text);
            font-size: 13px;
        }
    }

    .network-values {
        min-width: 0;
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 8px;

        span {
            min-width: 0;
            color: var(--servercat-text);
            display: flex;
            flex-direction: column;
            gap: 3px;
            font-size: 12px;
            font-variant-numeric: tabular-nums;
        }

        small {
            color: var(--servercat-muted);
            font-size: 9px;
            font-weight: 800;
        }
    }

    .network-ring {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        display: grid;
        place-items: center;

        span {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: var(--servercat-card);
            display: block;
        }
    }

    .virtual-toggle {
        width: 100%;
        padding: 12px 0 0;
        border: 0;
        background: transparent;
        color: var(--servercat-muted);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;

        strong {
            margin-left: auto;
            color: var(--servercat-text);
        }
    }

    .empty-panel {
        @include panel.empty;

        margin-top: 6px;
    }

    @media (max-width: 880px) {
        .network-row {
            grid-template-columns: 1fr;
        }
    }
}
</style>