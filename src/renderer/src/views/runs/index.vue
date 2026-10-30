<template>
    <div class="page-stack runs-page">
        <sectionCard
            :title="local('Run history')"
            :description="local('Inspect recent request results, status codes, and duration.')"
        >
            <template #actions>
                <fv-button
                    :theme="resolvedTheme"
                    border-radius="8"
                    icon="Refresh"
                    style="height: 34px"
                    @click="refresh"
                >
                    {{ local('Refresh') }}
                </fv-button>
            </template>

            <div class="runs-table">
                <div class="runs-table__head">
                    <span>{{ local('Request') }}</span>
                    <span>{{ local('Status') }}</span>
                    <span>{{ local('Status code') }}</span>
                    <span>{{ local('Duration') }}</span>
                    <span>{{ local('Triggered by') }}</span>
                    <span>{{ local('Started at') }}</span>
                </div>
                <div
                    v-for="run in runs"
                    :key="run.id"
                    class="runs-table__row"
                >
                    <div class="run-main">
                        <strong>{{ endpointName(run.endpointId) }}</strong>
                        <span>{{ endpointUrl(run.endpointId) }}</span>
                    </div>
                    <statusPill :status="run.status" />
                    <code
                        class="status-code"
                        :class="statusClass(run.statusCode)"
                    >
                        {{ run.statusCode }}
                    </code>
                    <span class="numeric-cell">{{ run.duration }} ms</span>
                    <span class="trigger-cell">
                        {{ triggerLabel(run.triggeredBy) }}
                    </span>
                    <span>{{ formatDate(run.startedAt) }}</span>
                </div>
            </div>
        </sectionCard>
    </div>
</template>

<script>
import { mapState } from 'pinia';

import sectionCard from '@/components/common/sectionCard.vue';
import statusPill from '@/components/common/statusPill.vue';
import { useAppConfigStore } from '@/stores/appConfig';
import { useWorkspaceStore } from '@/stores/workspace';

export default {
    name: 'RunsView',
    components: {
        sectionCard,
        statusPill
    },
    data() {
        return {
            refreshing: false
        };
    },
    computed: {
        ...mapState(useAppConfigStore, ['resolvedTheme', 'local', 'formatDate']),
        ...mapState(useWorkspaceStore, ['endpointById', 'runs'])
    },
    methods: {
        endpointName(id) {
            return this.endpointById[id]?.name || '-';
        },
        endpointUrl(id) {
            return this.endpointById[id]?.url || '-';
        },
        statusClass(statusCode) {
            if (statusCode >= 500) return 'failed';
            if (statusCode >= 400) return 'warning';
            return 'success';
        },
        refresh() {
            this.refreshing = true;
            window.setTimeout(() => {
                this.refreshing = false;
            }, 300);
        },
        triggerLabel(triggeredBy) {
            return this.local(triggeredBy === 'manual' ? 'Manual' : 'Schedule');
        }
    }
};
</script>

<style lang="scss" scoped>
.runs-page {
    .runs-table {
        min-width: 0;
        display: flex;
        flex-direction: column;
    }

    .runs-table__head,
    .runs-table__row {
        display: grid;
        grid-template-columns: minmax(230px, 1.6fr) 106px 82px 86px 96px 118px;
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
            min-width: 780px;
        }
    }
}
</style>
