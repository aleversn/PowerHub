<template>
    <div class="page-stack local-monitor-page">
        <section-card
            :title="local('Local machine')"
            :description="
                local('Monitor this computer’s hardware and network activity.')
            "
        >
            <template #info>
                <button
                    type="button"
                    class="live-chip"
                    :class="{ paused: !autoRefresh }"
                    @click="toggleRefresh"
                >
                    <span></span
                    >{{ autoRefresh ? local('Live') : local('Paused') }}
                </button>
            </template>
            <template #actions>
                <div class="monitor-actions">
                    <fv-button
                        :theme="resolvedTheme"
                        :background="subColor"
                        border-radius="8"
                        style="width: 34px; height: 34px"
                        :disabled="loading"
                        :title="local('Refresh')"
                        @click="refresh"
                    >
                        <i class="ms-Icon ms-Icon--Refresh"></i>
                    </fv-button>
                </div>
            </template>

            <div v-if="error" class="monitor-error" role="alert">
                {{ local('Could not collect local metrics.') }} {{ error }}
            </div>
            <div v-if="!snapshot && loading" class="monitor-message">
                {{ local('Collecting local metrics…') }}
            </div>
            <template v-if="snapshot">
                <header class="machine-heading">
                    <div class="machine-identity">
                        <span
                            class="machine-state"
                            :class="{ paused: !autoRefresh }"
                        ></span>
                        <div class="machine-name">
                            <strong>{{
                                snapshot.system.hostname ||
                                local('Local machine')
                            }}</strong>
                            <span>{{
                                [
                                    snapshot.system.platform,
                                    snapshot.system.release
                                ]
                                    .filter(Boolean)
                                    .join(' · ') || local('Local machine')
                            }}</span>
                            <small
                                >{{ local('Last updated') }}:
                                {{ formatDate(snapshot.collectedAt) }}</small
                            >
                        </div>
                    </div>
                    <div class="machine-badges">
                        <span class="temperature-chip"
                            ><i class="ms-Icon ms-Icon--Sunny"></i
                            >{{ local('CPU temperature') }}
                            {{ degrees(snapshot.cpu.temperature) }}</span
                        >
                        <span class="machine-chip"
                            ><i class="ms-Icon ms-Icon--PC1"></i
                            >{{ local('Local machine') }}</span
                        >
                    </div>
                </header>
                <div v-if="snapshot.errors.length" class="monitor-warning">
                    {{ local('Some metrics could not be collected.') }}
                </div>
                <div class="summary-grid">
                    <article
                        v-for="item in summary"
                        :key="item.label"
                        class="metric-card"
                    >
                        <div class="metric-heading">
                            <i :class="'ms-Icon ms-Icon--' + item.icon"></i
                            ><span>{{ local(item.label) }}</span>
                        </div>
                        <div class="metric-content">
                            <div class="metric-copy">
                                <strong>{{ percentage(item.progress) }}</strong>
                                <small :title="item.detail">{{
                                    item.detail
                                }}</small>
                            </div>
                            <server-chart
                                v-if="item.progress !== null"
                                :value="item.progress"
                                :color="item.color"
                                :theme="resolvedTheme"
                                :label="local(item.label)"
                            ></server-chart>
                            <div v-else class="empty-gauge" aria-hidden="true">
                                —
                            </div>
                        </div>
                    </article>
                </div>
                <div class="detail-grid">
                    <section class="detail-card">
                        <div class="card-heading">
                            <i
                                class="ms-Icon ms-Icon--ConnectVirtualMachine"
                            ></i
                            ><strong>{{ local('Network activity') }}</strong>
                        </div>
                        <div class="rate-grid">
                            <div>
                                <span>{{ local('Download') }}</span
                                ><strong>{{
                                    rate(snapshot.network.download)
                                }}</strong>
                            </div>
                            <div>
                                <span>{{ local('Upload') }}</span
                                ><strong>{{
                                    rate(snapshot.network.upload)
                                }}</strong>
                            </div>
                        </div>
                        <div
                            v-if="snapshot.network.interfaces.length"
                            class="data-list"
                        >
                            <div
                                v-for="network in snapshot.network.interfaces"
                                :key="network.name"
                                class="data-row"
                            >
                                <span class="item-name">{{
                                    network.name
                                }}</span>
                                <span
                                    >↓ {{ rate(network.download) }} · ↑
                                    {{ rate(network.upload) }}</span
                                >
                            </div>
                        </div>
                        <p v-else class="unavailable">
                            {{ local('No network information available.') }}
                        </p>
                    </section>
                    <section class="detail-card">
                        <div class="card-heading">
                            <i class="ms-Icon ms-Icon--Processing"></i
                            ><strong>{{ local('Graphics') }}</strong>
                        </div>
                        <div
                            v-if="snapshot.gpus.length"
                            class="data-list gpu-list"
                        >
                            <div
                                v-for="(gpu, index) in snapshot.gpus"
                                :key="index"
                                class="gpu-row"
                            >
                                <strong>{{
                                    gpu.name || local('Graphics processor')
                                }}</strong>
                                <div class="data-row">
                                    <span>{{ local('Utilization') }}</span
                                    ><span>{{
                                        percentage(gpu.utilization)
                                    }}</span>
                                </div>
                                <div class="data-row">
                                    <span>{{ local('Temperature') }}</span
                                    ><span>{{ degrees(gpu.temperature) }}</span>
                                </div>
                                <div class="data-row">
                                    <span>{{ local('Video memory') }}</span
                                    ><span>{{
                                        memoryUsage(
                                            gpu.memoryUsed,
                                            gpu.memoryTotal
                                        )
                                    }}</span>
                                </div>
                            </div>
                        </div>
                        <p v-else class="unavailable">
                            {{ local('No graphics information available.') }}
                        </p>
                    </section>
                    <section class="detail-card disk-card">
                        <div class="card-heading">
                            <i class="ms-Icon ms-Icon--HardDrive"></i
                            ><strong>{{ local('Disk storage') }}</strong>
                        </div>
                        <div class="disk-rates">
                            <span
                                >{{ local('Read') }}:
                                {{ rate(snapshot.diskIo.read) }}</span
                            ><span
                                >{{ local('Write') }}:
                                {{ rate(snapshot.diskIo.write) }}</span
                            >
                        </div>
                        <div v-if="snapshot.disks.length" class="disk-list">
                            <div
                                v-for="disk in snapshot.disks"
                                :key="disk.name + disk.filesystem"
                                class="disk-row"
                            >
                                <div class="data-row">
                                    <strong
                                        class="item-name"
                                        :title="disk.filesystem"
                                        >{{ disk.name }}</strong
                                    ><span
                                        >{{ percentage(disk.usage) }} ·
                                        {{
                                            memoryUsage(disk.used, disk.size)
                                        }}</span
                                    >
                                </div>
                                <div
                                    v-if="disk.usage !== null"
                                    class="meter"
                                    aria-hidden="true"
                                >
                                    <span
                                        :style="{ width: disk.usage + '%' }"
                                    ></span>
                                </div>
                            </div>
                        </div>
                        <p v-else class="unavailable">
                            {{ local('No disk information available.') }}
                        </p>
                    </section>
                </div>
                <p class="sensor-note">
                    {{
                        local(
                            'Hardware readings depend on your operating system and available sensors. Unavailable readings are shown as —.'
                        )
                    }}
                </p>
            </template>
        </section-card>
    </div>
