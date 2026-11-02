<template>
    <div class="page-stack runs-page">
        <sectionCard
            :title="local('Run history')"
            :description="
                local(
                    'Inspect recent request results, status codes, and duration.'
                )
            "
        >
            <template #info>
                <div class="run-actions">
                    <fv-button
                        :background="subColor"
                        border-radius="8"
                        style="width: 32px; height: 34px"
                        :title="local('Refresh')"
                        @click="refresh"
                    >
                        <i class="ms-Icon ms-Icon--Refresh"></i>
                    </fv-button>
                </div>
            </template>
            <template #actions>
                <div class="run-actions">
                    <fv-button
                        theme="dark"
                        :background="'rgba(200, 38, 45, 1)'"
                        :disabled="
                            busy ||
                            !runs.length ||
                            runs.some((run) => run.status === 'running')
                        "
                        style="width: 32px; height: 34px"
                        :title="local('Clear all')"
                        @click="confirmClear"
                    >
                        <i class="ms-Icon ms-Icon--Delete"></i>
                    </fv-button>
                </div>
            </template>

            <div v-if="errorMessage" class="run-error" role="alert">
                {{ errorMessage }}
            </div>

            <div class="runs-table">
                <div class="runs-table__head">
                    <span class="run-column-request">{{
                        local('Request')
                    }}</span>
                    <span class="run-column-status">{{ local('Status') }}</span>
                    <span class="run-column-code">{{
                        local('Status code')
                    }}</span>
                    <span class="run-column-duration">{{
                        local('Duration')
                    }}</span>
                    <span class="run-column-trigger">{{
                        local('Triggered by')
                    }}</span>
                    <span class="run-column-time">{{
                        local('Started at')
                    }}</span>
                    <span class="run-column-action">{{ local('Action') }}</span>
                </div>
                <div v-for="run in runs" :key="run.id" class="run-card">
                    <div class="runs-table__row">
                        <div class="run-main run-column-request">
                            <strong>{{
                                run.nodeResults?.length
                                    ? scheduleById[run.scheduleId]?.name ||
                                      run.nodeResults[0].name
                                    : endpointName(run.endpointId)
                            }}</strong>
                            <span>{{ endpointUrl(run.endpointId) }}</span>
                        </div>
                        <div class="run-column-status">
                            <statusPill :status="run.status" />
                        </div>
                        <div class="run-column-code">
                            <code
                                class="status-code"
                                :class="statusClass(run.statusCode)"
                            >
                                {{ run.statusCode }}
                            </code>
                        </div>
                        <div class="run-column-duration">
                            <fv-tag
                                class="run-tag numeric-cell"
                                :style="{ '--run-tag-color': subColor }"
                                :model-value="[
                                    {
                                        text:
                                            run.duration == null
                                                ? '-'
                                                : `${run.duration} ms`
                                    }
                                ]"
                                :theme="resolvedTheme"
                                :font-size="11"
                                :border-radius="8"
                            />
                        </div>
                        <div class="run-column-trigger">
                            <fv-tag
                                class="run-tag"
                                :style="{ '--run-tag-color': subColor }"
                                :model-value="[
                                    { text: triggerLabel(run.triggeredBy) }
                                ]"
                                :theme="resolvedTheme"
                                :font-size="11"
                                :border-radius="8"
                            />
                        </div>
                        <div class="run-column-time">
                            <time-rounder
                                :model-value="run.startedAt"
                                style="width: auto; font-weight: bold"
                                :style="{ color: color }"
                            />
                        </div>
                        <div class="run-column-action">
                            <fv-button
                                theme="dark"
                                background="rgba(200, 38, 45, 1)"
                                :disabled="busy || run.status === 'running'"
                                :title="local('Delete')"
                                :aria-label="local('Delete')"
                                style="width: 34px; height: 34px"
                                @click="confirmRemove(run)"
                                ><i class="ms-Icon ms-Icon--Delete"></i
                            ></fv-button>
                        </div>
                    </div>
                    <expandable-section
                        class="run-nodes"
                        :title="
                            run.nodeResults?.length
                                ? `${local('Node results')} (${run.nodeResults.length})`
                                : local('Execution result')
                        "
                    >
                        <div v-if="run.flowSnapshot?.nodes?.length">
                            <strong>{{ local('Execution flow') }}</strong>
                            <flowResult :run="run" />
                        </div>
                        <div v-if="run.error" class="run-error">
                            {{ local(run.error) }}
                        </div>
                        <expandable-section
                            v-if="
                                !run.nodeResults?.length &&
                                run.response !== null &&
                                run.response !== undefined
                            "
                            class="response-detail"
                            :title="local('Response body')"
                            :default-open="true"
                        >
                            <file-response
                                v-if="
                                    fileResponse(
                                        run.response,
                                        run.responseHeaders
                                    )
                                "
                                :file="
                                    fileResponse(
                                        run.response,
                                        run.responseHeaders
                                    )
                                "
                            />
                            <response-text
                                v-else
                                :text="run.response"
                                :headers="run.responseHeaders"
                            />
                        </expandable-section>
                        <div
                            v-for="(node, index) in run.nodeResults"
                            :key="index"
                            class="node-result"
                        >
                            <span>{{ index + 1 }}. {{ node.name }}</span>
                            <code>{{ node.method }}</code>
                            <statusPill :status="node.status" />
                            <span
                                >{{ node.statusCode || '-' }} ·
                                {{ node.duration ?? '-' }} ms</span
                            >
                            <span v-if="node.error" class="run-error">{{
                                local(node.error)
                            }}</span>
                            <expandable-section
                                v-if="
                                    node.response !== null &&
                                    node.response !== undefined
                                "
                                class="response-detail"
                                :title="local('Response body')"
                                :default-open="true"
                            >
                                <file-response
                                    v-if="
                                        fileResponse(
                                            node.response,
                                            node.responseHeaders
                                        )
                                    "
                                    :file="
                                        fileResponse(
                                            node.response,
                                            node.responseHeaders
                                        )
                                    "
                                />
                                <response-text
                                    v-else
                                    :text="node.response"
                                    :headers="node.responseHeaders"
                                />
                            </expandable-section>
                        </div>
                    </expandable-section>
                </div>
            </div>
        </sectionCard>
    </div>
