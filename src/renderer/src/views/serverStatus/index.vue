<template>
    <div class="page-stack server-status-page">
        <section class="status-summary">
            <article class="summary-card">
                <span class="summary-icon accent">
                    <i class="ms-Icon ms-Icon--Server"></i>
                </span>
                <div>
                    <span>{{ local('Enabled servers') }}</span>
                    <strong>{{ enabledServers }}</strong>
                    <small
                        >{{ servers.length }} {{ local('configured') }}</small
                    >
                </div>
            </article>
            <article class="summary-card">
                <span class="summary-icon success">
                    <i class="ms-Icon ms-Icon--Heart"></i>
                </span>
                <div>
                    <span>{{ local('Connected') }}</span>
                    <strong>{{ connectedServers }}</strong>
                    <small>{{ local('Live monitor state') }}</small>
                </div>
            </article>
            <article class="summary-card">
                <span class="summary-icon warning">
                    <i class="ms-Icon ms-Icon--SpeedHigh"></i>
                </span>
                <div>
                    <span>{{ local('Average load') }}</span>
                    <strong>{{ averageLoad }}%</strong>
                    <small>{{ local('Enabled servers') }}</small>
                </div>
            </article>
            <article class="summary-card">
                <span class="summary-icon violet">
                    <i class="ms-Icon ms-Icon--Frigid"></i>
                </span>
                <div>
                    <span>{{ local('Average temperature') }}</span>
                    <strong>{{
                        averageTemperature !== null
                            ? averageTemperature + '°C'
                            : '--'
                    }}</strong>
                    <small>{{
                        averageTemperature !== null
                            ? local('Updated recently')
                            : local('No temperature sensor')
                    }}</small>
                </div>
            </article>
        </section>

        <sectionCard
            :fill="false"
            :title="local('Status board')"
            :description="
                local(
                    'Monitor load, memory, disk, and network activity across your servers.'
                )
            "
        >
            <template #actions>
                <div class="board-actions">
                    <button
                        type="button"
                        class="live-chip"
                        :class="{ 'is-paused': !autoRefresh }"
                        :title="
                            autoRefresh
                                ? local('Pause auto refresh')
                                : local('Resume auto refresh')
                        "
                        @click="setAutoRefresh(!autoRefresh)"
                    >
                        <span></span>
                        {{ autoRefresh ? local('Live') : local('Paused') }}
                    </button>
                    <fv-button
                        :theme="resolvedTheme"
                        border-radius="8"
                        icon="Refresh"
                        style="height: 34px"
                        @click="refreshVisibleServers"
                    >
                        {{ local('Refresh') }}
                    </fv-button>
                </div>
            </template>

            <div class="server-card-grid">
                <article
                    v-for="server in enabledServerList"
                    :key="server.id"
                    class="server-card"
                    :class="server.status"
                    tabindex="0"
                    role="button"
                    @click="openServer(server)"
                    @keydown.enter="openServer(server)"
                    @keydown.space.prevent="openServer(server)"
                >
                    <header class="server-card-header">
                        <div class="server-title">
                            <span class="server-state"></span>
                            <div>
                                <strong>{{ server.name }}</strong>
                                <span
                                    >{{ server.username }}@{{
                                        server.address
                                    }}:{{ server.port }}</span
                                >
                            </div>
                        </div>
                        <div class="server-card-status">
                            <span
                                class="temperature-chip"
                                :title="local('Temp')"
                            >
                                <i class="ms-Icon ms-Icon--Thermometer"></i>
                                {{
                                    formatTemperature(
                                        server.metrics.temperature
                                    )
                                }}
                            </span>
                            <statusPill :status="server.status" />
                        </div>
                    </header>

                    <div class="metric-row">
                        <div class="metric-cell is-load">
                            <serverChart
                                type="load"
                                :theme="resolvedTheme"
                                :values="loadRingValues(server)"
                                :value="server.metrics.load1"
                            ></serverChart>
                            <span class="metric-name">{{ local('Load') }}</span>
                        </div>
                        <div class="metric-cell">
                            <serverChart
                                type="gauge"
                                :theme="resolvedTheme"
                                :value="server.metrics.cpu"
                                :label="local('CPU')"
                                :color="memoryColor(server.metrics.cpu)"
                            ></serverChart>
                            <span class="metric-name">{{ local('CPU') }}</span>
                        </div>
                        <div class="metric-cell">
                            <serverChart
                                type="gauge"
                                :theme="resolvedTheme"
                                :value="server.metrics.memory"
                                :label="local('Mem')"
                                :color="memoryColor(server.metrics.memory)"
                            ></serverChart>
                            <span class="metric-name">{{ local('Mem') }}</span>
                        </div>
                        <div class="metric-cell">
                            <serverChart
                                type="gauge"
                                :theme="resolvedTheme"
                                :value="server.metrics.swap"
                                :label="local('Swap')"
                                color="#8b5cf6"
                            ></serverChart>
                            <span class="metric-name">{{ local('Swap') }}</span>
                        </div>
                    </div>

                    <div class="traffic-grid">
                        <button
                            type="button"
                            class="traffic-flip"
                            :class="{
                                'is-flipped': isFlipped(server.id, 'net')
                            }"
                            @click="toggleFlip(server.id, 'net')"
                        >
                            <span class="flip-inner">
                                <span class="flip-face flip-front">
                                    <span class="flip-head">
                                        <i
                                            class="ms-Icon ms-Icon--SortUpDown"
                                        ></i>
                                        <span>{{ local('Net') }}</span>
                                        <small>/s</small>
                                    </span>
                                    <span class="flip-lines">
                                        <span
                                            ><i
                                                class="ms-Icon ms-Icon--Download"
                                            ></i
                                            >{{
                                                formatRate(
                                                    server.metrics.netInRate
                                                )
                                            }}</span
                                        >
                                        <span
                                            ><i
                                                class="ms-Icon ms-Icon--Upload"
                                            ></i
                                            >{{
                                                formatRate(
                                                    server.metrics.netOutRate
                                                )
                                            }}</span
                                        >
                                    </span>
                                </span>
                                <span class="flip-face flip-back">
                                    <span class="flip-head">
                                        <i
                                            class="ms-Icon ms-Icon--SortUpDown"
                                        ></i>
                                        <span>{{ local('Net') }}</span>
                                        <small>{{ local('Total') }}</small>
                                    </span>
                                    <span class="flip-lines">
                                        <span
                                            ><i
                                                class="ms-Icon ms-Icon--Download"
                                            ></i
                                            >{{
                                                formatBytes(
                                                    server.metrics.netInTotal
                                                )
                                            }}</span
                                        >
                                        <span
                                            ><i
                                                class="ms-Icon ms-Icon--Upload"
                                            ></i
                                            >{{
                                                formatBytes(
                                                    server.metrics.netOutTotal
                                                )
                                            }}</span
                                        >
                                    </span>
                                </span>
                            </span>
                        </button>
                        <button
                            type="button"
                            class="traffic-flip"
                            :class="{
                                'is-flipped': isFlipped(server.id, 'disk')
                            }"
                            @click="toggleFlip(server.id, 'disk')"
                        >
                            <span class="flip-inner">
                                <span class="flip-face flip-front">
                                    <span class="flip-head">
                                        <i
                                            class="ms-Icon ms-Icon--SortUpDown"
                                        ></i>
                                        <span>{{ local('Disk') }}</span>
                                        <small>/s</small>
                                    </span>
                                    <span class="flip-lines">
                                        <span
                                            ><i
                                                class="ms-Icon ms-Icon--Read"
                                            ></i
                                            >{{
                                                formatRate(
                                                    server.metrics.diskReadRate
                                                )
                                            }}</span
                                        >
                                        <span
                                            ><i
                                                class="ms-Icon ms-Icon--Edit"
                                            ></i
                                            >{{
                                                formatRate(
                                                    server.metrics.diskWriteRate
                                                )
                                            }}</span
                                        >
                                    </span>
                                </span>
                                <span class="flip-face flip-back">
                                    <span class="flip-head">
                                        <i
                                            class="ms-Icon ms-Icon--SortUpDown"
                                        ></i>
                                        <span>{{ local('Disk') }}</span>
                                        <small>{{ local('Total') }}</small>
                                    </span>
                                    <span class="flip-lines">
                                        <span
                                            ><i
                                                class="ms-Icon ms-Icon--Read"
                                            ></i
                                            >{{
                                                formatBytes(
                                                    server.metrics.diskReadTotal
                                                )
                                            }}</span
                                        >
                                        <span
                                            ><i
                                                class="ms-Icon ms-Icon--Edit"
                                            ></i
                                            >{{
                                                formatBytes(
                                                    server.metrics
                                                        .diskWriteTotal
                                                )
                                            }}</span
                                        >
                                    </span>
                                </span>
                            </span>
                        </button>
                    </div>

                    <div class="trend-block">
                        <div class="trend-heading">
                            <span>{{ local('Network trend') }}</span>
                            <strong>{{ local('Last 24 samples') }}</strong>
                        </div>
                        <serverChart
                            type="line"
                            :theme="resolvedTheme"
                            :series="server.history.trafficIn"
                            color="#10b981"
                        ></serverChart>
                    </div>

                    <footer class="server-card-footer">
                        <div>
                            <span>{{ local('Uptime') }}</span>
                            <strong
                                >{{ server.uptimeDays }}
                                {{ local('days') }}</strong
                            >
                        </div>
                        <div>
                            <span>{{ local('Last seen') }}</span>
                            <strong>{{
                                server.lastSeen
                                    ? formatDate(server.lastSeen)
                                    : local('Never')
                            }}</strong>
                        </div>
                        <fv-button
                            :theme="resolvedTheme"
                            border-radius="8"
                            style="width: 34px; height: 34px"
                            :title="local('Refresh')"
                            @click.stop="refreshServer(server.id)"
                        >
                            <i class="ms-Icon ms-Icon--Refresh"></i>
                        </fv-button>
                    </footer>
                </article>

                <div v-if="!enabledServerList.length" class="empty-state">
                    <i class="ms-Icon ms-Icon--Server"></i>
                    <strong>{{ local('No monitored servers') }}</strong>
                    <span>{{
                        local(
                            'Enable a server from the Servers page to show it here.'
                        )
                    }}</span>
                </div>
            </div>
        </sectionCard>
    </div>
