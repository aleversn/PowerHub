<template>
    <div class="page-stack servers-page">
        <sectionCard
            :title="local('Servers')"
            :description="local('Add and manage the servers PowerHub should monitor.')"
        >
            <template #info>
            <div class="server-toolbar">
                <fv-text-box
                    v-model="keyword"
                    :theme="resolvedTheme"
                    :placeholder="local('Search servers')"
                    icon="Search"
                    border-radius="8"
                    style="width: min(340px, 100%)"
                ></fv-text-box>
                <div class="toolbar-summary">
                    <span>{{ connectedServers }}/{{ enabledServers }} {{ local('connected') }}</span>
                    <span>{{ filteredServers.length }} {{ local('servers') }}</span>
                </div>
            </div>
            </template>
            <template #actions>
                <fv-button
                    :background="subColor"
                    border-radius="8"
                    icon="Add"
                    style="height: 34px"
                    @click="openCreateWindow"
                >
                    {{ local('Add server') }}
                </fv-button>
            </template>



            <div class="server-list">
                <article
                    v-for="server in filteredServers"
                    :key="server.id"
                    class="server-card"
                    :class="server.status"
                >
                    <header class="server-card-header">
                        <div class="server-identity">
                            <span class="server-state"></span>
                            <span class="server-icon">
                                <i class="ms-Icon ms-Icon--Server"></i>
                            </span>
                            <div>
                                <strong>{{ server.name }}</strong>
                                <span>{{ server.address }}{{ server.port === 22 ? '' : ':' + server.port }}</span>
                            </div>
                        </div>
                        <statusPill :status="server.status" />
                    </header>

                    <div class="server-meta">
                        <div>
                            <span>{{ local('SSH') }}</span>
                            <strong>{{ server.username || 'root' }}</strong>
                        </div>
                        <div>
                            <span>{{ local('Uptime') }}</span>
                            <strong>{{ server.uptimeDays }} {{ local('days') }}</strong>
                        </div>
                        <div>
                            <span>{{ local('Last seen') }}</span>
                            <strong>{{ server.lastSeen ? formatDate(server.lastSeen) : local('Never') }}</strong>
                        </div>
                    </div>

                    <p v-if="server.error" class="server-error">{{ server.error }}</p>

                    <footer class="server-card-footer">
                        <div class="monitor-toggle">
                            <span>{{ local('Monitor') }}</span>
                            <fv-toggle-switch
                                :model-value="server.enabled"
                                :theme="resolvedTheme"
                                :width="38"
                                :height="20"
                                :switch-on-background="subColor"
                                @update:model-value="toggleServer(server.id)"
                            ></fv-toggle-switch>
                        </div>
                        <div class="row-actions">
                            <fv-button
                                :theme="resolvedTheme"
                                border-radius="8"
                                style="width: 34px; height: 34px"
                                :title="local('Refresh')"
                                :disabled="isServerLoading(server.id)"
                                @click="refreshServer(server.id)"
                            >
                                <i class="ms-Icon ms-Icon--Refresh"></i>
                            </fv-button>
                            <fv-button
                                :theme="resolvedTheme"
                                border-radius="8"
                                style="width: 34px; height: 34px"
                                :title="local('Edit')"
                                @click="openEditWindow(server)"
                            >
                                <i class="ms-Icon ms-Icon--Edit"></i>
                            </fv-button>
                            <fv-button
                                :theme="resolvedTheme"
                                border-radius="8"
                                style="width: 34px; height: 34px"
                                :title="local('Remove')"
                                @click="removeServer(server.id)"
                            >
                                <i class="ms-Icon ms-Icon--Delete"></i>
                            </fv-button>
                        </div>
                    </footer>
                </article>

                <div v-if="!filteredServers.length" class="empty-state">
                    <i class="ms-Icon ms-Icon--Server"></i>
                    <strong>{{ local('No servers found') }}</strong>
                    <span>{{ local('Add a server or clear the current search.') }}</span>
                </div>
            </div>
        </sectionCard>

        <floatWindowBase
            v-model="editorOpen"
            :title="editorTitle"
            :theme="resolvedTheme"
            width="960px"
            height="88%"
        >
            <template #content>
                <div class="server-editor">
                    <section class="editor-hero">
                        <span class="hero-icon">
                            <i class="ms-Icon ms-Icon--Server"></i>
                        </span>
                        <div>
                            <strong>{{ local('Server') }}</strong>
                            <span>{{ local('A display name and the address PowerHub should connect to.') }}</span>
                        </div>
                    </section>

                    <div v-if="editorError" class="editor-error">
                        <i class="ms-Icon ms-Icon--ErrorBadge"></i>
                        <span>{{ editorError }}</span>
                    </div>

                    <section class="form-section">
                        <div class="section-heading">
                            <i class="ms-Icon ms-Icon--Network"></i>
                            <div>
                                <strong>{{ local('Server') }}</strong>
                                <span>{{ local('A display name and the address PowerHub should connect to.') }}</span>
                            </div>
                        </div>

                        <div class="form-grid">
                            <div class="field full-span">
                                <span>{{ local('Name') }}</span>
                                <fv-text-box
                                    v-model="editorForm.name"
                                    :theme="resolvedTheme"
                                    :placeholder="local('Example: Production API')"
                                    border-radius="8"
                                ></fv-text-box>
                            </div>
                            <div class="field">
                                <span>{{ local('Address') }}</span>
                                <fv-text-box
                                    v-model="editorForm.address"
                                    :theme="resolvedTheme"
                                    :placeholder="local('IP or hostname')"
                                    border-radius="8"
                                ></fv-text-box>
                            </div>
                            <div class="field">
                                <span>{{ local('SSH port') }}</span>
                                <fv-text-box
                                    v-model="editorForm.port"
                                    :theme="resolvedTheme"
                                    type="number"
                                    border-radius="8"
                                ></fv-text-box>
                            </div>
                        </div>
                    </section>

                    <section class="form-section">
                        <div class="section-heading">
                            <i class="ms-Icon ms-Icon--Permissions"></i>
                            <div>
                                <strong>{{ local('SSH credentials') }}</strong>
                                <span>{{ local('Used by the monitor collector.') }}</span>
                            </div>
                        </div>

                        <div class="form-grid">
                            <div class="field">
                                <span>{{ local('Username') }}</span>
                                <fv-text-box
                                    v-model="editorForm.username"
                                    :theme="resolvedTheme"
                                    border-radius="8"
                                ></fv-text-box>
                            </div>
                            <div class="field">
                                <span>{{ local('Password') }}</span>
                                <fv-text-box
                                    v-model="editorForm.password"
                                    :theme="resolvedTheme"
                                    type="password"
                                    border-radius="8"
                                ></fv-text-box>
                            </div>
                        </div>
                    </section>

                    <div class="toggle-row">
                        <div>
                            <strong>{{ local('Monitor immediately') }}</strong>
                            <span>{{ local('Start showing this server on the status board.') }}</span>
                        </div>
                        <fv-toggle-switch
                            v-model="editorForm.enabled"
                            :theme="resolvedTheme"
                            :width="42"
                            :height="22"
                            :switch-on-background="subColor"
                        ></fv-toggle-switch>
                    </div>
                </div>
            </template>

            <template #control="{ close }">
                <div class="panel-actions">
                    <fv-button
                        :theme="resolvedTheme"
                        border-radius="8"
                        style="height: 34px"
                        :disabled="submitting"
                        @click="close"
                    >
                        {{ local('Cancel') }}
                    </fv-button>
                    <fv-button
                        :theme="resolvedTheme"
                        background="#d83b30"
                        foreground="#ffffff"
                        border-radius="8"
                        style="height: 34px"
                        :disabled="submitting"
                        @click="submitServer"
                    >
                        {{ submitting ? local('Testing connection') : editorMode === 'edit' ? local('Save') : local('Create') }}
                    </fv-button>
                </div>
            </template>
        </floatWindowBase>
    </div>
