<template>
    <div class="page-stack schedule-editor">
        <sectionCard :title="local('Schedule editor')" :description="local('Schedules run while PowerHub is open.')">
            <template #actions>
                <div class="actions">
                    <fv-button :theme="resolvedTheme" @click="$router.push({ name: 'schedules' })">{{ local('Cancel') }}</fv-button>
                    <fv-button :background="subColor" border-radius="8" :disabled="saving" @click="save">{{ local('Save') }}</fv-button>
                </div>
            </template>
            <div v-if="errorMessage" class="error">{{ errorMessage }}</div>
            <div class="form-grid">
                <div class="field"><span>{{ local('Name') }}</span><fv-text-box v-model="draft.name" :theme="resolvedTheme" /></div>
                <div class="field"><span>{{ local('Cron expression') }}</span><div class="cron-input"><fv-text-box v-model="draft.cron" :theme="resolvedTheme" placeholder="*/15 * * * *" /><fv-button :theme="resolvedTheme" :title="local('Adjust schedule')" :aria-label="local('Adjust schedule')" style="width: 34px; height: 34px; flex-shrink: 0" @click="cronBuilderOpen = true"><i class="ms-Icon ms-Icon--Settings"></i></fv-button></div></div>
                <div class="field"><span>{{ local('Task type') }}</span><fv-drop-down :model-value="typeOptions.filter(x => x.key === draft.taskType)" :options="typeOptions" :theme="resolvedTheme" @update:model-value="changeType" /></div>
                <div class="field" v-if="draft.taskType === 'single'"><span>{{ local('Endpoint') }}</span><fv-drop-down :model-value="endpointOptions.filter(x => x.key === draft.endpointId)" :options="endpointOptions" :theme="resolvedTheme" :placeholder="local('Select an endpoint')" @update:model-value="draft.endpointId = $event?.[0]?.key || ''" /></div>
                <div class="field" v-else><span>{{ local('Collection') }}</span><fv-drop-down :model-value="collectionOptions.filter(x => x.key === draft.collection)" :options="collectionOptions" :theme="resolvedTheme" :placeholder="local('Select a collection')" @update:model-value="changeCollection" /></div>
            </div>
            <div class="switch-row"><fv-toggle-switch v-model="draft.enabled" :theme="resolvedTheme" :width="38" :height="20" :switch-on-background="subColor" /><span>{{ local('Enabled') }}</span></div>
            <template v-if="draft.taskType === 'collection'">
                <p class="hint">{{ local('Connect enabled endpoints from Start in execution order. Unconnected endpoints will not run.') }}</p>
                <p class="hint">{{ local('Connect the same nodes again to remove a connection. Branches run in parallel; failed branches stop.') }}</p>
                <div class="flow-canvas">
                    <vue-flow :key="flowVersion" :id="`schedule-flow-${flowVersion}`" v-model:nodes="nodes" v-model:edges="edges" :nodes-deletable="false" :delete-key-code="['Backspace', 'Delete']" :fit-view-on-init="true" :max-zoom="1" @connect="connect">
                        <template #node-endpoint="props"><flow-node v-bind="props" @update-delay="updateNodeDelay(props.id, $event)" /></template>
                        <template #edge-flow="props"><flow-edge v-bind="props" /></template>
                        <background :gap="20" :size="1" />
                        <controls />
                    </vue-flow>
                </div>
            </template>
        </sectionCard>
        <cronBuilder v-model="cronBuilderOpen" :cron="draft.cron" @apply="draft.cron = $event" />
    </div>
</template>
<script>
import { mapActions, mapState } from 'pinia';
import { VueFlow } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import '@vue-flow/controls/dist/style.css';
import cronBuilder from './cronBuilder.vue';
import flowNode from './flowNode.vue';
import flowEdge from './flowEdge.vue';
import sectionCard from '@/components/common/sectionCard.vue';
import { useAppConfigStore } from '@/stores/appConfig';
import { useThemeStore } from '@/stores/theme';
import { useWorkspaceStore } from '@/stores/workspace';