</template>

<script>
import { mapActions, mapState } from 'pinia';

import sectionCard from '@/components/common/sectionCard.vue';
import serverChart from '@/components/common/serverChart.vue';
import statusPill from '@/components/common/statusPill.vue';
import { useAppConfigStore } from '@/stores/appConfig';
import { useServerStore } from '@/stores/servers';

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

const formatBytes = (value) => {
    const bytes = Number(value) || 0;
    if (bytes <= 0) return '0 B';
    const index = Math.min(
        Math.floor(Math.log(bytes) / Math.log(1024)),
        UNITS.length - 1
    );
    const scaled = bytes / Math.pow(1024, index);
    const digits = scaled >= 100 || index === 0 ? 0 : scaled >= 10 ? 1 : 2;
    return scaled.toFixed(digits) + ' ' + UNITS[index];
};

export default {
    name: 'ServerStatusView',
    components: {
        sectionCard,
        serverChart,
        statusPill
    },
    data() {
        return {
            flippedCards: []
        };
    },
    computed: {
        ...mapState(useAppConfigStore, [
            'resolvedTheme',
            'local',
            'formatDate'
        ]),
        ...mapState(useServerStore, [
            'servers',
            'enabledServers',
            'connectedServers',
            'averageLoad',
            'averageMemory',
            'averageTemperature',
            'autoRefresh',
            'pollSeconds'
        ]),
        enabledServerList() {
            return this.servers.filter((server) => server.enabled);
        }
    },
    mounted() {
        this.startAutoRefresh();
        if (this.enabledServerList.length) this.refreshAll();
    },
    beforeUnmount() {
        this.stopAutoRefresh();
    },
    methods: {
        ...mapActions(useServerStore, [
            'refreshServer',
            'refreshAll',
            'startAutoRefresh',
            'stopAutoRefresh',
            'setAutoRefresh'
        ]),
        refreshVisibleServers() {
            this.refreshAll();
        },
        openServer(server) {
            if (!server?.id) return;
            this.$router.push({
                name: 'server-detail',
                params: { id: server.id }
            });
        },
        loadRingValues(server) {
            const metrics = server.metrics || {};
            return [metrics.load1, metrics.load5, metrics.load15];
        },
        memoryColor(value) {
            if (value >= 85) return '#ef4444';
            if (value >= 70) return '#f59e0b';
            return '#10b981';
        },
        formatTemperature(value) {
            const number = Number(value);
            if (!Number.isFinite(number) || number <= 0) return '--';
            return number.toFixed(0) + '°C';
        },
        formatRate(value) {
            return formatBytes(value) + '/s';
        },
        formatBytes,
        isFlipped(id, kind) {
            return this.flippedCards.includes(id + ':' + kind);
        },
        toggleFlip(id, kind) {
            const key = id + ':' + kind;
            const next = new Set(this.flippedCards);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            this.flippedCards = Array.from(next);
        }
    }
};
</script>

