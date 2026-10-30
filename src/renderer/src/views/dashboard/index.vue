<template>
    <div class="page-stack dashboard-page">
        <section class="metrics-grid">
            <article
                v-for="metric in metrics"
                :key="metric.label"
                class="metric-card"
            >
                <div class="metric-icon" :class="metric.tone">
                    <i class="ms-Icon" :class="metric.icon"></i>
                </div>
                <div class="metric-copy">
                    <span>{{ metric.label }}</span>
                    <strong>{{ metric.value }}</strong>
                    <small>{{ metric.hint }}</small>
                </div>
            </article>
        </section>

        <div class="dashboard-grid">
            <sectionCard
                :title="local('Recent runs')"
                :description="local('Inspect recent request results, status codes, and duration.')"
            >
                <div class="data-table">
                    <div class="data-table__head">
                        <span>{{ local('Endpoint') }}</span>
                        <span>{{ local('Status') }}</span>
                        <span>{{ local('Latency') }}</span>
                        <span>{{ local('Started at') }}</span>
                    </div>
                    <div
                        v-for="run in recentRuns"
                        :key="run.id"
                        class="data-table__row"
                    >
                        <div class="primary-cell">
                            <strong>{{ endpointName(run.endpointId) }}</strong>
                            <span>{{ endpointUrl(run.endpointId) }}</span>
                        </div>
                        <statusPill :status="run.status" />
                        <span class="numeric-cell">{{ run.duration }} ms</span>
                        <span>{{ formatDate(run.startedAt) }}</span>
                    </div>
                </div>
            </sectionCard>

            <sectionCard :title="local('Upcoming')">
                <div class="schedule-list">
                    <div
                        v-for="schedule in upcomingSchedules"
                        :key="schedule.id"
                        class="schedule-item"
                    >
                        <div class="schedule-marker">
                            <i class="ms-Icon ms-Icon--Clock"></i>
                        </div>
                        <div class="schedule-copy">
                            <strong>{{ schedule.name }}</strong>
                            <span>{{ endpointName(schedule.endpointId) }}</span>
                        </div>
                        <div class="schedule-time">
                            <strong>{{
                                formatDate(schedule.nextRun)
                            }}</strong>
                            <span>{{ schedule.cron }}</span>
                        </div>
                    </div>
                </div>
            </sectionCard>
        </div>
    </div>
</template>

<script>
import { mapActions, mapState } from 'pinia';

import sectionCard from '@/components/common/sectionCard.vue';
import statusPill from '@/components/common/statusPill.vue';
import { useAppConfigStore } from '@/stores/appConfig';
import { useWorkspaceStore } from '@/stores/workspace';

export default {
    name: 'DashboardView',
    components: {
        sectionCard,
        statusPill
    },
    computed: {
        ...mapState(useAppConfigStore, ['local', 'formatDate']),
        ...mapState(useWorkspaceStore, [
            'endpointById',
            'endpoints',
            'runs',
            'schedules',
            'healthyEndpoints',
            'activeSchedules',
            'successRate',
            'averageLatency'
        ]),
        recentRuns() {
            return this.runs.slice(0, 6);
        },
        upcomingSchedules() {
            return this.schedules
                .filter((schedule) => schedule.enabled && schedule.nextRun)
                .sort(
                    (left, right) =>
                        new Date(left.nextRun) - new Date(right.nextRun)
                )
                .slice(0, 4);
        },
        metrics() {
            return [
                {
                    label: this.local('Endpoint health'),
                    value: `${this.healthyEndpoints}/${this.endpoints.length}`,
                    hint: this.local('Healthy'),
                    icon: 'ms-Icon--Heart',
                    tone: 'success'
                },
                {
                    label: this.local('Active schedules'),
                    value: this.activeSchedules,
                    hint: this.local('Active'),
                    icon: 'ms-Icon--DateTime',
                    tone: 'accent'
                },
                {
                    label: this.local('Success rate'),
                    value: `${this.successRate}%`,
                    hint: this.local('Success'),
                    icon: 'ms-Icon--CheckMark',
                    tone: 'violet'
                },
                {
                    label: this.local('Average latency'),
                    value: `${this.averageLatency} ms`,
                    hint: this.local('Latency'),
                    icon: 'ms-Icon--SpeedHigh',
                    tone: 'warning'
                }
            ];
        }
    },
    async mounted() {
        await this.workspaceInitialize();
    },
    methods: {
        ...mapActions(useWorkspaceStore, {
            workspaceInitialize: 'initialize'
        }),
        endpointName(id) {
            return this.endpointById[id]?.name || '-';
        },
        endpointUrl(id) {
            return this.endpointById[id]?.url || '-';
        }
    }
};
</script>