</template>

<script>
import { mapState } from 'pinia';
import sectionCard from '@/components/common/sectionCard.vue';
import serverChart from '@/components/common/serverChart.vue';
import { useAppConfigStore } from '@/stores/appConfig';
import { useThemeStore } from '@/stores/theme';

export default {
    name: 'LocalMonitorView',
    components: { sectionCard, serverChart },
    data() {
        return {
            snapshot: null,
            error: '',
            loading: false,
            autoRefresh: true,
            timer: null,
            alive: false
        };
    },
    computed: {
        ...mapState(useAppConfigStore, [
            'local',
            'resolvedTheme',
            'formatDate'
        ]),
        ...mapState(useThemeStore, ['color', 'subColor']),
        summary() {
            const { cpu, memory, gpus, disks } = this.snapshot;
            const gpu =
                gpus.find((item) => item.utilization !== null) || gpus[0];
            const disk = disks.find((item) => item.usage !== null) || disks[0];
            return [
                {
                    label: 'CPU',
                    icon: 'Processing',
                    detail: cpu.name || this.local('Unavailable'),
                    progress: cpu.usage,
                    color: this.color
                },
                {
                    label: 'Memory',
                    icon: 'Server',
                    detail: this.memoryUsage(memory.used, memory.total),
                    progress: memory.usage,
                    color: '#10b981'
                },
                {
                    label: 'GPU utilization',
                    icon: 'Video',
                    detail: gpu?.name || this.local('Unavailable'),
                    progress: gpu?.utilization ?? null,
                    color: this.color
                },
                {
                    label: 'Disk storage',
                    icon: 'HardDrive',
                    detail: disk
                        ? `${disk.name} · ${this.memoryUsage(disk.used, disk.size)}`
                        : this.local('Unavailable'),
                    progress: disk?.usage ?? null,
                    color: '#e98753'
                }
            ];
        }
    },
    mounted() {
        this.alive = true;
        this.refresh();
    },
    beforeUnmount() {
        this.alive = false;
        clearTimeout(this.timer);
    },
    methods: {
        async refresh() {
            if (this.loading) return;
            clearTimeout(this.timer);
            this.loading = true;
            try {
                if (!window.api?.localMetrics?.get)
                    throw new Error(
                        this.local(
                            'Local metrics are unavailable in this environment.'
                        )
                    );
                const snapshot = await window.api.localMetrics.get();
                if (this.alive) {
                    this.snapshot = snapshot;
                    this.error = '';
                }
            } catch (error) {
                if (this.alive) this.error = error?.message || String(error);
            } finally {
                this.loading = false;
                if (this.alive && this.autoRefresh)
                    this.timer = setTimeout(() => this.refresh(), 5000);
            }
        },
        toggleRefresh() {
            this.autoRefresh = !this.autoRefresh;
            clearTimeout(this.timer);
            if (this.autoRefresh) this.refresh();
        },
        percentage(value) {
            return value === null || value === undefined
                ? '—'
                : `${Number(value).toFixed(1)}%`;
        },
        degrees(value) {
            return value === null || value === undefined
                ? '—'
                : `${Number(value).toFixed(1)} °C`;
        },
        size(value) {
            if (value === null || value === undefined) return '—';
            const units = ['B', 'KB', 'MB', 'GB', 'TB'];
            let size = Number(value);
            let index = 0;
            while (size >= 1024 && index < units.length - 1) {
                size /= 1024;
                index += 1;
            }
            return `${size.toFixed(index ? 1 : 0)} ${units[index]}`;
        },
        rate(value) {
            return value === null || value === undefined
                ? '—'
                : `${this.size(value)}/s`;
        },
        memoryUsage(used, total) {
            if (used === null || used === undefined)
                return total === null || total === undefined
                    ? '—'
                    : this.size(total);
            return `${this.size(used)} / ${this.size(total)}`;
        }
    }
};
</script>

