<template>
    <div
        class="floating-monitor"
        @dblclick="showMain"
        @pointerdown="startDrag"
        @pointermove="moveDrag"
        @pointerup="endDrag"
        @pointercancel="endDrag"
    >
        <div
            class="metric network"
            :title="`${local('Download')}: ${rate(metrics.network.download)}`"
        >
            <i class="ms-Icon ms-Icon--CaretDownSolid8" aria-hidden="true"></i
            ><strong>{{ rate(metrics.network.download) }}</strong>
        </div>
        <div
            class="metric network"
            :title="`${local('Upload')}: ${rate(metrics.network.upload)}`"
        >
            <i class="ms-Icon ms-Icon--CaretUpSolid8" aria-hidden="true"></i
            ><strong>{{ rate(metrics.network.upload) }}</strong>
        </div>
        <div class="metric" title="CPU">
            <i class="ms-Icon ms-Icon--LightningBolt" aria-hidden="true"></i
            ><strong>{{ percentage(metrics.cpu) }}</strong>
        </div>
        <div class="metric" :title="local('Memory')">
            <i class="ms-Icon ms-Icon--NetworkPhysical" aria-hidden="true"></i
            ><strong>{{ percentage(metrics.memory) }}</strong>
        </div>
        <div class="metric" title="GPU">
            <i class="ms-Icon ms-Icon--SpeedHigh" aria-hidden="true"></i
            ><strong>{{ percentage(metrics.gpu.usage) }}</strong>
        </div>
        <div class="metric" :title="local('GPU temperature')">
            <i class="ms-Icon ms-Icon--Frigid" aria-hidden="true"></i
            ><strong>{{ degrees(metrics.gpu.temperature) }}</strong>
        </div>
        <div v-if="error" class="floating-error" role="alert">{{ error }}</div>
    </div>
</template>

<script>
import { mapState } from 'pinia';
import { useAppConfigStore } from '@/stores/appConfig';

export default {
    name: 'FloatingMonitor',
    data() {
        return {
            metrics: {
                cpu: null,
                memory: null,
                network: { download: null, upload: null },
                gpu: { usage: null, temperature: null }
            },
            unsubscribe: null,
            error: '',
            dragging: false
        };
    },
    computed: {
        ...mapState(useAppConfigStore, ['local'])
    },
    mounted() {
        this.unsubscribe = window.api.desktop.onMetrics((metrics) => {
            this.metrics = metrics;
        });
    },
    beforeUnmount() {
        this.unsubscribe?.();
    },
    methods: {
        startDrag(event) {
            if (event.button !== 0) return;
            this.dragging = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            window.api.desktop.dragFloating('start');
        },
        moveDrag() {
            if (this.dragging) window.api.desktop.dragFloating('move');
        },
        endDrag() {
            if (!this.dragging) return;
            this.dragging = false;
            window.api.desktop.dragFloating('end');
        },
        async showMain() {
            try {
                await window.api.desktop.showMain();
            } catch {
                this.error = this.local('Could not control window.');
            }
        },
        async hideFloating() {
            try {
                await window.api.desktop.hideFloating();
            } catch {
                this.error = this.local('Could not control window.');
            }
        },
        percentage(value) {
            return value === null || value === undefined
                ? '—'
                : `${Math.round(value)}%`;
        },
        degrees(value) {
            return value === null || value === undefined
                ? '—'
                : `${Math.round(value)}°C`;
        },
        rate(value) {
            if (value === null || value === undefined) return '—';
            const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
            let amount = value;
            let index = 0;
            while (amount >= 1024 && index < units.length - 1) {
                amount /= 1024;
                index += 1;
            }
            return `${amount.toFixed(index ? 1 : 0)} ${units[index]}`;
        }
    }
};
</script>

<style lang="scss" scoped>
:global(html),
:global(body),
:global(#app) {
    width: 100%;
    height: 100%;
    margin: 0;
    background: transparent;
    overflow: hidden;
}
.floating-monitor {
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    padding: 0 10px;
    border: 1px solid var(--ph-border);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.6);
    color: var(--ph-text);
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 6px;
    user-select: none;
    cursor: move;
    touch-action: none;
    .metric {
        display: flex;
        align-items: center;
        gap: 4px;
        flex: 0 0 auto;
        min-width: 0;
        white-space: nowrap;
    }
    .metric i {
        color: var(--ph-text-muted);
        font-size: 8px;
    }
    .network i {
        color: #10b981;
    }
    .metric strong {
        display: block;
        width: 5ch;
        font-size: 8px;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
    }
    .network strong {
        width: 10ch;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .floating-error {
        position: absolute;
        bottom: 0;
        left: 12px;
        color: var(--ph-danger);
        font-size: 8px;
    }
}
</style>
