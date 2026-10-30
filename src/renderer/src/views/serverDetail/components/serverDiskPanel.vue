<template>
    <article class="server-disk-panel">
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
                        <span
                            :class="{ 'is-warn': disk.usage >= 80 }"
                            :style="{ height: clampPercent(disk.usage) + '%' }"
                        ></span>
                    </div>
                    <strong>{{ Math.round(disk.usage) }}%</strong>
                </div>
            </div>
            <div v-if="!disks.length" class="empty-panel">{{ local('No disk data') }}</div>
        </div>
    </article>
</template>

<script>
import { mapState } from 'pinia';

import { useAppConfigStore } from '@/stores/appConfig';

import { clampPercent, formatBytes, formatRate } from '../utils/format';

export default {
    name: 'ServerDiskPanel',
    props: {
        metrics: {
            type: Object,
            default: () => ({})
        }
    },
    computed: {
        ...mapState(useAppConfigStore, ['local']),
        disks() {
            return this.metrics.disks || [];
        }
    },
    methods: {
        clampPercent,
        formatBytes,
        formatRate,
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
@use './panel' as panel;

.server-disk-panel {
    @include panel.card;

    .panel-head {
        @include panel.head;
    }

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

    .empty-panel {
        @include panel.empty;
    }

    @media (max-width: 880px) {
        .disk-row,
        .disk-io {
            grid-template-columns: 1fr;
        }

        .disk-meter {
            align-items: center;
        }
    }
}
</style>