<template>
    <span class="status-pill" :class="`is-${normalizedStatus}`">
        <span class="status-dot"></span>
        <span>{{ displayLabel }}</span>
    </span>
</template>

<script>
import { mapState } from 'pinia';

import { useAppConfigStore } from '@/stores/appConfig';

export default {
    name: 'StatusPill',
    props: {
        status: {
            type: String,
            default: 'disabled'
        },
        label: {
            type: String,
            default: ''
        }
    },
    computed: {
        ...mapState(useAppConfigStore, ['local']),
        normalizedStatus() {
            const value = String(this.status || '').toLowerCase();
            if (value === 'warning' || value === 'degraded') return 'warning';
            if (value === 'failed' || value === 'offline') return 'failed';
            if (value === 'success' || value === 'healthy') return 'success';
            if (value === 'running') return 'running';
            if (value === 'active' || value === 'enabled') return 'enabled';
            return value || 'disabled';
        },
        displayLabel() {
            if (this.label) return this.label;
            const labels = {
                healthy: 'Healthy',
                degraded: 'Degraded',
                offline: 'Offline',
                success: 'Success',
                warning: 'Warning',
                failed: 'Failed',
                running: 'Running',
                enabled: 'Enabled',
                disabled: 'Disabled',
                active: 'Active',
                paused: 'Paused'
            };
            return this.local(
                labels[this.status] ||
                    labels[this.normalizedStatus] ||
                    this.status
            );
        }
    }
};
</script>

<style lang="scss" scoped>
.status-pill {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    min-height: 24px;
    padding: 0 9px;
    border: 1px solid var(--ph-border);
    border-radius: 999px;
    background: var(--ph-surface-soft);
    color: var(--ph-text-secondary);
    font-size: 12px;
    line-height: 1;
    white-space: nowrap;

    &.is-success,
    &.is-enabled {
        border-color: rgba(16, 124, 16, 0.25);
        background: rgba(16, 124, 16, 0.1);
        color: var(--ph-success);
    }

    &.is-warning {
        border-color: rgba(157, 93, 0, 0.25);
        background: rgba(157, 93, 0, 0.1);
        color: var(--ph-warning);
    }

    &.is-failed {
        border-color: rgba(196, 43, 28, 0.25);
        background: rgba(196, 43, 28, 0.1);
        color: var(--ph-danger);
    }

    &.is-running {
        border-color: rgba(0, 120, 212, 0.25);
        background: rgba(0, 120, 212, 0.1);
        color: var(--ph-accent);
    }

    &.is-disabled,
    &.is-paused {
        color: var(--ph-text-muted);
    }
}

.status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
    box-shadow: 0 0 0 3px color-mix(in srgb, currentColor 15%, transparent);
}
</style>