<style lang="scss" scoped>
.dashboard-page {
    .metrics-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 14px;
    }

    .metric-card {
        min-width: 0;
        padding: 18px;
        border: 1px solid var(--ph-border);
        border-radius: 16px;
        background: var(--ph-surface);
        box-shadow: var(--ph-shadow-sm);
        display: flex;
        align-items: center;
        gap: 14px;
    }

    .metric-icon {
        width: 42px;
        height: 42px;
        flex: 0 0 42px;
        border-radius: 12px;
        display: grid;
        place-items: center;

        .ms-Icon {
            font-size: 18px;
        }

        &.success {
            background: rgba(16, 124, 16, 0.11);
            color: var(--ph-success);
        }

        &.accent {
            background: var(--ph-accent-soft);
            color: var(--ph-accent);
        }

        &.violet {
            background: rgba(117, 91, 202, 0.12);
            color: #755bca;
        }

        &.warning {
            background: rgba(157, 93, 0, 0.11);
            color: var(--ph-warning);
        }
    }

    .metric-copy {
        min-width: 0;
        display: flex;
        flex-direction: column;

        span,
        small {
            @include nowrap;

            color: var(--ph-text-secondary);
        }

        span {
            font-size: 12px;
        }

        strong {
            margin: 4px 0 2px;
            color: var(--ph-text);
            font-size: 23px;
            line-height: 1.2;
        }

        small {
            color: var(--ph-text-muted);
            font-size: 10px;
        }
    }

    .dashboard-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.55fr) minmax(300px, 0.8fr);
        gap: 14px;
        align-items: start;
    }

    .data-table {
        min-width: 0;
        display: flex;
        flex-direction: column;
    }

    .data-table__head,
    .data-table__row {
        min-width: 0;
        display: grid;
        grid-template-columns: minmax(180px, 1.5fr) 100px 90px 116px;
        align-items: center;
        gap: 14px;
    }

    .data-table__head {
        min-height: 34px;
        border-bottom: 1px solid var(--ph-border);
        color: var(--ph-text-muted);
        font-size: 10px;
        text-transform: uppercase;
    }

    .data-table__row {
        min-height: 58px;
        border-bottom: 1px solid var(--ph-border-subtle);
        color: var(--ph-text-secondary);
        font-size: 12px;

        &:last-child {
            border-bottom: 0;
        }
    }

    .primary-cell {
        min-width: 0;
        display: flex;
        flex-direction: column;

        strong,
        span {
            @include nowrap;
        }

        strong {
            color: var(--ph-text);
            font-size: 12px;
            font-weight: 600;
        }

        span {
            margin-top: 3px;
            color: var(--ph-text-muted);
            font-size: 10px;
        }
    }

    .numeric-cell {
        font-variant-numeric: tabular-nums;
    }

    .schedule-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .schedule-item {
        min-height: 64px;
        padding: 10px;
        border-radius: 12px;
        background: var(--ph-surface-soft);
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .schedule-marker {
        width: 34px;
        height: 34px;
        flex: 0 0 34px;
        border-radius: 10px;
        background: var(--ph-accent-soft);
        color: var(--ph-accent);
        display: grid;
        place-items: center;
    }

    .schedule-copy,
    .schedule-time {
        min-width: 0;
        display: flex;
        flex-direction: column;

        strong,
        span {
            @include nowrap;
        }
    }

    .schedule-copy {
        flex: 1;

        strong {
            color: var(--ph-text);
            font-size: 12px;
        }

        span {
            margin-top: 3px;
            color: var(--ph-text-muted);
            font-size: 10px;
        }
    }

    .schedule-time {
        flex: 0 0 auto;
        align-items: flex-end;

        strong {
            color: var(--ph-text-secondary);
            font-size: 11px;
            font-weight: 500;
        }

        span {
            margin-top: 3px;
            color: var(--ph-text-muted);
            font-size: 10px;
        }
    }

    @media (max-width: 1180px) {
        .metrics-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .dashboard-grid {
            grid-template-columns: 1fr;
        }
    }

    @media (max-width: 640px) {
        .metrics-grid {
            grid-template-columns: 1fr;
        }

        .data-table {
            overflow-x: auto;
        }

        .data-table__head,
        .data-table__row {
            min-width: 620px;
        }
    }
}
</style>
