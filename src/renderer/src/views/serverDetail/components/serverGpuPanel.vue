<template>
    <article class="server-gpu-panel">
        <header class="panel-head">
            <span>
                <i class="ms-Icon ms-Icon--PC1"></i>
                {{ local('GPU') }}
            </span>
            <strong>{{ gpus.length }}</strong>
        </header>
        <div v-if="gpus.length" class="gpu-list">
            <div v-for="gpu in gpus" :key="gpu.id" class="gpu-row">
                <div class="gpu-title">
                    <strong>{{ gpu.name }}</strong>
                    <span>
                        {{ local('VRAM') }} {{ formatBytes(gpu.memoryUsed) }}/{{ formatBytes(gpu.memoryTotal) }}
                    </span>
                </div>
                <div class="gpu-usage">
                    <span
                        v-for="(cell, index) in gpuCells(gpu)"
                        :key="index"
                        class="gpu-cell"
                        :class="{ 'is-on': cell.on, 'is-warn': cell.warn }"
                    ></span>
                </div>
                <div class="gpu-temp" :class="{ 'is-hot': gpu.temperature >= 75 }">
                    {{ formatTemperature(gpu.temperature) }}
                </div>
            </div>
        </div>
        <div v-else class="empty-panel">{{ local('No GPU detected') }}</div>
    </article>
</template>

<script>
import { mapState } from 'pinia';

import { useAppConfigStore } from '@/stores/appConfig';

import { formatBytes, formatTemperature } from '../utils/format';

export default {
    name: 'ServerGpuPanel',
    props: {
        gpus: {
            type: Array,
            default: () => []
        }
    },
    computed: {
        ...mapState(useAppConfigStore, ['local'])
    },
    methods: {
        formatBytes,
        formatTemperature,
        gpuCells(gpu) {
            const total = Math.max(Number(gpu.memoryTotal) || 0, 1);
            const used = Math.max(Number(gpu.memoryUsed) || 0, 0);
            const ratio = Math.min(Math.max(used / total, 0), 1);
            const lit = Math.round(ratio * 36);
            return Array.from({ length: 36 }, (_, index) => ({
                on: index < lit,
                warn: index < lit && ratio > 0.82
            }));
        }
    }
};
</script>

<style lang="scss" scoped>
@use './panel' as panel;

.server-gpu-panel {
    @include panel.card;

    .panel-head {
        @include panel.head;
    }

    .gpu-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .gpu-row {
        display: grid;
        grid-template-columns: minmax(160px, 0.9fr) minmax(220px, 2fr) 58px;
        align-items: center;
        gap: 14px;
    }

    .gpu-title {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 3px;

        strong {
            @include nowrap;

            color: var(--servercat-text);
            font-size: 13px;
        }

        span {
            color: var(--servercat-muted);
            font-size: 10px;
        }
    }

    .gpu-usage {
        gap: 5px;
        display: flex;
        flex-wrap: wrap;
    }

    .gpu-cell {
        width: 5px;
        height: 12px;
        border-radius: 4px;
        background: rgba(148, 163, 184, 0.25);

        &.is-on {
            background: #10b981;
        }

        &.is-warn {
            background: #ef4444;
        }
    }

    .gpu-temp {
        color: #f59e0b;
        font-size: 13px;
        font-weight: 700;
        text-align: right;

        &.is-hot {
            color: #ef4444;
        }
    }

    .empty-panel {
        @include panel.empty;
    }

    @media (max-width: 880px) {
        .gpu-row {
            grid-template-columns: 1fr;
        }

        .gpu-temp {
            text-align: left;
        }
    }
}
</style>