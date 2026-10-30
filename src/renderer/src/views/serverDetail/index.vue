<template>
    <div class="page-stack server-detail-page">
        <sectionCard
            :title="local('Server Detail')"
            :description="local('Inspect CPU, memory, GPU, network, and disk details for one server.')"
        >
            <template #actions>
                <div class="detail-actions">
                    <fv-button
                        :theme="resolvedTheme"
                        border-radius="8"
                        icon="BackToWindow"
                        style="height: 34px"
                        @click="goBack"
                    >
                        {{ local('Back') }}
                    </fv-button>
                    <button
                        type="button"
                        class="live-chip"
                        :class="{ 'is-paused': !autoRefresh }"
                        :title="autoRefresh ? local('Pause auto refresh') : local('Resume auto refresh')"
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
                        :disabled="isServerLoading(serverId)"
                        @click="refreshServer(serverId)"
                    >
                        {{ local('Refresh') }}
                    </fv-button>
                </div>
            </template>

            <div v-if="server" class="detail-shell">
                <header class="server-hero">
                    <div class="hero-title">
                        <span class="server-state" :class="server.status"></span>
                        <div>
                            <h1>{{ displayName }}</h1>
                            <p>{{ server.os }}</p>
                            <small>{{ server.username }}@{{ server.address }}{{ server.port === 22 ? '' : ':' + server.port }}</small>
                        </div>
                    </div>
                    <div class="hero-side">
                        <span class="temperature-chip" :title="local('Temp')">
                            <i class="ms-Icon ms-Icon--Thermometer"></i>
                            {{ formatTemperature(metrics.temperature) }}
                        </span>
                        <statusPill :status="server.status" />
                    </div>
                </header>

                <section class="detail-grid">
                    <article class="panel-card cpu-panel">
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
                    <article class="panel-card memory-panel">
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
                            <span :style="{ width: ringValue(metrics.memory) + '%' }"></span>
                        </div>
                    </article>

                    <article class="panel-card gpu-panel">
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
                                    <span>{{ local('VRAM') }} {{ formatBytes(gpu.memoryUsed) }}/{{ formatBytes(gpu.memoryTotal) }}</span>
                                </div>
                                <div class="gpu-usage">
                                    <span
                                        v-for="cell in gpuCells(gpu)"
                                        :key="cell"
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

                    <article class="panel-card network-panel">
                        <header class="panel-head">
                            <span>
                                <i class="ms-Icon ms-Icon--Network"></i>
                                {{ local('Network') }}
                            </span>
                            <strong>{{ formatBytes(metrics.netInTotal + metrics.netOutTotal) }}</strong>
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
                                    <span><small>{{ local('TOTAL') }}</small>{{ formatBytes(item.txTotal + item.rxTotal) }}</span>
                                </div>
                                <div class="network-ring" :style="ringStyle(item)">
                                    <span></span>
                                </div>
                            </div>
                        </div>
                        <button v-if="virtualInterfaces.length" type="button" class="virtual-toggle" @click="showVirtual = !showVirtual">
                            <span>{{ local('Virtual interfaces') }}</span>
                            <strong>{{ virtualInterfaces.length }}</strong>
                            <i class="ms-Icon" :class="showVirtual ? 'ms-Icon--ChevronUp' : 'ms-Icon--ChevronDown'"></i>
                        </button>
                    </article>
                    <article class="panel-card disk-panel">
                        <header class="panel-head">
                            <span>
                                <i class="ms-Icon ms-Icon--HardDrive"></i>
                                {{ local('Disk') }}
                            </span>
                            <strong>{{ disks.length }}</strong>
                        </header>
                        <div class="disk-list">
                            <div v-for="disk in disks" :key="disk.id" class="disk-row">
                                <div class="disk-info">
                                    <div class="disk-title">
                                        <strong>{{ disk.mount }}</strong>
                                        <span>{{ disk.filesystem }}</span>
                                    </div>
                                    <div class="disk-usage-text">
                                        {{ formatBytes(disk.used) }} / {{ formatBytes(disk.size) }}
                                    </div>
                                    <div class="disk-io">
                                        <div>
                                            <span>{{ local('R') }}</span>
                                            <strong>{{ formatRate(deviceReadRate(disk)) }}</strong>
                                        </div>
                                        <div>
                                            <span>{{ local('W') }}</span>
                                            <strong>{{ formatRate(deviceWriteRate(disk)) }}</strong>
                                        </div>
                                        <div>
                                            <span>{{ local('IOPS') }}</span>
                                            <strong>{{ deviceReadIops(disk) }}/{{ deviceWriteIops(disk) }}</strong>
                                        </div>
                                        <div>
                                            <span>{{ local('WAIT') }}</span>
                                            <strong>{{ deviceReadWait(disk) }}/{{ deviceWriteWait(disk) }}</strong>
                                        </div>
                                    </div>
                                </div>
                                <div class="disk-meter">
                                    <div class="disk-meter-track">
                                        <span :class="{ 'is-warn': disk.usage >= 80 }" :style="{ height: ringValue(disk.usage) + '%' }"></span>
                                    </div>
                                    <strong>{{ Math.round(disk.usage) }}%</strong>
                                </div>
                            </div>
                            <div v-if="!disks.length" class="empty-panel">{{ local('No disk data') }}</div>
                        </div>
                    </article>
                </section>
            </div>

            <div v-else class="empty-state">
                <i class="ms-Icon ms-Icon--Server"></i>
                <strong>{{ local('Server not found') }}</strong>
                <span>{{ local('The selected server is no longer available.') }}</span>
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
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), UNITS.length - 1);
    const scaled = bytes / Math.pow(1024, index);
    const digits = scaled >= 100 || index === 0 ? 0 : scaled >= 10 ? 1 : 2;
    return scaled.toFixed(digits) + ' ' + UNITS[index];
};

