<template>
    <g class="flow-edge">
        <defs>
            <linearGradient :id="gradientId" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" :stop-color="colors[0]" />
                <stop offset="100%" :stop-color="colors[1]" />
            </linearGradient>
            <filter :id="glowId" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="1" stdDeviation="3" :flood-color="colors[0]" flood-opacity="0.3" />
            </filter>
        </defs>
        <base-edge :id="id" :path="path" :class="{ 'flow-edge-dashed': state !== 'success', 'flow-edge-animated': state === 'editing' || state === 'failed' || state === 'running' }" :style="{ stroke: `url(#${gradientId})`, strokeWidth: 4, filter: `url(#${glowId})`, fill: 'none' }" />
    </g>
</template>
<script>
import { BaseEdge, getBezierPath } from '@vue-flow/core';
let nextEdgeId = 0;
export default {
    name: 'ScheduleFlowEdge',
    components: { BaseEdge },
    props: {
        id: { type: String, default: '' },
        sourceX: { type: Number, default: 0 }, sourceY: { type: Number, default: 0 },
        targetX: { type: Number, default: 0 }, targetY: { type: Number, default: 0 },
        sourcePosition: { type: String, default: 'right' }, targetPosition: { type: String, default: 'left' },
        data: { type: Object, default: () => ({}) }
    },
    data() { return { uniqueId: ++nextEdgeId }; },
    computed: {
        path() { return getBezierPath(this.$props)[0]; },
        state() { return this.data.state || 'editing'; },
        gradientId() { return `ph-edge-gradient-${this.uniqueId}`; },
        glowId() { return `ph-edge-glow-${this.uniqueId}`; },
        colors() {
            if (this.state === 'failed') return ['#df746d', '#bd3937'];
            if (this.state === 'pending') return ['#a3a6b0', '#858998'];
            return ['#e57b43', '#e16b38'];
        }
    }
};
</script>
<style lang="scss" scoped>
.flow-edge :deep(.flow-edge-dashed) { stroke-dasharray: 8 6; }
.flow-edge :deep(.flow-edge-animated) { animation: flow-edge-dash 0.8s linear infinite; }
@keyframes flow-edge-dash { to { stroke-dashoffset: -14; } }
@media (prefers-reduced-motion: reduce) { .flow-edge :deep(.flow-edge-animated) { animation: none; } }
</style>
