<template>
    <div class="page-stack runs-page">
        <sectionCard
            :title="local('Run history')"
            :description="local('Inspect recent request results, status codes, and duration.')"
        >
            <template #actions>
                <div class="run-actions">
                <fv-button
                    :theme="resolvedTheme"
                    border-radius="8"
                    icon="Refresh"
                    style="height: 34px"
                    @click="refresh"
                >
                    {{ local('Refresh') }}
                </fv-button>
                <fv-button :theme="resolvedTheme" icon="Delete" :disabled="busy || !runs.length || runs.some(run => run.status === 'running')" @click="confirmClear">{{ local('Clear all') }}</fv-button>
                </div>
            </template>

            <div v-if="errorMessage" class="run-error" role="alert">{{ errorMessage }}</div>

            <div class="runs-table">
                <div class="runs-table__head">
                    <span>{{ local('Request') }}</span>
                    <span>{{ local('Status') }}</span>
                    <span>{{ local('Status code') }}</span>
                    <span>{{ local('Duration') }}</span>
                    <span>{{ local('Triggered by') }}</span>
                    <span>{{ local('Started at') }}</span>
                    <span></span>
                </div>
                <template v-for="run in runs" :key="run.id">
                <div class="runs-table__row">
                    <div class="run-main">
                        <strong>{{ run.nodeResults?.length ? (scheduleById[run.scheduleId]?.name || run.nodeResults[0].name) : endpointName(run.endpointId) }}</strong>
                        <span>{{ endpointUrl(run.endpointId) }}</span>
                    </div>
                    <statusPill :status="run.status" />
                    <code
                        class="status-code"
                        :class="statusClass(run.statusCode)"
                    >
                        {{ run.statusCode }}
                    </code>
                    <span class="numeric-cell">{{ run.duration == null ? '-' : `${run.duration} ms` }}</span>
                    <span class="trigger-cell">
                        {{ triggerLabel(run.triggeredBy) }}
                    </span>
                    <span>{{ formatDate(run.startedAt) }}</span>
                    <fv-button :theme="resolvedTheme" :disabled="busy || run.status === 'running'" :title="local('Delete')" :aria-label="local('Delete')" style="width: 34px; height: 34px" @click="confirmRemove(run)"><i class="ms-Icon ms-Icon--Delete"></i></fv-button>
                </div>
                <details class="run-nodes">
                    <summary v-if="run.nodeResults?.length">{{ local('Node results') }} ({{ run.nodeResults.length }})</summary>
                    <summary v-else>{{ local('Execution result') }}</summary>
                    <div v-if="run.flowSnapshot?.nodes?.length">
                        <strong>{{ local('Execution flow') }}</strong>
                        <flowResult :run="run" />
                    </div>
                    <div v-if="run.error" class="run-error">{{ local(run.error) }}</div>
                    <details v-if="!run.nodeResults?.length && run.response !== null && run.response !== undefined" class="response-detail">
                        <summary>{{ local('Response body') }}</summary><pre>{{ run.response }}</pre>
                    </details>
                    <div v-for="(node, index) in run.nodeResults" :key="index" class="node-result">
                        <span>{{ index + 1 }}. {{ node.name }}</span>
                        <code>{{ node.method }}</code>
                        <statusPill :status="node.status" />
                        <span>{{ node.statusCode || '-' }} · {{ node.duration ?? '-' }} ms</span>
                        <span v-if="node.error" class="run-error">{{ local(node.error) }}</span>
                        <details v-if="node.response !== null && node.response !== undefined" class="response-detail"><summary>{{ local('Response body') }}</summary><pre>{{ node.response }}</pre></details>
                    </div>
                </details>
                </template>
            </div>
        </sectionCard>
    </div>
</template>

<script>
import { mapActions, mapState } from 'pinia';

import sectionCard from '@/components/common/sectionCard.vue';
import statusPill from '@/components/common/statusPill.vue';
import flowResult from './flowResult.vue';
import { useAppConfigStore } from '@/stores/appConfig';
import { useWorkspaceStore } from '@/stores/workspace';