export default {
    name: 'ScheduleEditor',
    components: { VueFlow, Background, Controls, cronBuilder, flowNode, flowEdge, sectionCard },
    data() { return { draft: { name: '', cron: '*/15 * * * *', enabled: false, taskType: 'single', endpointId: '', collection: '' }, nodes: [], edges: [], flowVersion: 0, cronBuilderOpen: false, saving: false, errorMessage: '' }; },
    computed: {
        ...mapState(useThemeStore, ['subColor']),
        ...mapState(useAppConfigStore, ['resolvedTheme', 'local']),
        ...mapState(useWorkspaceStore, ['endpoints', 'collections', 'scheduleById']),
        typeOptions() { return [{ key: 'single', text: this.local('Single endpoint') }, { key: 'collection', text: this.local('Collection') }]; },
        endpointOptions() { return this.endpoints.filter(x => x.enabled).map(x => ({ key: x.id, text: x.name })); },
        collectionOptions() { return this.collections.map(x => ({ key: x.name, text: x.name })); }
    },
    async mounted() {
        const initialized = await this.workspaceInitialize();
        if (!initialized.ok) { this.errorMessage = initialized.message; return; }
        const refreshed = await this.refreshSchedules();
        if (!refreshed.ok) { this.errorMessage = refreshed.message; return; }
        if (this.$route.params.id !== 'new') {
            const schedule = this.scheduleById[this.$route.params.id];
            if (!schedule) { this.errorMessage = this.local('Schedule not found.'); return; }
            this.draft = { name: schedule.name, cron: schedule.cron, enabled: schedule.taskType === 'legacy' ? false : schedule.enabled, taskType: schedule.taskType === 'collection' ? 'collection' : 'single', endpointId: schedule.endpointId || '', collection: schedule.collection || '' };
            this.initializeFlow(schedule.flow);
        } else this.initializeFlow({});
    },
    methods: {
        ...mapActions(useWorkspaceStore, { workspaceInitialize: 'loadWorkspace', refreshSchedules: 'refreshSchedules', addSchedule: 'addSchedule', updateSchedule: 'updateSchedule' }),
        initializeFlow(flow = {}) {
            const positions = new Map((flow.nodes || []).map(node => [node.id, node.position]));
            const delays = new Map((flow.nodes || []).map(node => [node.id, node.delayMs ?? 0]));
            const endpoints = this.endpoints.filter(x => x.enabled && x.collection === this.draft.collection);
            const nodes = [
                { id: 'start', type: 'endpoint', position: positions.get('start') || { x: 40, y: 100 }, data: { label: this.local('Start'), method: this.local('Start') }, deletable: false },
                ...endpoints.map((endpoint, i) => ({ id: endpoint.id, type: 'endpoint', position: positions.get(endpoint.id) || { x: 360 + (i % 2) * 300, y: 50 + Math.floor(i / 2) * 140 }, data: { label: endpoint.name, method: endpoint.method, url: endpoint.url, editable: true, delayMs: delays.get(endpoint.id) ?? 0 }, deletable: false }))
            ];
            this.nodes = nodes;
            const ids = new Set(nodes.map(node => node.id));
            this.edges = (flow.edges || []).filter(edge => ids.has(edge.source) && ids.has(edge.target)).map(edge => ({ id: edge.id, source: edge.source, target: edge.target, type: 'flow', data: { state: 'editing' } }));
        },
        changeType(options) { this.draft.taskType = options?.[0]?.key || 'single'; },
        changeCollection(options) {
            const collection = options?.[0]?.key || '';
            if (collection === this.draft.collection) return;
            this.draft.collection = collection;
            this.initializeFlow({});
            this.flowVersion += 1;
        },
        updateNodeDelay(id, value) {
            const node = this.nodes.find(item => item.id === id);
            if (node) node.data.delayMs = value;
        },
        connect(connection) {
            const { source, target } = connection;
            if (!source || !target) return;
            const existing = this.edges.find(edge => edge.source === source && edge.target === target);
            if (existing) {
                this.edges = this.edges.filter(edge => edge.id !== existing.id);
                return;
            }
            const stack = [target];
            const visited = new Set();
            while (stack.length) {
                const current = stack.pop();
                if (current === source) {
                    this.$barWarning(this.local('The flow cannot contain a cycle.'), { status: 'warning', theme: this.resolvedTheme, autoClose: 3000, once: true });
                    return;
                }
                if (visited.has(current)) continue;
                visited.add(current);
                for (const edge of this.edges) if (edge.source === current) stack.push(edge.target);
            }
            if (target === 'start') return;
            this.errorMessage = '';
            this.edges.push({ id: `${source}-${target}`, source, target, type: 'flow', data: { state: 'editing' } });
        },
        scheduleError(message) {
            const keys = ['Invalid cron expression. Use five fields.', 'Schedule name is required.', 'Select an enabled endpoint.', 'Select a collection.', 'Connect at least one enabled endpoint to Start.', 'The flow contains an invalid connection.', 'Delay must be a whole number between 0 and 2147483647 milliseconds.', 'The flow contains a cycle.', 'Select a task type.'];
            const key = keys.find(item => String(message || '').includes(item));
            return key ? this.local(key) : message;
        },
        async save() {
            this.errorMessage = '';
            if (this.draft.taskType === 'collection' && this.nodes.some(node => node.id !== 'start' && (String(node.data.delayMs ?? '').trim() === '' || !Number.isInteger(Number(node.data.delayMs)) || Number(node.data.delayMs) < 0 || Number(node.data.delayMs) > 2147483647))) {
                this.errorMessage = this.local('Delay must be a whole number between 0 and 2147483647 milliseconds.');
                return;
            }
            this.saving = true;
            const flow = { nodes: this.nodes.map(({ id, position, data }) => ({ id, position: { x: position.x, y: position.y }, delayMs: id === 'start' ? 0 : Number(data.delayMs) })), edges: this.edges.map(({ id, source, target }) => ({ id, source, target })) };
            const payload = { ...this.draft, endpointId: this.draft.taskType === 'single' ? this.draft.endpointId : null, flow };
            const result = this.$route.params.id === 'new' ? await this.addSchedule(payload) : await this.updateSchedule(this.$route.params.id, payload);
            this.saving = false;
            if (!result.ok) { this.errorMessage = this.scheduleError(result.message); return; }
            this.$router.push({ name: 'schedules' });
        }
    }
};
</script>
<style lang="scss" scoped>
.schedule-editor {
    min-height: 0;
    flex: 1;
    overflow: hidden;

    :deep(.section-card) { overflow: visible; }
    .actions { display: flex; gap: 8px; }
    .form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
    .field { display: flex; min-width: 0; flex-direction: column; gap: 6px; color: var(--ph-text-secondary); font-size: 12px; }
    .cron-input { display: flex; gap: 8px; min-width: 0; }
    .cron-input :deep(.fv-TextBox) { flex: 1; min-width: 0; }
    .switch-row { display: flex; align-items: center; gap: 10px; margin-top: 16px; color: var(--ph-text-secondary); }
    .hint { color: var(--ph-text-muted); font-size: 12px; }
    .error { margin-bottom: 12px; color: var(--ph-danger); }
    .flow-canvas { height: 520px; min-width: 0; border: 1px solid var(--ph-border); border-radius: 10px; background: var(--ph-surface-soft); }
    @media (max-width: 640px) { .form-grid { grid-template-columns: 1fr; } }
}
</style>
