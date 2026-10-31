<template>
    <div class="flow-node" :class="{ selected, running: data.status === 'running' }">
        <handle v-if="id !== 'start'" type="target" :position="Position.Left" class="node-handle" />
        <div class="node-banner">
            <span class="node-icon"><fv-progress-ring v-if="data.status === 'running'" :r="12" :loading="true" :border-width="2" color="white" background="rgba(120, 120, 120, 0.1)" /><i v-else :class="`ms-Icon ms-Icon--${id === 'start' ? 'Play' : 'Cloud'}`"></i></span>
            <div class="node-title"><span>{{ data.method }}</span><strong :title="data.label">{{ data.label }}</strong></div>
        </div>
        <div v-if="data.statusLabel" class="node-status" :class="data.status">{{ data.statusLabel }}</div>
        <div v-if="data.url" class="node-info" :title="data.url">{{ data.url }}</div>
        <div v-if="data.editable && id !== 'start'" class="node-delay nodrag nopan">
            <span>{{ local('Start delay (ms)') }}</span>
            <fv-text-box :model-value="String(data.delayMs ?? 0)" :theme="resolvedTheme" type="number" :placeholder="local('Start delay (ms)')" @update:model-value="$emit('update-delay', $event)" />
        </div>
        <div v-if="data.statusLabel && id !== 'start'" class="node-result nodrag nopan nowheel">
            <div v-if="data.delayMs">{{ local('Start delay (ms)') }}: {{ data.delayMs }}</div>
            <div v-if="data.status === 'success' || data.status === 'failed'">{{ local('Status code') }}: {{ data.statusCode ?? '-' }} · {{ local('Duration') }}: {{ data.duration ?? '-' }} ms</div>
            <details v-if="data.response !== null && data.response !== undefined">
                <summary>{{ local('Response body') }}</summary>
                <pre>{{ data.response }}</pre>
            </details>
            <div v-if="data.error" class="node-error">{{ local(data.error) }}</div>
        </div>
        <handle type="source" :position="Position.Right" class="node-handle" />
    </div>
</template>
<script>
import { Handle, Position } from '@vue-flow/core';
import { mapState } from 'pinia';
import { useAppConfigStore } from '@/stores/appConfig';
export default {
    name: 'ScheduleFlowNode',
    components: { Handle },
    props: { id: { type: String, default: '' }, data: { type: Object, default: () => ({}) }, selected: { type: Boolean, default: false } },
    emits: ['update-delay'],
    data() { return { Position }; },
    computed: { ...mapState(useAppConfigStore, ['local', 'resolvedTheme']) }
};
</script>
<style lang="scss" scoped>
.flow-node {
    width: 250px; padding: 10px; border: 1px solid var(--ph-border); border-radius: 8px;
    background: var(--ph-surface); color: var(--ph-text); outline: 1.5px solid transparent;
    box-shadow: 0 0 1px rgba(122, 124, 206, .3); transition: box-shadow .2s, outline .2s;
    &:hover { box-shadow: 0 6px 16px rgba(122, 124, 206, .3); }
    &.selected { outline-color: #a3a4ec; }
    &.running {
        background: linear-gradient(120deg, var(--ph-surface) 25%, color-mix(in srgb, #a391ce 32%, var(--ph-surface)) 50%, var(--ph-surface) 75%);
        background-size: 220% 100%; animation: node-running-background 2s ease-in-out infinite;
        .node-icon { background: linear-gradient(130deg, #a191ce, #775da0); }
    }
    .node-status.running { color: var(--ph-accent); }
    .node-banner { display: flex; gap: 10px; align-items: center; min-width: 0; }
    .node-icon { display: grid; place-items: center; width: 35px; height: 35px; flex: none; border: 1px solid var(--ph-border); border-radius: 8px; background: var(--ph-surface-soft); }
    .node-title { display: flex; flex-direction: column; min-width: 0; gap: 3px; }
    .node-title span { font-size: 10px; color: var(--ph-text-muted); }
    .node-title strong { font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .node-status { margin-top: 8px; font-size: 11px; color: var(--ph-text-muted); }
    .node-status.success { color: var(--ph-success); }
    .node-status.failed { color: var(--ph-danger); }
    .node-delay { display: flex; align-items: center; gap: 8px; min-width: 0; margin-top: 8px; font-size: 10px; color: var(--ph-text-muted); }
    .node-delay span { flex: 1; min-width: 0; }
    .node-delay :deep(.fv-TextBox) { flex: 0 0 80px; width: 80px; min-width: 0; }
    .node-result { margin-top: 8px; padding: 7px; border-radius: 6px; background: var(--ph-surface-soft); color: var(--ph-text-secondary); font-size: 10px; overflow-wrap: anywhere; }
    .node-result summary { cursor: pointer; }
    .node-result pre { max-height: 120px; overflow: auto; white-space: pre-wrap; overflow-wrap: anywhere; font: inherit; }
    .node-error { color: var(--ph-danger); }
    .node-info { margin-top: 10px; padding: 7px; border-radius: 6px; background: var(--ph-surface-soft); color: var(--ph-text-secondary); font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    :deep(.node-handle) { width: 15px; height: 15px; border: 3px solid var(--ph-surface); background: #a3a4ec; }
}
@keyframes node-running-background { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }
@media (prefers-reduced-motion: reduce) { .flow-node.running { animation: none; } }
</style>