export default {
    name: 'ServerDetailView',
    components: {
        sectionCard,
        serverChart,
        statusPill
    },
    data() {
        return {
            showVirtual: false
        };
    },
    computed: {
        ...mapState(useAppConfigStore, ['resolvedTheme', 'local']),
        ...mapState(useServerStore, ['serverById', 'autoRefresh', 'pollSeconds']),
        serverId() {
            return String(this.$route.params.id || '');
        },
        server() {
            return this.serverById[this.serverId] || null;
        },
        metrics() {
            return this.server?.metrics || {};
        },
        displayName() {
            return this.server?.hostname || this.server?.name || this.local('Untitled server');
        },
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
        },
        gpus() {
            return this.metrics.gpus || [];
        },
        disks() {
            return this.metrics.disks || [];
        },
        visibleInterfaces() {
            const interfaces = this.metrics.netInterfaces || [];
            return this.showVirtual ? interfaces : interfaces.filter((item) => !item.virtual);
        },
        virtualInterfaces() {
            return (this.metrics.netInterfaces || []).filter((item) => item.virtual);
        }
    },
    mounted() {
        this.startAutoRefresh();
        if (this.server?.enabled) this.refreshServer(this.serverId);
    },
    beforeUnmount() {
        this.stopAutoRefresh();
    },
    methods: {
        ...mapActions(useServerStore, [
            'refreshServer',
            'startAutoRefresh',
            'stopAutoRefresh',
            'setAutoRefresh',
            'isServerLoading'
        ]),
        goBack() {
            this.$router.push({ name: 'server-status' });
        },
        ringValue(value) {
            return Math.min(Math.max(Number(value) || 0, 0), 100);
        },
        formatPercent(value) {
            return Math.round(Number(value) || 0) + ' %';
        },
        formatRate(value) {
            return formatBytes(value) + '/s';
        },
        formatBytes,
        formatTemperature(value) {
            const number = Number(value);
            if (!Number.isFinite(number) || number <= 0) return '--';
            return number.toFixed(0) + '°C';
        },
        formatUptime(value) {
            const seconds = Number(value) || 0;
            const days = Math.floor(seconds / 86400);
            const hours = Math.floor((seconds % 86400) / 3600);
            if (days > 0) return days + ' ' + this.local('days') + ' ' + hours + ' H';
            const minutes = Math.floor((seconds % 3600) / 60);
            return hours + ' H ' + minutes + ' M';
        },
        gpuCells(gpu) {
            const total = Math.max(Number(gpu.memoryTotal) || 0, 1);
            const used = Math.max(Number(gpu.memoryUsed) || 0, 0);
            const ratio = Math.min(Math.max(used / total, 0), 1);
            const lit = Math.round(ratio * 36);
            return Array.from({ length: 36 }, (_, index) => ({
                on: index < lit,
                warn: index < lit && ratio > 0.82
            }));
        },
        ringStyle(item) {
            const ratio = this.ringValue(item.txRatio || 0);
            return {
                background: 'conic-gradient(#f59e0b 0 ' + ratio + '%, #10b981 ' + ratio + '% 100%)'
            };
        },
        deviceFor(disk) {
            const devices = this.metrics.diskDevices || [];
            const filesystem = String(disk.filesystem || '').replace('/dev/', '');
            return (
                devices.find((device) => filesystem.startsWith(device.name)) ||
                devices.find((device) => device.whole) ||
                devices[0] ||
                {}
            );
        },
        deviceReadRate(disk) {
            return this.deviceFor(disk).readRate;
        },
        deviceWriteRate(disk) {
            return this.deviceFor(disk).writeRate;
        },
        deviceReadIops(disk) {
            return this.deviceFor(disk).readIops || 0;
        },
        deviceWriteIops(disk) {
            return this.deviceFor(disk).writeIops || 0;
        },
        deviceReadWait(disk) {
            return this.deviceFor(disk).readWaitMs || 0;
        },
        deviceWriteWait(disk) {
            return this.deviceFor(disk).writeWaitMs || 0;
        }
    }
};
</script>
<style lang="scss" scoped>
.server-detail-page {
    padding: 18px;
    border-radius: 18px;
    background: #f6f8fb;
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

    .detail-actions {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .live-chip {
        height: 34px;
        padding: 0 12px;
        border: 1px solid var(--servercat-border);
        border-radius: 8px;
        background: rgba(16, 185, 129, 0.1);
        color: #10b981;
        display: flex;
        align-items: center;
        gap: 7px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;

        span {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: currentColor;
            box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.12);
        }

        &.is-paused {
            background: rgba(148, 163, 184, 0.12);
            color: var(--servercat-muted);

            span {
                box-shadow: none;
            }
        }
    }

    .detail-shell {
        display: flex;
        flex-direction: column;
        gap: 14px;
    }

    .server-hero {
        padding: 16px;
        border: 1px solid var(--servercat-border);
        border-radius: 14px;
        background: var(--servercat-card);
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
    }

    .hero-title {
        min-width: 0;
        display: flex;
        align-items: flex-start;
        gap: 12px;

        > div {
            min-width: 0;
        }

        h1 {
            margin: 0;
            color: var(--servercat-text);
            font-size: 28px;
            line-height: 1.15;
        }

        p {
            margin: 3px 0 0;
            color: var(--servercat-text);
            font-size: 13px;
        }

        small {
            margin-top: 6px;
            color: var(--servercat-muted);
            display: block;
            font-size: 11px;
        }
    }

    .server-state {
        width: 9px;
        height: 9px;
        margin-top: 9px;
        flex: 0 0 9px;
        border-radius: 50%;
        background: #10b981;

        &.warning {
            background: #f59e0b;
        }

        &.offline {
            background: #94a3b8;
        }
    }

    .hero-side {
        flex: 0 0 auto;
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .temperature-chip {
        height: 28px;
        padding: 0 9px;
        border: 1px solid var(--servercat-border);
        border-radius: 999px;
        color: #f59e0b;
        display: flex;
        align-items: center;
        gap: 5px;
        font-size: 11px;
        font-weight: 700;
    }

    .detail-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 14px;
    }

    .panel-card {
        min-width: 0;
        padding: 14px;
        border: 1px solid var(--servercat-border);
        border-radius: 14px;
        background: var(--servercat-card);
        box-shadow: var(--ph-shadow-sm);
    }

    .panel-head {
        margin-bottom: 12px;
        color: var(--servercat-muted);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;

        span {
            display: flex;
            align-items: center;
            gap: 6px;
        }

        strong {
            color: var(--servercat-text);
            font-variant-numeric: tabular-nums;
        }
    }
    .cpu-panel {
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
    }

    .memory-panel {
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
    }
    .gpu-panel {
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
        }
    }

    .network-panel {
        .network-list {
            display: flex;
            flex-direction: column;
        }

        .network-row {
            min-width: 0;
            padding: 10px 0;
            border-bottom: 1px solid var(--servercat-border);
            display: grid;
            grid-template-columns: minmax(120px, 0.9fr) minmax(260px, 2fr) 42px;
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
            grid-template-columns: repeat(3, minmax(0, 1fr));
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
    }
    .disk-panel {
        .disk-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .disk-row {
            padding: 12px;
            border: 1px solid var(--servercat-border);
            border-radius: 12px;
            background: var(--servercat-card-soft);
            display: grid;
            grid-template-columns: minmax(0, 1fr) 72px;
            align-items: stretch;
            gap: 14px;
        }

        .disk-info {
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .disk-title {
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 3px;

            strong {
                @include nowrap;

                color: var(--servercat-text);
                font-size: 14px;
            }

            span {
                @include nowrap;

                color: var(--servercat-muted);
                font-size: 11px;
            }
        }

        .disk-usage-text {
            color: var(--servercat-muted);
            font-size: 11px;
            font-variant-numeric: tabular-nums;
        }

        .disk-io {
            margin-top: 2px;
            padding-top: 9px;
            border-top: 1px solid var(--servercat-border);
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 10px;

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
            }

            strong {
                color: var(--servercat-text);
                font-size: 12px;
                font-variant-numeric: tabular-nums;
            }
        }

        .disk-meter {
            min-width: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-end;
            gap: 6px;

            strong {
                color: var(--servercat-text);
                font-size: 11px;
                font-variant-numeric: tabular-nums;
            }
        }

        .disk-meter-track {
            position: relative;
            width: 26px;
            height: 84px;
            border-radius: 8px;
            background: rgba(148, 163, 184, 0.22);
            overflow: hidden;

            span {
                position: absolute;
                right: 0;
                bottom: 0;
                left: 0;
                border-radius: 8px 8px 0 0;
                background: #10b981;
                transition: height 0.3s ease;

                &.is-warn {
                    background: #ef4444;
                }
            }
        }
    }

    .empty-panel {
        min-height: 54px;
        border: 1px dashed var(--servercat-border);
        border-radius: 10px;
        color: var(--servercat-muted);
        display: grid;
        place-items: center;
        font-size: 11px;
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

    @media (max-width: 880px) {
        .server-hero,
        .detail-actions {
            align-items: stretch;
            flex-direction: column;
        }

        .cpu-panel .cpu-legend,
        .cpu-panel .cpu-footer,
        .memory-panel .memory-metrics,
        .gpu-panel .gpu-row,
        .network-panel .network-row,
        .disk-panel .disk-row,
        .disk-panel .disk-io {
            grid-template-columns: 1fr;
        }

        .gpu-temp,
        .disk-usage-text {
            text-align: left;
        }

        .disk-meter {
            align-items: center;
        }
    }
}
</style>