<style lang="scss" scoped>
.local-monitor-page {
    position: relative;
    width: 100%;
    min-height: 0;
    flex: 1;
    box-sizing: border-box;
    padding: 18px;
    overflow: hidden;
    --local-accent: #8881ee;

    .monitor-actions {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    .live-chip {
        height: 28px;
        padding: 0 9px;
        border: 1px solid rgba(16, 185, 129, 0.28);
        border-radius: 999px;
        background: rgba(16, 185, 129, 0.09);
        color: #10b981;
        display: flex;
        align-items: center;
        gap: 7px;
        cursor: pointer;
        font-size: 11px;
        span {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: currentColor;
            box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.13);
        }
        &.paused {
            border-color: var(--ph-border);
            color: var(--ph-text-muted);
            background: var(--ph-surface-soft);
        }
    }
    .machine-heading {
        min-width: 0;
        padding: 18px;
        margin-bottom: 14px;
        border: 1px solid var(--ph-border-subtle);
        border-radius: 22px;
        background: var(--ph-card-gradient-porcelain);
        box-shadow: var(--ph-shadow-sm);
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
    }
    .machine-identity {
        min-width: 0;
        display: flex;
        align-items: flex-start;
        gap: 12px;
    }
    .machine-state {
        width: 9px;
        height: 9px;
        margin-top: 8px;
        flex: 0 0 9px;
        border-radius: 50%;
        background: #10b981;
        box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.14);
    }
    .machine-state.paused {
        background: var(--ph-text-muted);
        box-shadow: none;
    }
    .machine-name {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 5px;
    }
    .machine-name strong,
    .machine-name span,
    .machine-name small,
    .item-name {
        @include nowrap;
        min-width: 0;
    }
    .machine-name strong {
        color: var(--ph-text);
        font-size: 18px;
    }
    .machine-name span,
    .machine-name small,
    .sensor-note,
    .unavailable {
        color: var(--ph-text-muted);
        font-size: 11px;
    }
    .machine-badges {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 8px;
    }
    .temperature-chip,
    .machine-chip {
        min-height: 28px;
        padding: 0 10px;
        border: 1px solid var(--ph-border);
        border-radius: 999px;
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        font-weight: 600;
        white-space: nowrap;
    }
    .temperature-chip {
        color: var(--ph-warning);
    }
    .machine-chip {
        background: var(--ph-surface-soft);
        color: var(--ph-text-muted);
    }
    .summary-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 14px;
    }
    .metric-card,
    .detail-card {
        min-width: 0;
        padding: 16px;
        border: 1px solid var(--ph-border-subtle);
        border-radius: 22px;
        background: var(--ph-card-gradient-mist);
        box-shadow: var(--ph-shadow-sm);
    }
    .metric-card {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }
    .metric-heading,
    .card-heading {
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--ph-text-muted);
        font-size: 11px;
        font-weight: 700;
    }
    .metric-heading i,
    .card-heading i {
        color: var(--local-accent);
        font-size: 16px;
    }
    .metric-content {
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 8px;
    }
    .metric-copy {
        min-width: 0;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 6px;
    }
    .metric-copy strong {
        color: var(--ph-text);
        font-size: 23px;
        line-height: 1.15;
        font-variant-numeric: tabular-nums;
    }
    .metric-copy small {
        @include nowrap;
        color: var(--ph-text-muted);
        font-size: 10px;
    }
    .metric-content :deep(.server-chart),
    .empty-gauge {
        flex: 0 0 72px;
        margin: 0;
    }
    .empty-gauge {
        width: 72px;
        height: 72px;
        border: 7px solid var(--ph-border);
        border-radius: 50%;
        box-sizing: border-box;
        display: grid;
        place-items: center;
        color: var(--ph-text-muted);
        font-size: 14px;
    }
    .meter {
        height: 8px;
        overflow: hidden;
        border-radius: 999px;
        background: var(--ph-border);
    }
    .meter span {
        height: 100%;
        display: block;
        border-radius: inherit;
        background: #10b981;
    }
    .detail-grid {
        margin-top: 14px;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
    }
    .detail-card {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }
    .card-heading strong {
        color: var(--ph-text);
        font-size: 12px;
    }
    .rate-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
    }
    .rate-grid > div {
        min-width: 0;
        padding: 12px;
        border-radius: 18px;
        background: var(--ph-status-block);
        display: flex;
        flex-direction: column;
        gap: 6px;
    }
    .rate-grid span,
    .data-row,
    .disk-rates {
        color: var(--ph-text-muted);
        font-size: 11px;
    }
    .rate-grid strong {
        color: var(--ph-matrix-text);
        font-size: 18px;
        font-variant-numeric: tabular-nums;
        overflow-wrap: anywhere;
    }
    .data-list,
    .disk-list,
    .gpu-row,
    .disk-row {
        display: flex;
        flex-direction: column;
        gap: 8px;
        min-width: 0;
    }
    .data-row {
        min-width: 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
    }
    .data-row > :last-child {
        flex-shrink: 0;
        text-align: right;
    }
    .gpu-row + .gpu-row {
        padding-top: 12px;
        border-top: 1px solid var(--ph-border-subtle);
    }
    .gpu-row > strong,
    .disk-row strong {
        color: var(--ph-text);
        font-size: 12px;
        overflow-wrap: anywhere;
    }
    .disk-card {
        grid-column: 1 / -1;
    }
    .disk-rates {
        display: flex;
        gap: 16px;
        flex-wrap: wrap;
    }
    .sensor-note {
        line-height: 1.6;
    }
    .monitor-error,
    .monitor-warning {
        margin-bottom: 12px;
        padding: 10px 12px;
        border-radius: 8px;
        background: var(--ph-surface-soft);
        color: var(--ph-danger);
        font-size: 12px;
        overflow-wrap: anywhere;
    }
    .monitor-warning {
        color: var(--ph-warning);
    }
    .monitor-message {
        padding: 40px 0;
        color: var(--ph-text-muted);
    }
    @media (max-width: 1180px) {
        .summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
    }
    @media (max-width: 640px) {
        .summary-grid,
        .detail-grid {
            grid-template-columns: minmax(0, 1fr);
        }
        .machine-heading {
            flex-direction: column;
        }
        .machine-badges {
            justify-content: flex-start;
        }
        .disk-card {
            grid-column: auto;
        }
        .data-row {
            flex-wrap: wrap;
        }
    }
}
</style>
