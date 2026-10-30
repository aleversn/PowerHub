<template>
    <div class="page-stack">
        <sectionCard
            :title="local('Schedules')"
            :description="local('Run HTTP requests on a Cron or interval plan. Demo data is local.')"
        >
            <template #actions>
                <fv-button
                    :theme="resolvedTheme"
                    background="#0078d4"
                    foreground="#ffffff"
                    border-radius="8"
                    icon="Add"
                    style="height: 34px"
                    @click="editorOpen = true"
                >
                    {{ local('New schedule') }}
                </fv-button>
            </template>

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
                                <p>{{ endpointName(schedule.endpointId) }}</p>
                            </div>
                        </div>
                        <statusPill :status="schedule.lastStatus" />
                    </header>

                    <div class="cron-strip">
                        <code>{{ schedule.cron }}</code>
                    </div>

                    <dl class="schedule-meta">
                        <div>
                            <dt>{{ local('Next run') }}</dt>
                            <dd>
                                {{
                                    schedule.nextRun
                                        ? formatDate(schedule.nextRun)
                                        : local('Not scheduled')
                                }}
                            </dd>
                        </div>
                        <div>
                            <dt>{{ local('Last run') }}</dt>
                            <dd>
                                {{
                                    schedule.lastRun
                                        ? formatDate(schedule.lastRun)
                                        : '-'
                                }}
                            </dd>
                        </div>
                    </dl>

                    <footer class="schedule-card__footer">
                        <div class="schedule-status">
                            <fv-toggle-switch
                                :model-value="schedule.enabled"
                                :theme="resolvedTheme"
                                :width="38"
                                :height="20"
                                switch-on-background="#0078d4"
                                @update:model-value="
                                    toggleSchedule(schedule.id)
                                "
                            ></fv-toggle-switch>
                            <span>
                                {{
                                    schedule.enabled
                                        ? local('Enabled')
                                        : local('Disabled')
                                }}
                            </span>
                        </div>
                        <fv-button
                            :theme="resolvedTheme"
                            border-radius="8"
                            style="height: 32px"
                            icon="Play"
                            @click="runSchedule(schedule)"
                        >
                            {{ local('Run now') }}
                        </fv-button>
                    </footer>
                </article>
            </div>
        </sectionCard>

        <fv-panel
            v-model="editorOpen"
            :title="local('Schedule editor')"
            :theme="resolvedTheme"
            width="460px"
            :is-footer="true"
            :is-central-side="true"
            :is-light-dismiss="true"
        >
            <template #container>
                <div class="editor-form">
                    <label>
                        <span>{{ local('Name') }}</span>
                        <fv-text-box
                            v-model="newSchedule.name"
                            :theme="resolvedTheme"
                            :placeholder="local('Example: Production health check')"
                            border-radius="8"
                        ></fv-text-box>
                    </label>
                    <label>
                        <span>{{ local('Endpoint') }}</span>
                        <fv-drop-down
                            :model-value="selectedEndpoint"
                            :options="endpointOptions"
                            :theme="resolvedTheme"
                            border-radius="8"
                            @update:model-value="changeEndpoint"
                        ></fv-drop-down>
                    </label>
                    <label>
                        <span>{{ local('Cron expression') }}</span>
                        <fv-text-box
                            v-model="newSchedule.cron"
                            :theme="resolvedTheme"
                            :placeholder="local('*/15 * * * *')"
                            border-radius="8"
                        ></fv-text-box>
                    </label>
                    <div class="switch-row">
                        <span>{{ local('Enable this schedule immediately') }}</span>
                        <fv-toggle-switch
                            v-model="newSchedule.enabled"
                            :theme="resolvedTheme"
                            :width="38"
                            :height="20"
                            switch-on-background="#0078d4"
                        ></fv-toggle-switch>
                    </div>
                </div>
            </template>
            <template #footer>
                <div class="panel-actions">
                    <fv-button
                        :theme="resolvedTheme"
                        border-radius="8"
                        style="height: 34px"
                        @click="editorOpen = false"
                    >
                        {{ local('Cancel') }}
                    </fv-button>
                    <fv-button
                        :theme="resolvedTheme"
                        background="#0078d4"
                        foreground="#ffffff"
                        border-radius="8"
                        style="height: 34px"
                        @click="createSchedule"
                    >
                        {{ local('Create') }}
                    </fv-button>
                </div>
            </template>
        </fv-panel>
    </div>
</template>

<script>
import { mapActions, mapState } from 'pinia';

import sectionCard from '@/components/common/sectionCard.vue';
import statusPill from '@/components/common/statusPill.vue';
import { useAppConfigStore } from '@/stores/appConfig';
import { useWorkspaceStore } from '@/stores/workspace';

export default {
    name: 'SchedulesView',
    components: {
        sectionCard,
        statusPill
    },
    data() {
        return {
            editorOpen: false,
            newSchedule: {
                name: '',
                endpointId: '',
                cron: '*/15 * * * *',
                enabled: true
            }
        };
    },
    computed: {
        ...mapState(useAppConfigStore, ['resolvedTheme', 'local', 'formatDate']),
        ...mapState(useWorkspaceStore, ['endpointById', 'endpoints', 'schedules']),
        endpointOptions() {
            return this.endpoints.map((endpoint) => ({
                key: endpoint.id,
                text: endpoint.name
            }));
        },
        selectedEndpoint() {
            return this.endpointOptions.filter(
                (option) => option.key === this.newSchedule.endpointId
            );
        }
    },
    methods: {
        ...mapActions(useWorkspaceStore, ['addSchedule', 'runEndpoint', 'toggleSchedule']),
        endpointName(id) {
            return this.endpointById[id]?.name || '-';
        },
        changeEndpoint(options) {
            this.newSchedule.endpointId = options?.[0]?.key || '';
        },
        createSchedule() {
            this.addSchedule({ ...this.newSchedule });
            Object.assign(this.newSchedule, {
                name: '',
                endpointId: '',
                cron: '*/15 * * * *',
                enabled: true
            });
            this.editorOpen = false;
        },
        runSchedule(schedule) {
            this.runEndpoint(schedule.endpointId, schedule.id, 'schedule');
        }
    }
};
</script>

<style lang="scss" scoped>
.schedule-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 14px;
}

.schedule-card {
    min-width: 0;
    padding: 16px;
    border: 1px solid var(--ph-border);
    border-radius: 14px;
    background: var(--ph-surface-soft);
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
    background: var(--ph-accent-soft);
    color: var(--ph-accent);
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
</style>
