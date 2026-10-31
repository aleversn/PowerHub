<template>
    <div class="flow-result">
        <vue-flow :id="`history-flow-${run.id}`" :nodes="nodes" :edges="edges" :nodes-draggable="false" :nodes-connectable="false" :elements-selectable="false" :fit-view-on-init="true" :max-zoom="1">
            <template #node-endpoint="props"><flow-node v-bind="props" /></template>
            <template #edge-flow="props"><flow-edge v-bind="props" /></template>
            <background :gap="20" :size="1" />
            <controls :show-interactive="false" />
        </vue-flow>
    </div>
</template>
<script>
import { VueFlow } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import '@vue-flow/controls/dist/style.css';
import { mapState } from 'pinia';
import { useAppConfigStore } from '@/stores/appConfig';
import flowNode from '../schedules/flowNode.vue';
import flowEdge from '../schedules/flowEdge.vue';

export default {
    name: 'RunFlowResult',
    components: { VueFlow, Background, Controls, flowNode, flowEdge },
    props: { run: { type: Object, default: () => ({}) } },
    computed: {
        ...mapState(useAppConfigStore, ['local']),
        results() { return new Map((this.run.nodeResults || []).map(result => [result.endpointId, result])); },
        nodes() {
            return (this.run.flowSnapshot?.nodes || []).map(node => {
                const result = this.results.get(node.id);
                const status = result?.status || 'pending';
                return { id: node.id, type: 'endpoint', position: node.position || { x: 0, y: 0 }, style: { pointerEvents: 'all' }, data: {
                    label: node.id === 'start' ? this.local('Start') : node.name,
                    method: node.id === 'start' ? this.local('Start') : node.method,
                    status: node.id === 'start' ? '' : status,
                    statusCode: result?.statusCode, duration: result?.duration, response: result?.response, error: result?.error, delayMs: node.delayMs || 0,
                    statusLabel: node.id === 'start' ? '' : this.local(({ success: 'Success', failed: 'Failed', running: 'Running', waiting: 'Waiting', pending: 'Pending', skipped: 'Not executed' })[status] || 'Not executed')
                } };
            });
        },
        edges() {
            return (this.run.flowSnapshot?.edges || []).map(edge => {
                const sourceStatus = edge.source === 'start' ? 'success' : this.results.get(edge.source)?.status;
                const targetStatus = this.results.get(edge.target)?.status;
                const state = sourceStatus === 'failed' || (sourceStatus === 'success' && targetStatus === 'failed')
                    ? 'failed'
                    : sourceStatus === 'success' && targetStatus === 'success' ? 'success'
                    : sourceStatus === 'success' && (targetStatus === 'running' || targetStatus === 'waiting') ? 'running' : 'pending';
                return { ...edge, type: 'flow', data: { state } };
            });
        }
    }
};
</script>
<style lang="scss" scoped>
.flow-result { height: 360px; min-width: 0; margin: 12px 0; border: 1px solid var(--ph-border); border-radius: 10px; background: var(--ph-surface-soft); }
</style>
