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
                            <strong>{{ runName(run) }}</strong>
                            <span>{{ run.endpointId ? endpointUrl(run.endpointId) : local('Collection') }}</span>
                        </div>
                        <div><statusPill :status="run.status" /></div>
                        <fv-tag class="run-tag numeric-cell" :style="{ '--run-tag-color': subColor }" :model-value="[{ text: run.duration == null ? '-' : `${run.duration} ms` }]" :theme="resolvedTheme" :font-size="11" :border-radius="8" />
                        <div class="recent-time"><time-rounder :model-value="run.startedAt" :style="{ color: color, fontWeight: 'bold', width: 'auto' }" /></div>
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
                            <span>{{ schedule.taskType === 'collection' ? local('Collection') : endpointName(schedule.endpointId) }}</span>
                        </div>
                        <div class="schedule-time">
                            <time-rounder :model-value="schedule.nextRun" :style="{ color: color, fontWeight: 'bold', width: 'auto' }" />
                            <code class="schedule-cron">{{ schedule.cron }}</code>
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
import timeRounder from '@/components/general/timeRounder.vue';
import { useAppConfigStore } from '@/stores/appConfig';
import { useThemeStore } from '@/stores/theme';
import { useWorkspaceStore } from '@/stores/workspace';

export default {
    name: 'DashboardView',
    components: {
        sectionCard,
        statusPill,
        timeRounder
    },
    computed: {
        ...mapState(useAppConfigStore, ['local', 'resolvedTheme']),
        ...mapState(useThemeStore, ['color', 'subColor']),
        ...mapState(useWorkspaceStore, [
            'endpointById',
            'scheduleById',
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
        runName(run) {
            return this.scheduleById[run.scheduleId]?.name || this.endpointById[run.endpointId]?.name || run.nodeResults?.[0]?.name || '-';
        },
        endpointName(id) {
            return this.endpointById[id]?.name || '-';
        },
        endpointUrl(id) {
            return this.endpointById[id]?.url || this.local('Collection');
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
        box-sizing: border-box;
        min-width: 560px;
        display: flex;
        align-items: center;
        gap: 14px;

        > :first-child { flex: 1 1 180px; min-width: 180px; }
        > :nth-child(2) { flex: 0 0 100px; }
        > :nth-child(3) { flex: 0 0 90px; }
        > :nth-child(4) { flex: 0 0 116px; min-width: 0; }
    }

    .data-table__head {
        min-height: 34px;
        padding: 0 16px;
        border-bottom: 1px solid var(--ph-border);
        color: var(--ph-text-muted);
        font-size: 10px;
    }

    .data-table__row {
        min-height: 68px;
        margin-top: 10px;
        padding: 12px 15px;
        border: 1px solid var(--ph-border-subtle);
        border-radius: 14px;
        background: color-mix(in srgb, var(--ph-surface) 65%, transparent);
        color: var(--ph-text-secondary);
        font-size: 12px;
    }

    .recent-time { display: flex; align-items: center; }

    .run-tag {
        min-width: 0;

        :deep(.fv-tag-item) {
            background: color-mix(in srgb, var(--run-tag-color) 24%, var(--ph-surface));
            border-color: transparent;
            color: var(--ph-text);
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
        flex-wrap: wrap;
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

    .schedule-copy {
        display: flex;
        flex: 1 1 100px;
        flex-direction: column;
        min-width: 0;
        gap: 3px;

        strong, span {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        strong { color: var(--ph-text); font-size: 12px; }
        span { color: var(--ph-text-muted); font-size: 10px; }
    }

    .schedule-time {
        display: flex;
        flex: 0 0 auto;
        flex-direction: column;
        align-items: flex-end;
        margin-left: auto;
        min-width: 0;
        gap: 6px;
    }

    .schedule-cron {
        max-width: 100%;
        box-sizing: border-box;
        padding: 7px 10px;
        border: 1px solid var(--ph-border);
        border-radius: 10px;
        background: var(--ph-surface);
        color: var(--ph-text);
        font-family: var(--ph-code-font);
        font-size: 11px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
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
