<template>
    <div class="page-stack schedules-page">
        <sectionCard
            :title="local('Schedules')"
            :description="local('Schedules run while PowerHub is open.')"
        >
            <template #actions>
                <fv-button
                    :background="subColor"
                    border-radius="8"
                    style="width: 32px; height: 34px"
                    :title="local('New schedule')"
                    @click="
                        $router.push({
                            name: 'schedule-editor',
                            params: { id: 'new' }
                        })
                    "
                >
                    <i class="ms-Icon ms-Icon--Add"></i>
                </fv-button>
            </template>

            <div v-if="errorMessage" class="schedule-error">
                {{ errorMessage }}
            </div>
            <div class="schedule-grid">
                <article
                    v-for="schedule in schedules"
                    :key="schedule.id"
                    class="schedule-card"
                >
                    <header class="schedule-card__header">
                        <div class="schedule-main">
                            <span class="schedule-icon">
                                <i class="ms-Icon ms-Icon--DateTime"></i>
                            </span>
                            <div>
                                <h3>{{ schedule.name }}</h3>
                                <p>
                                    {{
                                        schedule.taskType === 'collection'
                                            ? schedule.collection
                                            : endpointName(schedule.endpointId)
                                    }}
                                </p>
                            </div>
                        </div>
                        <statusPill :status="schedule.lastStatus" />
                    </header>

                    <div class="cron-strip">
                        <code>{{ schedule.cron }}</code>
                        <span v-if="schedule.taskType === 'legacy'">{{
                            local(
                                'Edit and save this older task to enable scheduling.'
                            )
                        }}</span>
                    </div>

                    <dl class="schedule-meta">
                        <div>
                            <dt>{{ local('Next run') }}</dt>
                            <dd>
                                <time-rounder
                                    v-if="
                                        schedule.taskType !== 'legacy' &&
                                        schedule.nextRun
                                    "
                                    :model-value="schedule.nextRun"
                                    style="width: auto; font-weight: bold"
                                />
                                <template v-else>{{
                                    local('Not scheduled')
                                }}</template>
                            </dd>
                        </div>
                        <div>
                            <dt>{{ local('Last run') }}</dt>
                            <dd>
                                <time-rounder
                                    v-if="schedule.lastRun"
                                    :model-value="schedule.lastRun"
                                    style="width: auto; font-weight: bold"
                                />
                                <template v-else>-</template>
                            </dd>
                        </div>
                    </dl>

                    <footer class="schedule-card__footer">
                        <div class="schedule-status">
                            <fv-toggle-switch
                                :model-value="
                                    schedule.taskType !== 'legacy' &&
                                    schedule.enabled
                                "
                                :theme="resolvedTheme"
                                :width="60"
                                :height="25"
                                :switch-on-background="subColor"
                                :inside-content="true"
                                @update:model-value="
                                    toggleSchedule(schedule.id)
                                "
                            ></fv-toggle-switch>
                            <span>
                                {{
                                    schedule.taskType !== 'legacy' &&
                                    schedule.enabled
                                        ? local('Enabled')
                                        : local('Disabled')
                                }}
                            </span>
                        </div>
                        <div style="display: flex; gap: 5px">
                            <fv-button
                                :background="subColor"
                                :foreground="'black'"
                                border-radius="8"
                                style="width: 32px; height: 32px"
                                :title="local('Edit')"
                                @click="
                                    $router.push({
                                        name: 'schedule-editor',
                                        params: { id: schedule.id }
                                    })
                                "
                            >
                                <i class="ms-Icon ms-Icon--Edit"></i>
                            </fv-button>
                            <fv-button
                                :theme="resolvedTheme"
                                icon="Play"
                                border-radius="8"
                                style="width: 80px; height: 32px"
                                :title="local('Play')"
                                :disabled="
                                    runningId === schedule.id ||
                                    schedule.lastStatus === 'running'
                                "
                                @click="runSchedule(schedule)"
                            >
                                {{
                                    local(
                                        runningId === schedule.id ||
                                            schedule.lastStatus === 'running'
                                            ? 'Running'
                                            : 'Run now'
                                    )
                                }}
                            </fv-button>
                        </div>
                    </footer>
                </article>
            </div>
        </sectionCard>
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
    name: 'SchedulesView',
    components: {
        sectionCard,
        statusPill,
        timeRounder
    },
    data() {
        return { runningId: '', errorMessage: '', refreshTimer: null };
    },
    computed: {
        ...mapState(useThemeStore, ['subColor', 'gradient']),
        ...mapState(useAppConfigStore, ['resolvedTheme', 'local']),
        ...mapState(useWorkspaceStore, [
            'endpointById',
            'endpoints',
            'schedules'
        ])
    },
    async mounted() {
        const initialized = await this.workspaceInitialize();
        if (!initialized.ok) {
            this.errorMessage = initialized.message;
            return;
        }
        const refreshed = await this.refreshSchedules();
        if (!refreshed.ok) {
            this.errorMessage = refreshed.message;
            return;
        }
        this.refreshTimer = setInterval(() => this.refreshSchedules(), 10000);
    },
    beforeUnmount() {
        clearInterval(this.refreshTimer);
    },
    methods: {
        ...mapActions(useWorkspaceStore, {
            workspaceInitialize: 'loadWorkspace',
            refreshSchedules: 'refreshSchedules',
            executeSchedule: 'runSchedule',
            toggleScheduleAction: 'toggleSchedule'
        }),
        endpointName(id) {
            return this.endpointById[id]?.name || '-';
        },
        scheduleError(message) {
            const keys = [
                'Edit and save this legacy schedule before enabling it.',
                'Edit and save this legacy schedule before running it.',
                'This schedule is already running.',
                'Select an enabled endpoint.',
                'Connect at least one enabled endpoint to Start.'
            ];
            const key = keys.find((item) =>
                String(message || '').includes(item)
            );
            return key ? this.local(key) : message;
        },
        async toggleSchedule(id) {
            this.errorMessage = '';
            const result = await this.toggleScheduleAction(id);
            if (!result.ok)
                this.errorMessage = this.scheduleError(result.message);
        },
        async runSchedule(schedule) {
            this.errorMessage = '';
            this.runningId = schedule.id;
            const result = await this.executeSchedule(schedule.id);
            this.runningId = '';
            if (!result.ok)
                this.errorMessage = this.scheduleError(result.message);
        }
    }
};
</script>