export default {
    name: 'RunsView',
    components: {
        sectionCard,
        statusPill,
        flowResult
    },
    data() {
        return {
            refreshing: false,
            busy: false,
            errorMessage: ''
        };
    },
    computed: {
        ...mapState(useAppConfigStore, ['resolvedTheme', 'local', 'formatDate']),
        ...mapState(useWorkspaceStore, ['endpointById', 'scheduleById', 'runs'])
    },
    async mounted() {
        await this.workspaceInitialize();
        await this.refreshRuns();
    },
    methods: {
        ...mapActions(useWorkspaceStore, {
            workspaceInitialize: 'initialize',
            refreshRuns: 'refreshRuns',
            removeRun: 'removeRun',
            clearRuns: 'clearRuns'
        }),
        endpointName(id) {
            return this.endpointById[id]?.name || '-';
        },
        endpointUrl(id) {
            return this.endpointById[id]?.url || '-';
        },
        statusClass(statusCode) {
            if (statusCode === null || statusCode === undefined) return '';
            if (statusCode >= 500) return 'failed';
            if (statusCode >= 400) return 'warning';
            return 'success';
        },
        async refresh() {
            this.refreshing = true;
            this.errorMessage = '';
            const result = await this.refreshRuns();
            this.refreshing = false;
            if (!result.ok) this.errorMessage = result.message;
        },
        confirmRemove(run) {
            this.$infoBox(this.local('Delete this run record?'), {
                title: this.local('Delete run record'), status: 'warning', theme: this.resolvedTheme,
                confirmTitle: this.local('Delete'), cancelTitle: this.local('Cancel'),
                confirm: async () => {
                    if (this.busy) return;
                    this.busy = true; this.errorMessage = '';
                    try { const result = await this.removeRun(run.id); if (!result.ok) this.errorMessage = result.message; }
                    finally { this.busy = false; }
                }
            });
        },
        confirmClear() {
            this.$infoBox(this.local('Delete all run records?'), {
                title: this.local('Clear run history'), status: 'warning', theme: this.resolvedTheme,
                confirmTitle: this.local('Clear all'), cancelTitle: this.local('Cancel'),
                confirm: async () => {
                    if (this.busy) return;
                    this.busy = true; this.errorMessage = '';
                    try { const result = await this.clearRuns(); if (!result.ok) this.errorMessage = result.message; }
                    finally { this.busy = false; }
                }
            });
        },
        triggerLabel(triggeredBy) {
            return this.local(triggeredBy === 'manual' ? 'Manual' : 'Schedule');
        }
    }
};
</script>

<style lang="scss" scoped>
.runs-page {
    .run-actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .response-detail { min-width: 0; max-width: 100%; flex-basis: 100%; }
    .response-detail pre { max-height: 260px; overflow: auto; white-space: pre-wrap; overflow-wrap: anywhere; padding: 10px; border-radius: 6px; background: var(--ph-surface-soft); color: var(--ph-text-secondary); }
    .run-nodes { padding: 10px 0; color: var(--ph-text-secondary); font-size: 12px; }
    .run-nodes summary { cursor: pointer; }
    .node-result { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; padding: 8px 12px; }
    .run-error { color: var(--ph-danger); overflow-wrap: anywhere; }
    .runs-table {
        min-width: 0;
        display: flex;
        flex-direction: column;
    }

    .runs-table__head,
    .runs-table__row {
        display: grid;
        grid-template-columns: minmax(230px, 1.6fr) 106px 82px 86px 96px 118px 34px;
        align-items: center;
        gap: 14px;
    }

    .runs-table__head {
        min-height: 36px;
        border-bottom: 1px solid var(--ph-border);
        color: var(--ph-text-muted);
        font-size: 10px;
        text-transform: uppercase;
    }

    .runs-table__row {
        min-height: 62px;
        border-bottom: 1px solid var(--ph-border-subtle);
        color: var(--ph-text-secondary);
        font-size: 12px;

        &:last-child {
            border-bottom: 0;
        }
    }

    .run-main {
        min-width: 0;
        display: flex;
        flex-direction: column;

        strong,
        span {
            @include nowrap;
        }

        strong {
            color: var(--ph-text);
            font-size: 13px;
            font-weight: 600;
        }

        span {
            margin-top: 4px;
            color: var(--ph-text-muted);
            font-size: 10px;
        }
    }

    .status-code {
        width: fit-content;
        padding: 4px 7px;
        border-radius: 6px;
        font-family: Consolas, 'Courier New', monospace;
        font-size: 11px;

        &.success {
            background: rgba(16, 124, 16, 0.1);
            color: var(--ph-success);
        }

        &.warning {
            background: rgba(157, 93, 0, 0.1);
            color: var(--ph-warning);
        }

        &.failed {
            background: rgba(196, 43, 28, 0.1);
            color: var(--ph-danger);
        }
    }

    .numeric-cell {
        font-variant-numeric: tabular-nums;
    }

    .trigger-cell {
        color: var(--ph-text-secondary);
    }

    @media (max-width: 820px) {
        .runs-table {
            overflow-x: auto;
        }

        .runs-table__head,
        .runs-table__row {
            min-width: 830px;
        }
    }
}
</style>
