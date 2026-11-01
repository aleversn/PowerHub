<template>
    <div
        class="flow-node"
        :style="{ '--node-accent': subColor }"
        :class="{
            selected,
            running: data.status === 'running',
            'is-start': id === 'start'
        }"
    >
        <handle
            v-if="id !== 'start'"
            type="target"
            :position="Position.Left"
            class="node-handle"
        />
        <div class="node-banner">
            <span class="node-icon"
                ><fv-progress-ring
                    v-if="data.status === 'running'"
                    :r="12"
                    :loading="true"
                    :border-width="2"
                    color="white"
                    background="rgba(120, 120, 120, 0.1)" /><i
                    v-else
                    :class="`ms-Icon ms-Icon--${id === 'start' ? 'Play' : 'Cloud'}`"
                ></i
            ></span>
            <div class="node-title">
                <span>{{ data.method }}</span
                ><strong :title="data.label">{{ data.label }}</strong>
            </div>
        </div>
        <div v-if="data.statusLabel" class="node-status" :class="data.status">
            {{ data.statusLabel }}
        </div>
        <div v-if="data.url" class="node-info" :title="data.url">
            {{ data.url }}
        </div>
        <div
            v-if="data.editable && id !== 'start'"
            class="node-delay nodrag nopan"
        >
            <span>{{ local('Start delay (ms)') }}</span>
            <fv-text-box
                :model-value="String(data.delayMs ?? 0)"
                :theme="resolvedTheme"
                type="number"
                :placeholder="local('Start delay (ms)')"
                :border-radius="8"
                @update:model-value="$emit('update-delay', $event)"
            />
        </div>
        <div
            v-if="data.statusLabel && id !== 'start'"
            class="node-result nodrag nopan nowheel"
        >
            <div v-if="data.delayMs">
                {{ local('Start delay (ms)') }}: {{ data.delayMs }}
            </div>
            <div v-if="data.status === 'success' || data.status === 'failed'">
                {{ local('Status code') }}: {{ data.statusCode ?? '-' }} ·
                {{ local('Duration') }}: {{ data.duration ?? '-' }} ms
            </div>
            <details
                v-if="data.response !== null && data.response !== undefined"
            >
                <summary>{{ local('Response body') }}</summary>
                <pre>{{ data.response }}</pre>
            </details>
            <div v-if="data.error" class="node-error">
                {{ local(data.error) }}
            </div>
        </div>
        <handle type="source" :position="Position.Right" class="node-handle" />
    </div>
</template>
<script>
import { Handle, Position } from '@vue-flow/core';
import { mapState } from 'pinia';
import { useAppConfigStore } from '@/stores/appConfig';
import { useThemeStore } from '@/stores/theme';
export default {
    name: 'ScheduleFlowNode',
    components: { Handle },
    props: {
        id: { type: String, default: '' },
        data: { type: Object, default: () => ({}) },
        selected: { type: Boolean, default: false }
    },
    emits: ['update-delay'],
    data() {
        return { Position };
    },
    computed: {
        ...mapState(useAppConfigStore, ['local', 'resolvedTheme']),
        ...mapState(useThemeStore, ['subColor'])
    }
};
</script>
<style lang="scss" scoped>
.flow-node {
    box-sizing: border-box;
    width: 250px;
    padding: 16px;
    border: 1px solid var(--ph-border-subtle);
    border-radius: 18px;
    background: var(--ph-flow-card);
    color: var(--ph-text);
    box-shadow: 0 8px 24px rgba(25, 28, 24, 0.08);
    transition:
        box-shadow 0.2s,
        border-color 0.2s;

    &:hover {
        box-shadow: var(--ph-shadow-md);
    }
    &.selected {
        box-shadow: 0 12px 32px rgba(25, 28, 24, 0.2);
    }
    &.is-start {
        background:
            radial-gradient(
                ellipse at 95% 100%,
                color-mix(in srgb, var(--node-accent) 18%, transparent),
                transparent 70%
            ),
            var(--ph-flow-card);
    }
    &.running {
        background: linear-gradient(
            120deg,
            var(--ph-surface) 25%,
            color-mix(in srgb, var(--node-accent) 30%, var(--ph-surface)) 50%,
            var(--ph-surface) 75%
        );
        background-size: 220% 100%;
        animation: node-running-background 2s ease-in-out infinite;
    }
    .node-banner {
        display: flex;
        gap: 12px;
        align-items: center;
        min-width: 0;
    }
    .node-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 38px;
        height: 38px;
        flex: none;
        border-radius: 14px;
        background: color-mix(
            in srgb,
            var(--node-accent) 24%,
            var(--ph-surface)
        );
    }
    .node-title {
        display: flex;
        flex-direction: column;
        min-width: 0;
        gap: 3px;
    }
    .node-title span {
        align-self: flex-start;
        font-size: 10px;
        font-weight: 600;
        color: var(--ph-text-muted);
        letter-spacing: 0.06em;
    }
    .node-title strong {
        font-size: 13px;
        font-weight: 600;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .node-status {
        margin-top: 10px;
        font-size: 11px;
        color: var(--ph-text-muted);
    }
    .node-status.running {
        color: var(--ph-accent);
    }
    .node-status.success {
        color: var(--ph-success);
    }
    .node-status.failed {
        color: var(--ph-danger);
    }
    .node-delay {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        margin-top: 12px;
        padding-top: 10px;
        border-top: 1px solid var(--ph-border-subtle);
        font-size: 10px;
        color: var(--ph-text-muted);
    }
    .node-delay span {
        flex: 1;
        min-width: 0;
    }
    .node-delay :deep(.fv-TextBox) {
        flex: 0 0 80px;
        width: 80px;
        min-width: 0;
    }
    .node-result {
        margin-top: 10px;
        padding: 9px;
        border-radius: 12px;
        background: var(--ph-surface-soft);
        color: var(--ph-text-secondary);
        font-size: 10px;
        overflow-wrap: anywhere;
    }
    .node-result summary {
        cursor: pointer;
    }
    .node-result pre {
        max-height: 120px;
        overflow: auto;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        font: inherit;
    }
    .node-error {
        color: var(--ph-danger);
    }
    .node-info {
        margin-top: 14px;
        padding: 9px 10px;
        border-radius: 10px;
        background: var(--ph-surface-soft);
        color: var(--ph-text-muted);
        font-size: 10px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    :deep(.node-handle) {
        width: 14px;
        height: 14px;
        border: 3px solid var(--ph-surface);
        background: color-mix(
            in srgb,
            var(--node-accent) 65%,
            var(--ph-text-muted)
        );
    }
}
@keyframes node-running-background {
    0% {
        background-position: 100% 0;
    }
    100% {
        background-position: -100% 0;
    }
}
@media (prefers-reduced-motion: reduce) {
    .flow-node.running {
        animation: none;
    }
}
</style>