<style lang="scss" scoped>
.schedules-page {
    min-height: 0;
    flex: 1;
    overflow: hidden;

    .schedule-error {
        margin-bottom: 12px;
        color: var(--ph-danger);
    }
    .schedule-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr));
        gap: 14px;
    }

    .schedule-card {
        min-width: 0;
        padding: 20px;
        border: 1px solid var(--ph-border-subtle);
        border-radius: 26px;
        background: var(--ph-card-gradient-mist);
        box-shadow: var(--ph-shadow-sm);
        display: flex;
        flex-direction: column;
        gap: 14px;
    }

    .schedule-card__header,
    .schedule-card__footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
    }

    .schedule-main {
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 10px;

        h3,
        p {
            @include nowrap;
        }

        h3 {
            margin: 0;
            color: var(--ph-text);
            font-size: 14px;
            line-height: 1.35;
        }

        p {
            margin: 3px 0 0;
            color: var(--ph-text-muted);
            font-size: 11px;
        }
    }

    .schedule-icon {
        width: 38px;
        height: 38px;
        flex: 0 0 38px;
        border-radius: 11px;
        background: var(--ph-card-gradient-olive);
        color: whitesmoke;
        display: grid;
        place-items: center;
    }

    .cron-strip {
        min-height: 40px;
        padding: 0 12px;
        border: 1px solid var(--ph-border);
        border-radius: 10px;
        background: var(--ph-surface);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;

        code {
            color: var(--ph-accent);
            font-family: Consolas, 'Courier New', monospace;
            font-size: 12px;
        }

        span {
            @include nowrap;

            color: var(--ph-text-muted);
            font-size: 10px;
        }
    }

    .schedule-meta {
        margin: 0;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;

        div {
            min-width: 0;
        }

        dt,
        dd {
            margin: 0;
        }

        dt {
            color: var(--ph-text-muted);
            font-size: 10px;
        }

        dd {
            @include nowrap;

            margin-top: 4px;
            color: var(--ph-text-secondary);
            font-size: 12px;
        }
    }

    .schedule-status {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--ph-text-secondary);
        font-size: 11px;
    }

    .editor-form {
        display: flex;
        flex-direction: column;
        gap: 16px;

        label {
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 7px;

            > span {
                color: var(--ph-text-secondary);
                font-size: 12px;
            }

            :deep(.fv-TextBox),
            :deep(.fv-DropDown) {
                width: 100%;
                min-width: 0;
            }
        }
    }

    .switch-row {
        min-height: 42px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        color: var(--ph-text-secondary);
        font-size: 12px;
    }

    .panel-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
    }
}
</style>