</template>

<script>
import { mapActions, mapState } from 'pinia';

import sectionCard from '@/components/common/sectionCard.vue';
import statusPill from '@/components/common/statusPill.vue';
import flowResult from './flowResult.vue';
import FileResponse from '@/components/common/fileResponse.vue';
import ResponseText from '@/components/common/responseText.vue';
import ExpandableSection from '@/components/common/expandableSection.vue';
import { fileResponse } from '@/js/responseFile';
import timeRounder from '@/components/general/timeRounder.vue';
import { useThemeStore } from '@/stores/theme';
import { useAppConfigStore } from '@/stores/appConfig';
import { useWorkspaceStore } from '@/stores/workspace';

export default {
    name: 'RunsView',
    components: {
        sectionCard,
        statusPill,
        flowResult,
        FileResponse,
        ResponseText,
        ExpandableSection,
        timeRounder
    },
    data() {
        return {
            refreshing: false,
            busy: false,
            errorMessage: ''
        };
    },
    computed: {
        ...mapState(useAppConfigStore, ['resolvedTheme', 'local']),
        ...mapState(useThemeStore, ['color', 'subColor']),
        ...mapState(useWorkspaceStore, ['endpointById', 'scheduleById', 'runs'])
    },
    async mounted() {
        await this.workspaceInitialize();
        await this.refreshRuns();
    },
    methods: {
        fileResponse,
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
            return this.endpointById[id]?.url || this.local('Collection');
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
                title: this.local('Delete run record'),
                status: 'warning',
                theme: this.resolvedTheme,
                confirmTitle: this.local('Delete'),
                cancelTitle: this.local('Cancel'),
                confirm: async () => {
                    if (this.busy) return;
                    this.busy = true;
                    this.errorMessage = '';
                    try {
                        const result = await this.removeRun(run.id);
                        if (!result.ok) this.errorMessage = result.message;
                    } finally {
                        this.busy = false;
                    }
                }
            });
        },
        confirmClear() {
            this.$infoBox(this.local('Delete all run records?'), {
                title: this.local('Clear run history'),
                status: 'warning',
                theme: this.resolvedTheme,
                confirmTitle: this.local('Clear all'),
                cancelTitle: this.local('Cancel'),
                confirm: async () => {
                    if (this.busy) return;
                    this.busy = true;
                    this.errorMessage = '';
                    try {
                        const result = await this.clearRuns();
                        if (!result.ok) this.errorMessage = result.message;
                    } finally {
                        this.busy = false;
                    }
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
    min-height: 0;
    flex: 1;
    overflow: hidden;

    .run-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
    }
    .response-detail {
        min-width: 0;
        max-width: 100%;
        flex-basis: 100%;
    }
    .response-detail pre {
        max-height: 260px;
        overflow: auto;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        padding: 10px;
        border-radius: 6px;
        background: var(--ph-surface-soft);
        color: var(--ph-text-secondary);
    }
    .run-nodes {
        padding: 0 16px 14px;
        color: var(--ph-text-secondary);
        font-size: 12px;
    }
    .run-nodes summary {
        cursor: pointer;
    }
    .node-result {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        align-items: center;
        padding: 8px 12px;
    }
    .run-error {
        color: var(--ph-danger);
        overflow-wrap: anywhere;
    }
    .runs-table {
        min-width: 0;
        display: flex;
        flex-direction: column;
        overflow-x: auto;
    }

    .runs-table__head,
    .runs-table__row {
        min-width: 880px;
        display: flex;
        align-items: center;
        gap: 14px;
    }

    .runs-table__head {
        box-sizing: border-box;
        padding: 0 17px;
        min-height: 36px;
        border-bottom: 1px solid var(--ph-border);
        color: var(--ph-text-muted);
        font-size: 10px;
        text-transform: uppercase;
    }

    .run-card {
        position: relative;
        width: 100%;
        flex-shrink: 0;
        min-width: 880px;
        margin-top: 10px;
        border: 1px solid var(--ph-border-subtle);
        border-radius: 14px;
        background: color-mix(in srgb, var(--ph-surface) 65%, transparent);
        box-sizing: border-box;
        overflow: hidden;
    }

    .runs-table__row {
        min-width: 0;
        position: relative;
        width: 100%;
        box-sizing: border-box;
        padding: 12px 16px;
        min-height: 62px;
        color: var(--ph-text-secondary);
        font-size: 12px;
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
        @include HcenterVcenter;

        min-width: fit-content;
        width: 60px;
        height: 20px;
        padding: 4px 7px;
        border-radius: 12px;
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

    .run-tag {
        min-width: 0;

        :deep(.fv-tag-item) {
            background: color-mix(
                in srgb,
                var(--run-tag-color) 24%,
                var(--ph-surface)
            );
            border-color: transparent;
            color: var(--ph-text);
        }
    }

    .run-column-request {
        flex: 1 1 230px;
        min-width: 230px;
    }
    .run-column-status {
        flex: 0 0 80px;
        min-width: 0;
    }
    .run-column-code {
        flex: 0 0 82px;
        min-width: 0;
    }
    .run-column-duration {
        flex: 0 0 86px;
        min-width: 0;
    }
    .run-column-trigger {
        flex: 0 0 96px;
        min-width: 0;
    }
    .run-column-time {
        flex: 0 0 120px;
        min-width: 0;
    }
    .run-column-action {
        flex: 0 0 50px;
        text-align: center;
    }

    @media (max-width: 820px) {
        .runs-table {
            overflow-x: auto;
        }

        .runs-table__head,
        .run-card {
            min-width: 880px;
        }
    }
}
</style>
