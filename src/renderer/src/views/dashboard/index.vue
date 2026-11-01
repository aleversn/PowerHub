<template>
    <div class="page-stack dashboard-page">
        <section class="metrics-grid">
            <article
                v-for="metric in metrics"
                :key="metric.label"
                class="metric-card"
                :class="metric.tone"
            >
                <div class="metric-header">
                    <span>{{ metric.label }}</span>
                    <div class="metric-icon" aria-hidden="true">
                        <i class="ms-Icon" :class="metric.icon"></i>
                    </div>
                </div>
                <div class="metric-copy">
                    <strong>{{ metric.value }}</strong>
                    <small
                        :class="metric.hintStatus"
                        :style="{ '--metric-hint-default': subColor }"
                    >{{ metric.hint }}</small>
                </div>
            </article>
        </section>

        <div class="dashboard-grid">
            <sectionCard
                :fill="false"
                class="dashboard-section"
                :title="local('Recent runs')"
                :description="
                    local(
                        'Inspect recent request results, status codes, and duration.'
                    )
                "
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

            <sectionCard :fill="false" class="dashboard-section" :title="local('Upcoming')">
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
                            <strong>{{ formatDate(schedule.nextRun) }}</strong>
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
import { useThemeStore } from '@/stores/theme';
import { useWorkspaceStore } from '@/stores/workspace';

export default {
    name: 'DashboardView',
    components: {
        sectionCard,
        statusPill
    },
    computed: {
        ...mapState(useAppConfigStore, ['local', 'formatDate']),
        ...mapState(useThemeStore, ['subColor']),
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
                    hintStatus: 'success',
                    icon: 'ms-Icon--Heart',
                    tone: 'success'
                },
                {
                    label: this.local('Active schedules'),
                    value: this.activeSchedules,
                    hint: this.local('Active'),
                    hintStatus: 'running',
                    icon: 'ms-Icon--DateTime',
                    tone: 'accent'
                },
                {
                    label: this.local('Success rate'),
                    value: `${this.successRate}%`,
                    hint: this.local('Success'),
                    hintStatus: 'success',
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
    min-height: 0;
    flex: 1;
    padding: 15px;
    box-sizing: border-box;
    overflow: auto;

    .metrics-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 16px;
    }

    .metric-card {
        min-width: 0;
        min-height: 130px;
        padding: 22px;
        border: 1px solid var(--ph-border-subtle);
        border-radius: 26px;
        background: var(--ph-card-gradient-porcelain);
        box-shadow: var(--ph-shadow-sm);
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 24px;

        &.accent {
            background: var(--ph-card-gradient-rose);
            color: #202124;
        }

        &.violet {
            background: var(--ph-card-gradient-mist);
        }

        &.warning {
            background: var(--ph-card-gradient-sunset);
            color: #202124;
        }
    }

    .metric-header {
        min-width: 0;
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        color: var(--ph-text-secondary);
        font-size: 13px;
        line-height: 1.4;
    }

    .metric-icon {
        width: 38px;
        height: 38px;
        flex: 0 0 38px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        color: var(--ph-text);
        display: grid;
        place-items: center;

        .ms-Icon {
            font-size: 16px;
        }
    }

    .metric-copy {
        min-width: 0;
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 8px;

        strong {
            color: var(--ph-text);
            font-size: clamp(26px, 2.5vw, 34px);
            font-weight: 600;
            line-height: 1.1;
            font-variant-numeric: tabular-nums;
        }

        small {
            padding: 5px 10px;
            border-radius: 999px;
            background: var(--metric-hint-default);
            color: #202124;
            font-size: 11px;

            &.running {
                background: rgba(236, 159, 78, 0.8);
                color: whitesmoke;
            }

            &.success {
                background: rgba(147, 215, 121, 1);
                color: whitesmoke;
            }

            &.failed {
                background: rgba(255, 71, 100, 0.8);
                color: whitesmoke;
            }
        }
    }

    .metric-card.accent,
    .metric-card.warning {
        .metric-header,
        .metric-copy strong {
            color: #202124;
        }
    }

    .dashboard-section {
        border-color: var(--ph-border-subtle);
        border-radius: 26px;
        background: var(--ph-card-gradient-mist);
    }

    .dashboard-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.55fr) minmax(300px, 0.8fr);
        gap: 16px;
        align-items: start;
    }

    .data-table {
        min-width: 0;
        display: flex;
        flex-direction: column;
        overflow-x: auto;
    }

    .data-table__head,
    .data-table__row {
        min-width: 528px;
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
        border-radius: 18px;
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
        background: var(--ph-card-gradient-terracotta);
        color: whitesmoke;
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

    }
}
</style>
