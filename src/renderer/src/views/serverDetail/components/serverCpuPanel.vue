<template>
    <article class="server-cpu-panel">
        <header class="cpu-summary">
            <div class="cpu-total">
                <strong>{{ formatNumber(metrics.cpu) }}</strong>
                <span>%</span>
            </div>
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
        </header>
        <div class="cpu-matrix" :style="matrixStyle">
            <span
                v-for="cell in cpuCells"
                :key="cell.key"
                class="cpu-cell"
                :class="cell.className"
                :title="cell.title"
            ></span>
        </div>
        <footer class="cpu-footer">
            <div class="cpu-footer-metric">
                <span>{{ local('CORES') }}</span>
                <strong>{{ cores }}</strong>
            </div>
            <div class="cpu-footer-metric">
                <span>{{ local('IDLE') }}</span>
                <strong>{{ formatPercent(cpuBreakdown.idle) }}</strong>
            </div>
            <div class="cpu-footer-metric">
                <span>{{ local('UPTIME') }}</span>
                <strong>{{ formatUptime(metrics.uptimeSeconds || server.uptimeDays * 86400) }}</strong>
            </div>
            <div class="cpu-footer-metric">
                <span>{{ local('LOAD') }}</span>
                <strong>{{ formatLoad(metrics.load1Raw || metrics.load1) }},{{ formatLoad(metrics.load5Raw || metrics.load5) }},{{ formatLoad(metrics.load15Raw || metrics.load15) }}</strong>
            </div>
            <serverChart
                class="cpu-load-chart"
                type="load"
                :theme="resolvedTheme"
                :values="loadRingValues"
                :value="Number(metrics.load1) || 0"
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
        cores() {
            const count = Number(this.metrics.cores) || this.metrics.cpuCores?.length || 1;
            return Math.max(Math.round(count), 1);
        },
        coreCount() {
            return Math.max(this.metrics.cpuCores?.length || Number(this.metrics.cores) || 1, 1);
        },
        frames() {
            const historyFrames = Array.isArray(this.server?.history?.cpuCores)
                ? this.server.history.cpuCores
                : [];
            const frames = historyFrames.filter((frame) => Array.isArray(frame) && frame.length);
            if (frames.length) return frames.slice(-this.matrixRows);
            return this.metrics.cpuCores?.length ? [this.metrics.cpuCores] : [];
        },
        fallbackCoreFrame() {
            const usage = Number(this.metrics.cpu) || 0;
            return Array.from({ length: this.coreCount }, (_, index) => ({
                id: String(index),
                usage,
                user: Number(this.cpuBreakdown.user) || 0,
                system: Number(this.cpuBreakdown.system) || 0,
                iowait: Number(this.cpuBreakdown.iowait) || 0,
                steal: Number(this.cpuBreakdown.steal) || 0,
                idle: Number(this.cpuBreakdown.idle) || 100
            }));
        },
        matrixRows() {
            return 24;
        },
        cpuCells() {
            const rows = this.matrixRows;
            const frames = this.frames;
            const offset = rows - frames.length;
            const cells = [];
            for (let row = 0; row < rows; row += 1) {
                const frame = frames[row - offset] || null;
                for (let coreIndex = 0; coreIndex < this.coreCount; coreIndex += 1) {
                    const core = frame?.[coreIndex] || null;
                    cells.push({
                        key: coreIndex + '-' + row,
                        className: this.cpuCellClass(core || {}),
                        title:
                            this.local('CPU') +
                            ' ' +
                            (core?.id ?? coreIndex) +
                            ': ' +
                            this.formatNumber(core?.usage) +
                            '%'
                    });
                }
            }
            return cells;
        },
        matrixStyle() {
            return {
                '--cpu-columns': String(this.coreCount),
                '--cpu-rows': String(this.matrixRows)
            };
        },
        loadRingValues() {
            return [this.metrics.load1, this.metrics.load5, this.metrics.load15];
        }
    },
    methods: {
        formatPercent,
        formatLoad(value) {
            const number = Number(value) || 0;
            return number.toFixed(1).replace(/\.0$/, '');
        },
        formatNumber(value) {
            const number = Number(value) || 0;
            return Number.isInteger(number) ? String(number) : String(Math.round(number * 10) / 10);
        },
        cpuCellClass(core = {}) {
            const usage = Number(core.usage) || 0;
            if (usage <= 0) return 'is-off';
            const user = Number(core.user) || 0;
            const system = Number(core.system) || 0;
            const iowait = Number(core.iowait) || 0;
            const steal = Number(core.steal) || 0;
            const active = Math.max(user, system, iowait, steal);
            if (active <= 0) return usage >= 60 ? 'is-high' : 'is-low';
            if (active === system) return 'is-sys';
            if (active === iowait) return 'is-iowait';
            if (active === steal) return 'is-steal';
            return 'is-user';
        },
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

    .cpu-summary {
        display: flex;
        align-items: center;
        gap: 20px;
    }

    .cpu-total {
        display: flex;
        align-items: baseline;
        gap: 2px;
        min-width: 84px;

        strong {
            color: var(--servercat-text);
            font-size: 40px;
            font-weight: 800;
            line-height: 1;
            font-variant-numeric: tabular-nums;
        }

        span {
            color: var(--servercat-text);
            font-size: 18px;
            font-weight: 700;
        }
    }

    .cpu-legend {
        flex: 1;
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

    .cpu-matrix {
        margin-top: 16px;
        gap: 5px;
        display: flex;
        flex-wrap: wrap;
    }

    .cpu-cell {
        width: 5px;
        height: 12px;
        border-radius: 6px;
        background: rgba(148, 163, 184, 0.22);

        &.is-off {
            background: rgba(148, 163, 184, 0.22);
        }

        &.is-user {
            background: #10b981;
        }

        &.is-sys {
            background: #ef4444;
        }

        &.is-iowait {
            background: #a855f7;
        }

        &.is-steal {
            background: #eab308;
        }

        &.is-low {
            background: #10b981;
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

    .cpu-load-chart {
        justify-self: end;
    }

    @media (max-width: 880px) {
        .cpu-summary {
            flex-direction: column;
            align-items: stretch;
        }

        .cpu-legend,
        .cpu-footer {
            grid-template-columns: 1fr;
        }
    }
}</style>