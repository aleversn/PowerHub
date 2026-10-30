<template>
    <div class="page-stack endpoints-page">
        <sectionCard
            :title="local('Endpoint collection')"
            :description="local('Manage HTTP requests, default headers, and monitor health.')"
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
                    {{ local('New endpoint') }}
                </fv-button>
            </template>

            <div class="table-toolbar">
                <fv-text-box
                    v-model="keyword"
                    :theme="resolvedTheme"
                    :placeholder="local('Search')"
                    icon="Search"
                    border-radius="8"
                    style="width: min(320px, 100%)"
                ></fv-text-box>
                <span class="record-count"
                    >{{ filteredEndpoints.length }} endpoints</span
                >
            </div>

            <div class="endpoint-table">
                <div class="endpoint-table__head">
                    <span>{{ local('Name') }}</span>
                    <span>{{ local('Method') }}</span>
                    <span>{{ local('Collection') }}</span>
                    <span>{{ local('Health') }}</span>
                    <span>{{ local('Enabled') }}</span>
                    <span></span>
                </div>
                <div
                    v-for="endpoint in filteredEndpoints"
                    :key="endpoint.id"
                    class="endpoint-table__row"
                >
                    <div class="endpoint-main">
                        <strong>{{ endpoint.name }}</strong>
                        <span>{{ endpoint.url }}</span>
                    </div>
                    <span
                        class="method-badge"
                        :class="endpoint.method.toLowerCase()"
                    >
                        {{ endpoint.method }}
                    </span>
                    <span class="muted-cell">{{ endpoint.collection }}</span>
                    <statusPill :status="endpoint.health" />
                    <fv-toggle-switch
                        :model-value="endpoint.enabled"
                        :theme="resolvedTheme"
                        :width="38"
                        :height="20"
                        switch-on-background="#0078d4"
                        @update:model-value="
                            toggleEndpoint(endpoint.id)
                        "
                    ></fv-toggle-switch>
                    <fv-button
                        :theme="resolvedTheme"
                        border-radius="8"
                        style="width: 34px; height: 34px"
                        :title="local('Run now')"
                        @click="runEndpoint(endpoint.id)"
                    >
                        <i class="ms-Icon ms-Icon--Play"></i>
                    </fv-button>
                </div>
            </div>
        </sectionCard>

        <fv-panel
            v-model="editorOpen"
            :title="local('Endpoint editor')"
            :theme="resolvedTheme"
            width="430px"
            :is-footer="true"
            :is-central-side="true"
            :is-light-dismiss="true"
        >
            <template #container>
                <div class="editor-form">
                    <label>
                        <span>{{ local('Name') }}</span>
                        <fv-text-box
                            v-model="newEndpoint.name"
                            :theme="resolvedTheme"
                            :placeholder="local('Example: Production health check')"
                            border-radius="8"
                        ></fv-text-box>
                    </label>
                    <div class="form-row">
                        <label>
                            <span>{{ local('Method') }}</span>
                            <fv-drop-down
                                :model-value="selectedMethod"
                                :options="methodOptions"
                                :theme="resolvedTheme"
                                border-radius="8"
                                @update:model-value="changeMethod"
                            ></fv-drop-down>
                        </label>
                        <label>
                            <span>{{ local('Collection') }}</span>
                            <fv-text-box
                                v-model="newEndpoint.collection"
                                :theme="resolvedTheme"
                                border-radius="8"
                            ></fv-text-box>
                        </label>
                    </div>
                    <label>
                        <span>{{ local('Request URL') }}</span>
                        <fv-text-box
                            v-model="newEndpoint.url"
                            :theme="resolvedTheme"
                            :placeholder="local('https://api.example.com/health')"
                            border-radius="8"
                        ></fv-text-box>
                    </label>
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
                        @click="createEndpoint"
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
    name: 'EndpointsView',
    components: {
        sectionCard,
        statusPill
    },
    data() {
        return {
            keyword: '',
            editorOpen: false,
            newEndpoint: {
                name: '',
                method: 'GET',
                collection: 'Personal',
                url: ''
            },
            methodOptions: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(
                (method) => ({
                    key: method,
                    text: method
                })
            )
        };
    },
    computed: {
        ...mapState(useAppConfigStore, ['resolvedTheme', 'local']),
        ...mapState(useWorkspaceStore, ['endpoints']),
        selectedMethod() {
            return this.methodOptions.filter(
                (option) => option.key === this.newEndpoint.method
            );
        },
        filteredEndpoints() {
            const search = this.keyword.trim().toLowerCase();
            if (!search) return this.endpoints;
            return this.endpoints.filter((endpoint) =>
                [
                    endpoint.name,
                    endpoint.url,
                    endpoint.collection,
                    endpoint.method
                ]
                    .join(' ')
                    .toLowerCase()
                    .includes(search)
            );
        }
    },
    methods: {
        ...mapActions(useWorkspaceStore, ['addEndpoint', 'runEndpoint', 'toggleEndpoint']),
        changeMethod(options) {
            this.newEndpoint.method = options?.[0]?.key || 'GET';
        },
        createEndpoint() {
            this.addEndpoint(this.newEndpoint);
            Object.assign(this.newEndpoint, {
                name: '',
                method: 'GET',
                collection: 'Personal',
                url: ''
            });
            this.editorOpen = false;
        }
    }
};
</script>

<style lang="scss" scoped>
.endpoints-page {
    .table-toolbar {
        margin-bottom: 14px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
    }

    .record-count {
        color: var(--ph-text-muted);
        font-size: 11px;
    }

    .endpoint-table {
        min-width: 0;
        display: flex;
        flex-direction: column;
    }

    .endpoint-table__head,
    .endpoint-table__row {
        display: grid;
        grid-template-columns: minmax(240px, 1.8fr) 86px 100px 108px 72px 42px;
        align-items: center;
        gap: 14px;
    }

    .endpoint-table__head {
        min-height: 36px;
        border-bottom: 1px solid var(--ph-border);
        color: var(--ph-text-muted);
        font-size: 10px;
        text-transform: uppercase;
    }

    .endpoint-table__row {
        min-height: 66px;
        border-bottom: 1px solid var(--ph-border-subtle);
        color: var(--ph-text-secondary);
        font-size: 12px;

        &:last-child {
            border-bottom: 0;
        }
    }

    .endpoint-main {
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

    .method-badge {
        width: fit-content;
        min-width: 52px;
        padding: 4px 7px;
        border-radius: 6px;
        background: rgba(16, 124, 16, 0.1);
        color: var(--ph-success);
        font-size: 10px;
        font-weight: 700;
        text-align: center;

        &.post,
        &.put,
        &.patch {
            background: rgba(0, 120, 212, 0.1);
            color: var(--ph-accent);
        }

        &.delete {
            background: rgba(196, 43, 28, 0.1);
            color: var(--ph-danger);
        }
    }

    .muted-cell {
        @include nowrap;

        color: var(--ph-text-secondary);
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

    .form-row {
        display: grid;
        grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
        gap: 12px;
    }

    .panel-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
    }

    @media (max-width: 760px) {
        .endpoint-table {
            overflow-x: auto;
        }

        .endpoint-table__head,
        .endpoint-table__row {
            min-width: 760px;
        }

        .table-toolbar {
            align-items: flex-start;
            flex-direction: column;
        }
    }
}
</style>
