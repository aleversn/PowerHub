<template>
    <article class="server-cpu-panel">
        <header class="panel-head">
            <span>
                <i class="ms-Icon ms-Icon--SpeedHigh"></i>
                {{ local('CPU') }}
            </span>
            <strong>{{ metrics.cpu }}%</strong>
        </header>
        <div class="cpu-legend">
            <span class="cpu-legend-item is-sys">
                <i></i>
                <small>{{ local('SYS') }}</small>
                <strong>{{ formatPercent(cpuBreakdown.system) }}</strong>
            </span>
            <span class="cpu-legend-item is-user">
                <i></i>
                <small>{{ local('USER') }}</small>
                <strong>{{ formatPercent(cpuBreakdown.user) }}</strong>
            </span>
            <span class="cpu-legend-item is-iowait">
                <i></i>
                <small>{{ local('IO WAIT') }}</small>
                <strong>{{ formatPercent(cpuBreakdown.iowait) }}</strong>
            </span>
            <span class="cpu-legend-item is-steal">
                <i></i>
                <small>{{ local('STEAL') }}</small>
                <strong>{{ formatPercent(cpuBreakdown.steal) }}</strong>
            </span>
        </div>
        <div class="cpu-strips">
            <span
                v-for="cell in cpuCells"
                :key="cell.key"
                class="cpu-cell"
                :class="cell.className"
                :title="cell.title"
            ></span>
        </div>
        <footer class="cpu-footer">
            <div>
                <span>{{ local('CORES') }}</span>
                <strong>{{ metrics.cores }}</strong>
            </div>
            <div>
                <span>{{ local('IDLE') }}</span>
                <strong>{{ formatPercent(cpuBreakdown.idle) }}</strong>
            </div>
            <div>
                <span>{{ local('UPTIME') }}</span>
                <strong>{{ formatUptime(metrics.uptimeSeconds || server.uptimeDays * 86400) }}</strong>
            </div>
            <div>
                <span>{{ local('LOAD') }}</span>
                <strong>{{ metrics.load1 }}%</strong>
            </div>
            <serverChart
                type="load"
                :theme="resolvedTheme"
                :values="loadRingValues"
                :value="metrics.load1"
            ></serverChart>
        </footer>
    </article>
</template>

<script>
import { mapState } from 'pinia';

import serverChart from '@/components/common/serverChart.vue';
import { useAppConfigStore } from '@/stores/appConfig';

import { formatPercent } from '../utils/format';

export default {
    name: 'ServerCpuPanel',
    components: {
        serverChart
    },
    props: {
        server: {
            type: Object,
            required: true
        },
        metrics: {
            type: Object,
            default: () => ({})
        }
    },
    computed: {
        ...mapState(useAppConfigStore, ['resolvedTheme', 'local']),
        cpuBreakdown() {
            return this.metrics.cpuBreakdown || {};
        },
        cpuCells() {
            const cores = this.metrics.cpuCores?.length
                ? this.metrics.cpuCores
                : Array.from({ length: Math.max(Number(this.metrics.cores) || 1, 1) }, (_, index) => ({
                      id: String(index),
                      usage: this.metrics.cpu || 0
                  }));
            return cores.flatMap((core) =>
                Array.from({ length: 4 }, (_, index) => {
                    const threshold = (index + 1) * 25;
                    const usage = Number(core.usage) || 0;
                    const level = usage > 85 ? 'is-high' : usage > 60 ? 'is-mid' : 'is-low';
                    return {
                        key: String(core.id) + '-' + index,
                        className: usage >= threshold ? level : 'is-off',
                        title: this.local('CPU') + ' ' + core.id + ': ' + Math.round(usage) + '%'
                    };
                })
            );
        },
        loadRingValues() {
            return [this.metrics.load1, this.metrics.load5, this.metrics.load15];
        }
    },
    methods: {
        formatPercent,
        formatUptime(value) {
            const seconds = Number(value) || 0;
            const days = Math.floor(seconds / 86400);
            const hours = Math.floor((seconds % 86400) / 3600);
            if (days > 0) return days + ' ' + this.local('days') + ' ' + hours + ' H';
            const minutes = Math.floor((seconds % 3600) / 60);
            return hours + ' H ' + minutes + ' M';
        }
    }
};
</script>

<style lang="scss" scoped>
@use './panel' as panel;

.server-cpu-panel {
    @include panel.card;

    .panel-head {
        @include panel.head;
    }

    .cpu-legend {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 8px;
    }

    .cpu-legend-item {
        min-width: 0;
        display: grid;
        grid-template-columns: 10px minmax(0, 1fr) auto;
        align-items: center;
        gap: 6px;

        i {
            width: 7px;
            height: 18px;
            border-radius: 4px;
            background: currentColor;
        }

        small {
            @include nowrap;

            color: var(--servercat-muted);
            font-size: 10px;
            font-weight: 800;
        }

        strong {
            color: var(--servercat-text);
            font-size: 13px;
            font-variant-numeric: tabular-nums;
        }

        &.is-sys {
            color: #ef4444;
        }

        &.is-user {
            color: #10b981;
        }

        &.is-iowait {
            color: #a855f7;
        }

        &.is-steal {
            color: #eab308;
        }
    }

    .cpu-strips {
        margin-top: 13px;
        gap: 5px;
        display: flex;
        flex-wrap: wrap;
    }

    .cpu-cell {
        width: 5px;
        height: 12px;
        border-radius: 4px;
        background: rgba(148, 163, 184, 0.24);

        &.is-low {
            background: #10b981;
        }

        &.is-mid {
            background: #eab308;
        }

        &.is-high {
            background: #ef4444;
        }
    }

    .cpu-footer {
        margin-top: 16px;
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr)) 72px;
        align-items: center;
        gap: 12px;

        > div {
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 3px;
        }

        span {
            color: var(--servercat-muted);
            font-size: 9px;
            font-weight: 800;
            letter-spacing: 0.04em;
        }

        strong {
            color: var(--servercat-text);
            font-size: 15px;
            font-variant-numeric: tabular-nums;
        }
    }

    @media (max-width: 880px) {
        .cpu-legend,
        .cpu-footer {
            grid-template-columns: 1fr;
        }
    }
}
</style>