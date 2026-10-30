<template>
    <article class="server-memory-panel">
        <header class="panel-head">
            <span>
                <i class="ms-Icon ms-Icon--Memory"></i>
                {{ local('Memory') }}
            </span>
            <strong>{{ metrics.memory }}%</strong>
        </header>
        <div class="memory-metrics">
            <div>
                <span>{{ local('FREE') }}</span>
                <strong>{{ formatBytes(metrics.memoryFree) }}</strong>
            </div>
            <div>
                <span>{{ local('USED') }}</span>
                <strong>{{ formatBytes(metrics.memoryUsed) }}</strong>
            </div>
            <div>
                <span>{{ local('PAGE CACHE') }}</span>
                <strong>{{ formatBytes(metrics.pageCache) }}</strong>
            </div>
        </div>
        <div class="memory-meter">
            <span :style="{ width: clampPercent(metrics.memory) + '%' }"></span>
        </div>
    </article>
</template>

<script>
import { mapState } from 'pinia';

import { useAppConfigStore } from '@/stores/appConfig';

import { clampPercent, formatBytes } from '../utils/format';

export default {
    name: 'ServerMemoryPanel',
    props: {
        metrics: {
            type: Object,
            default: () => ({})
        }
    },
    computed: {
        ...mapState(useAppConfigStore, ['local'])
    },
    methods: {
        clampPercent,
        formatBytes
    }
};
</script>

<style lang="scss" scoped>
@use './panel' as panel;

.server-memory-panel {
    @include panel.card;

    .panel-head {
        @include panel.head;
    }

    .memory-metrics {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;

        > div {
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        span {
            color: var(--servercat-muted);
            font-size: 10px;
            font-weight: 800;
        }

        strong {
            color: var(--servercat-text);
            font-size: 18px;
            font-variant-numeric: tabular-nums;
        }
    }

    .memory-meter {
        height: 9px;
        margin-top: 14px;
        border-radius: 999px;
        background: rgba(148, 163, 184, 0.2);
        overflow: hidden;

        span {
            height: 100%;
            border-radius: inherit;
            background: #10b981;
            display: block;
        }
    }

    @media (max-width: 880px) {
        .memory-metrics {
            grid-template-columns: 1fr;
        }
    }
}
</style>