</template>

<script>
import { mapActions, mapState } from 'pinia';

import sectionCard from '@/components/common/sectionCard.vue';
import statusPill from '@/components/common/statusPill.vue';
import floatWindowBase from '@/components/window/floatWindowBase.vue';
import { useAppConfigStore } from '@/stores/appConfig';
import { useThemeStore } from '@/stores/theme';
import { useServerStore } from '@/stores/servers';

const emptyServer = () => ({
    name: '',
    address: '',
    port: 22,
    username: 'root',
    password: '',
    enabled: true
});

export default {
    name: 'ServersView',
    components: {
        floatWindowBase,
        sectionCard,
        statusPill
    },
    data() {
        return {
            keyword: '',
            editorOpen: false,
            editorMode: 'create',
            editingId: '',
            editorForm: emptyServer(),
            editorError: '',
            submitting: false
        };
    },
    computed: {
        ...mapState(useThemeStore, ['subColor']),
        ...mapState(useAppConfigStore, ['resolvedTheme', 'local', 'formatDate']),
        ...mapState(useServerStore, [
            'servers',
            'connectedServers',
            'enabledServers',
            'loadingServerIds'
        ]),
        editorTitle() {
            return this.editorMode === 'edit'
                ? this.local('Edit server')
                : this.local('Add server');
        },
        filteredServers() {
            const search = this.keyword.trim().toLowerCase();
            if (!search) return this.servers;
            return this.servers.filter((server) =>
                [server.name, server.address, server.username]
                    .join(' ')
                    .toLowerCase()
                    .includes(search)
            );
        }
    },
    methods: {
        ...mapActions(useServerStore, [
            'addServer',
            'updateServer',
            'removeServer',
            'toggleServer',
            'refreshServer'
        ]),
        isServerLoading(id) {
            return this.loadingServerIds.includes(id);
        },
        openCreateWindow() {
            this.editorMode = 'create';
            this.editingId = '';
            this.editorForm = emptyServer();
            this.editorError = '';
            this.editorOpen = true;
        },
        openEditWindow(server) {
            this.editorMode = 'edit';
            this.editingId = server.id;
            this.editorForm = {
                name: server.name,
                address: server.address,
                port: server.port,
                username: server.username,
                password: server.password || '',
                enabled: server.enabled
            };
            this.editorError = '';
            this.editorOpen = true;
        },
        async submitServer() {
            this.editorError = '';
            this.submitting = true;
            try {
                const payload = {
                    ...this.editorForm,
                    name: this.editorForm.name.trim() || this.editorForm.address.trim(),
                    address: this.editorForm.address.trim(),
                    port: Number(this.editorForm.port) || 22,
                    username: this.editorForm.username.trim(),
                    password: this.editorForm.password
                };
                const result =
                    this.editorMode === 'edit'
                        ? await this.updateServer(this.editingId, payload)
                        : await this.addServer(payload);
                if (!result.ok) {
                    this.editorError = result.message;
                    return;
                }
                this.editorOpen = false;
                this.editorForm = emptyServer();
            } finally {
                this.submitting = false;
            }
        }
    }
};
</script>