<style lang="scss" scoped>
.server-status-page {
    min-height: 0;
    flex: 1;
    padding: 15px;
    box-sizing: border-box;
    overflow: auto;

    padding: 18px;
    border-radius: 18px;
    --servercat-panel: rgba(255, 255, 255, 0.9);
    --servercat-card: rgba(255, 255, 255, 0.94);
    --servercat-card-soft: rgba(242, 245, 249, 0.96);
    --servercat-border: rgba(31, 41, 55, 0.1);
    --servercat-text: #1f2937;
    --servercat-muted: #667085;
    --servercat-red: #d83b30;

    :global(:root[data-theme='dark']) & {
        background: #101216;
        --servercat-panel: #15171c;
        --servercat-card: #1c1f26;
        --servercat-card-soft: #22262e;
        --servercat-border: rgba(255, 255, 255, 0.095);
        --servercat-text: #f4f6f8;
        --servercat-muted: #8c95a3;
    }

    .status-summary {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 14px;
    }

    .summary-card {
        min-width: 0;
        padding: 18px;
        border: 1px solid var(--servercat-border);
        border-radius: 26px;
        background: var(--ph-card-gradient-porcelain);
        box-shadow: var(--ph-shadow-sm);
        display: flex;
        align-items: center;
        gap: 14px;

        &:nth-child(2) {
            background: var(--ph-card-gradient-rose);
        }

        &:nth-child(3) {
            background: var(--ph-card-gradient-mist);
        }

        &:nth-child(4) {
            background: var(--ph-card-gradient-sunset);
        }

        &:nth-child(2),
        &:nth-child(4) {
            > div span,
            > div small,
            > div strong {
                color: #202124;
            }
        }

        > div {
            min-width: 0;
            display: flex;
            flex-direction: column;

            span,
            small {
                @include nowrap;

                color: var(--servercat-muted);
            }

            span {
                font-size: 12px;
            }

            strong {
                margin: 4px 0 2px;
                color: var(--servercat-text);
                font-size: 23px;
                line-height: 1.2;
            }

            small {
                font-size: 10px;
            }
        }
    }

    .summary-icon {
        width: 42px;
        height: 42px;
        flex: 0 0 42px;
        border-radius: 50%;
        background: var(--ph-surface);
        color: var(--ph-text);
        display: grid;
        place-items: center;

        .ms-Icon {
            font-size: 18px;
        }

        &.accent {
            color: var(--ph-accent);
        }

        &.success {
            background: rgba(255, 239, 244, 0.9);
            color: #b52555;
        }

        &.warning {
            color: var(--ph-text-secondary);
        }

        &.violet {
            background: rgba(255, 239, 225, 0.9);
            color: #a54320;
        }
    }

    :deep(.section-card) {
        border-color: var(--servercat-border);
        background: var(--servercat-panel);
        box-shadow: none;

        .section-heading h2 {
            color: var(--servercat-text);
        }

        .section-heading p {
            color: var(--servercat-muted);
        }
    }

    .board-actions {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .live-chip {
        height: 28px;
        padding: 0 9px;
        font: inherit;
        cursor: pointer;
        border: 1px solid rgba(16, 185, 129, 0.28);
        border-radius: 999px;
        background: rgba(16, 185, 129, 0.09);
        color: #34d399;
        display: flex;
        align-items: center;
        gap: 7px;
        font-size: 11px;

        span {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: currentColor;
            box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.13);
        }

        &.is-paused {
            border-color: rgba(122, 131, 146, 0.32);
            background: rgba(122, 131, 146, 0.1);
            color: var(--servercat-muted);

            span {
                box-shadow: 0 0 0 3px rgba(122, 131, 146, 0.14);
            }
        }
    }

    .server-card-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(min(360px, 100%), 1fr));
        gap: 14px;
    }

    .server-card {
        min-width: 0;
        padding: 16px;
        border: 1px solid var(--servercat-border);
        border-radius: 26px;
        background: var(--ph-card-gradient-porcelain);
        box-shadow: var(--ph-shadow-sm);
        display: flex;
        flex-direction: column;
        gap: 14px;

        &.warning {
            border-color: rgba(245, 158, 11, 0.38);
        }

        &.offline {
            opacity: 0.68;
        }
    }

    .server-card-header {
        min-width: 0;
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
    }

    .server-card-status {
        flex: 0 0 auto;
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .temperature-chip {
        height: 24px;
        padding: 0 8px;
        border: 1px solid var(--servercat-border);
        border-radius: 999px;
        background: var(--servercat-card-soft);
        color: var(--servercat-muted);
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 11px;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;

        .ms-Icon {
            color: #f59e0b;
            font-size: 11px;
        }
    }

    .server-title {
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 10px;

        > div {
            min-width: 0;
            display: flex;
            flex-direction: column;
        }

        strong,
        span {
            @include nowrap;
        }

        strong {
            color: var(--servercat-text);
            font-size: 13px;
            font-weight: 600;
        }

        span {
            margin-top: 3px;
            color: var(--servercat-muted);
            font-size: 10px;
        }
    }

    .server-state {
        width: 9px;
        height: 9px;
        flex: 0 0 9px;
        border-radius: 50%;
        background: #10b981;
        box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.14);

        .warning & {
            background: #f59e0b;
            box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.14);
        }

        .offline & {
            background: var(--servercat-muted);
            box-shadow: 0 0 0 4px rgba(122, 131, 146, 0.14);
        }
    }

    .metric-row {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 8px;
    }

    .metric-cell {
        min-width: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 6px;

        .metric-name {
            color: var(--servercat-muted);
            font-size: 11px;
        }
    }

    .metric-cell.is-load {
        .server-chart {
            margin: 0 auto;
        }
    }

    .traffic-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
    }

    .traffic-flip {
        min-width: 0;
        height: 74px;
        padding: 0;
        border: 0;
        background: transparent;
        cursor: pointer;
        perspective: 800px;
        text-align: left;
    }

    .flip-inner {
        position: relative;
        width: 100%;
        height: 100%;
        display: block;
        transform-style: preserve-3d;
        transition: transform 0.5s cubic-bezier(0.4, 0.2, 0.2, 1);
    }

    .traffic-flip.is-flipped .flip-inner {
        transform: rotateY(180deg);
    }

    .flip-face {
        position: absolute;
        inset: 0;
        padding: 9px 10px;
        border: 1px solid var(--servercat-border);
        border-radius: 10px;
        background: var(--servercat-card-soft);
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 6px;
        backface-visibility: hidden;
        -webkit-backface-visibility: hidden;
    }

    .flip-back {
        transform: rotateY(180deg);
    }

    .flip-head {
        color: var(--servercat-muted);
        display: flex;
        align-items: center;
        gap: 5px;
        font-size: 10px;

        i {
            font-size: 11px;
        }

        small {
            margin-left: auto;
            color: var(--servercat-muted);
            font-size: 9px;
            opacity: 0.8;
        }
    }

    .flip-lines {
        display: flex;
        flex-direction: column;
        gap: 2px;

        span {
            min-width: 0;
            color: var(--servercat-text);
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            font-variant-numeric: tabular-nums;
            white-space: nowrap;

            i {
                width: 12px;
                color: var(--servercat-muted);
                font-size: 10px;
            }
        }
    }

    .trend-block {
        padding: 10px;
        border: 1px solid var(--servercat-border);
        border-radius: 12px;
        background: var(--servercat-card-soft);
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .trend-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;

        span {
            color: var(--servercat-muted);
            font-size: 11px;
        }

        strong {
            color: var(--servercat-muted);
            font-size: 9px;
            font-weight: 500;
        }
    }

    .server-card-footer {
        min-height: 36px;
        display: flex;
        align-items: center;
        gap: 14px;

        > div {
            min-width: 0;
            display: flex;
            flex-direction: column;
        }

        > div:first-child {
            flex: 0 0 auto;
        }

        > div:nth-child(2) {
            min-width: 0;
            flex: 1;
        }

        span {
            color: var(--servercat-muted);
            font-size: 9px;
        }

        strong {
            @include nowrap;

            margin-top: 2px;
            color: var(--servercat-text);
            font-size: 10px;
            font-weight: 500;
        }
    }

    .empty-state {
        min-height: 260px;
        border: 1px dashed var(--servercat-border);
        border-radius: 16px;
        color: var(--servercat-muted);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 8px;

        .ms-Icon {
            color: var(--servercat-red);
            font-size: 28px;
        }

        strong {
            color: var(--servercat-text);
            font-size: 13px;
        }

        span {
            max-width: 320px;
            font-size: 11px;
            line-height: 1.6;
            text-align: center;
        }
    }

    @media (max-width: 1180px) {
        .status-summary {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
    }

    @media (max-width: 720px) {
        .status-summary,
        .server-card-grid {
            grid-template-columns: 1fr;
        }

        .board-actions {
            align-items: flex-end;
            flex-direction: column;
        }
    }
}
</style>