<style lang="scss" scoped>
.servers-page {
    min-height: 0;
    flex: 1;
    overflow: hidden;
    box-sizing: border-box;

    padding: 18px;
    border-radius: 18px;
    --servercat-panel: rgba(255, 255, 255, 0.9);
    --servercat-card: rgba(255, 255, 255, 0.94);
    --servercat-card-soft: rgba(242, 245, 249, 0.96);
    --servercat-border: rgba(31, 41, 55, 0.1);
    --servercat-text: #1f2937;
    --servercat-muted: #667085;
    --servercat-red: #d83b30;

    :global(:root[data-theme='dark']) & {
        background: #101216;
        --servercat-panel: #15171c;
        --servercat-card: #1c1f26;
        --servercat-card-soft: #22262e;
        --servercat-border: rgba(255, 255, 255, 0.095);
        --servercat-text: #f4f6f8;
        --servercat-muted: #8c95a3;
    }

    :deep(.section-card) {
        border-color: var(--servercat-border);
        background: var(--servercat-panel);
        box-shadow: none;

        .section-header {
            padding: 18px 20px 0;
        }

        .section-heading h2 {
            color: var(--servercat-text);
        }

        .section-heading p {
            color: var(--servercat-muted);
        }

        .section-body {
            padding: 16px 20px 20px;
        }
    }

    .server-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
    }

    .toolbar-summary {
        display: flex;
        align-items: center;
        gap: 14px;
        color: var(--servercat-muted);
        font-size: 11px;
    }

    .server-list {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
        gap: 14px;
    }

    .server-card {
        min-width: 0;
        padding: 16px;
        border: 1px solid var(--servercat-border);
        border-radius: 16px;
        background: var(--servercat-card);
        box-shadow: none;
        display: flex;
        flex-direction: column;
        gap: 14px;

        &.warning {
            border-color: rgba(245, 158, 11, 0.38);
        }

        &.offline {
            opacity: 0.76;
        }
    }

    .server-card-header {
        min-width: 0;
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
    }

    .server-identity {
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 10px;

        > div {
            min-width: 0;
            display: flex;
            flex-direction: column;
        }

        strong,
        span {
            @include nowrap;
        }

        strong {
            color: var(--servercat-text);
            font-size: 13px;
            font-weight: 600;
        }

        span {
            margin-top: 4px;
            color: var(--servercat-muted);
            font-size: 10px;
        }
    }

    .server-icon {
        width: 36px;
        height: 36px;
        flex: 0 0 36px;
        border-radius: 11px;
        background: rgba(216, 59, 48, 0.13);
        color: var(--servercat-red);
        display: grid;
        place-items: center;

        .ms-Icon {
            font-size: 16px;
        }
    }

    .server-state {
        width: 8px;
        height: 8px;
        flex: 0 0 8px;
        border-radius: 50%;
        background: #10b981;
        box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.12);

        .warning & {
            background: #f59e0b;
            box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.12);
        }

        .offline & {
            background: var(--servercat-muted);
            box-shadow: 0 0 0 4px rgba(122, 131, 146, 0.12);
        }
    }

    .server-meta {
        display: grid;
        grid-template-columns: 0.8fr 0.7fr 1.5fr;
        gap: 8px;

        > div {
            min-width: 0;
            padding: 10px;
            border: 1px solid var(--servercat-border);
            border-radius: 10px;
            background: var(--servercat-card-soft);
            display: flex;
            flex-direction: column;
        }

        span {
            color: var(--servercat-muted);
            font-size: 9px;
        }

        strong {
            @include nowrap;

            margin-top: 3px;
            color: var(--servercat-text);
            font-size: 10px;
            font-weight: 500;
        }
    }

    .server-error {
        margin: -4px 0 0;
        padding: 9px 10px;
        border: 1px solid rgba(216, 59, 48, 0.24);
        border-radius: 9px;
        background: rgba(216, 59, 48, 0.08);
        color: #b42318;
        font-size: 10px;
        line-height: 1.5;
    }

    .server-card-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
    }

    .monitor-toggle {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--servercat-muted);
        font-size: 10px;
    }

    .row-actions {
        display: flex;
        justify-content: flex-end;
        gap: 6px;
    }

    .empty-state {
        min-height: 260px;
        border: 1px dashed var(--servercat-border);
        border-radius: 16px;
        color: var(--servercat-muted);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 8px;

        .ms-Icon {
            color: var(--servercat-red);
            font-size: 26px;
        }

        strong {
            color: var(--servercat-text);
            font-size: 13px;
        }

        span {
            font-size: 11px;
        }
    }

    .server-editor {
        display: flex;
        flex-direction: column;
        gap: 18px;
    }

    .editor-hero {
        padding: 16px;
        border: 1px solid var(--servercat-border);
        border-radius: 14px;
        background: linear-gradient(135deg, rgba(216, 59, 48, 0.18), rgba(216, 59, 48, 0.04));
        display: flex;
        align-items: center;
        gap: 12px;

        .hero-icon {
            width: 40px;
            height: 40px;
            flex: 0 0 40px;
            border-radius: 12px;
            background: rgba(216, 59, 48, 0.18);
            color: #ff8a80;
            display: grid;
            place-items: center;
        }

        > div {
            min-width: 0;
            display: flex;
            flex-direction: column;

            strong {
                color: var(--servercat-text);
                font-size: 14px;
            }

            span {
                margin-top: 4px;
                color: var(--servercat-muted);
                font-size: 11px;
            }
        }
    }

    .editor-error {
        padding: 10px 12px;
        border: 1px solid rgba(216, 59, 48, 0.32);
        border-radius: 10px;
        background: rgba(216, 59, 48, 0.1);
        color: #b42318;
        display: flex;
        align-items: flex-start;
        gap: 8px;
        font-size: 11px;
        line-height: 1.5;

        .ms-Icon {
            margin-top: 1px;
            flex: 0 0 auto;
        }
    }

    .form-section {
        display: flex;
        flex-direction: column;
        gap: 14px;
    }

    .section-heading {
        display: flex;
        align-items: center;
        gap: 10px;

        > i {
            width: 32px;
            height: 32px;
            flex: 0 0 32px;
            border-radius: 10px;
            background: rgba(216, 59, 48, 0.11);
            color: #d83b30;
            display: grid;
            place-items: center;
            font-size: 14px;
        }

        > div {
            min-width: 0;
            display: flex;
            flex-direction: column;

            strong {
                color: var(--servercat-text);
                font-size: 13px;
            }

            span {
                margin-top: 3px;
                color: var(--servercat-muted);
                font-size: 10px;
            }
        }
    }

    .form-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;

        .field {
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 7px;

            > span {
                color: var(--servercat-muted);
                font-size: 12px;
            }

            &.full-span {
                grid-column: 1 / -1;
            }
        }
    }

    .toggle-row {
        min-height: 58px;
        padding: 12px;
        border: 1px solid var(--servercat-border);
        border-radius: 10px;
        background: var(--servercat-card-soft);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;

        > div {
            min-width: 0;
            display: flex;
            flex-direction: column;

            strong {
                color: var(--servercat-text);
                font-size: 12px;
            }

            span {
                margin-top: 4px;
                color: var(--servercat-muted);
                font-size: 10px;
            }
        }
    }

    .panel-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
    }

    @media (max-width: 720px) {
        .server-list {
            grid-template-columns: 1fr;
        }

        .server-toolbar {
            align-items: flex-start;
            flex-direction: column;
        }

        .form-grid,
        .server-meta {
            grid-template-columns: 1fr;
        }
    }
}
</style>
