<template>
    <div class="page-stack endpoint-editor-page">
        <sectionCard>
            <div v-if="!endpoint" class="editor-empty">
                <i class="ms-Icon ms-Icon--Warning"></i>
                <strong>{{ local('Endpoint not found') }}</strong>
                <span>{{
                    local('The selected endpoint is no longer available.')
                }}</span>
            </div>

            <template v-else>
                <div class="editor-topbar">
                    <fv-button
                        class="back-button"
                        :theme="resolvedTheme"
                        border-radius="8"
                        style="width: 38px; height: 38px; flex-shrink: 0"
                        :title="local('Back to endpoints')"
                        @click="backToEndpoints"
                    >
                        <i class="ms-Icon ms-Icon--Back"></i>
                    </fv-button>
                    <fv-text-box
                        v-model="draft.name"
                        :theme="resolvedTheme"
                        :placeholder="local('Name')"
                        border-radius="8"
                        style="flex: 1; min-width: 160px; max-width: 360px"
                    ></fv-text-box>
                    <fv-drop-down
                        :model-value="collectionSelection"
                        :options="collectionOptions"
                        :theme="resolvedTheme"
                        border-radius="8"
                        :placeholder="local('Collection')"
                        style="width: 220px"
                        @update:model-value="changeCollection"
                    ></fv-drop-down>
                    <fv-toggle-switch
                        :model-value="draft.enabled"
                        :theme="resolvedTheme"
                        :width="38"
                        :height="20"
                        switch-on-background="#0078d4"
                        @update:model-value="setEnabled"
                    ></fv-toggle-switch>
                    <div class="topbar-spacer"></div>
                    <fv-button
                        :theme="resolvedTheme"
                        background="#0078d4"
                        foreground="#ffffff"
                        border-radius="8"
                        icon="Save"
                        style="height: 38px; flex-shrink: 0"
                        :disabled="saving"
                        @click="saveEndpoint"
                    >
                        {{ saving ? local('Saving') : local('Save endpoint') }}
                    </fv-button>
                </div>

                <div class="request-bar">
                    <fv-drop-down
                        :model-value="methodSelection"
                        :options="methodOptions"
                        :theme="resolvedTheme"
                        border-radius="8"
                        input-height="38px"
                        style="width: 116px"
                        @update:model-value="changeMethod"
                    ></fv-drop-down>
                    <fv-text-box
                        v-model="draft.url"
                        :theme="resolvedTheme"
                        :placeholder="local('Request URL')"
                        border-radius="8"
                        style="flex: 1; min-width: 220px"
                        @keyup.enter="sendRequest"
                    ></fv-text-box>
                    <fv-button
                        :theme="resolvedTheme"
                        background="#0078d4"
                        foreground="#ffffff"
                        border-radius="8"
                        icon="Play"
                        style="height: 38px"
                        :disabled="sending"
                        @click="sendRequest"
                    >
                        {{ sending ? local('Sending') : local('Send') }}
                    </fv-button>
                </div>

                <div v-if="errorMessage" class="editor-alert">
                    {{ errorMessage }}
                </div>

                <fv-pivot
                    :model-value="pivotValue"
                    :items="pivotItems"
                    :theme="resolvedTheme"
                    :font-size="13"
                    :background="pivotBackground"
                    :border-radius="10"
                    :padding="4"
                    :item-padding="'8px 18px'"
                    :foreground="pivotForeground"
                    :choosen-foreground="pivotChoosenForeground"
                    :slider-background="pivotSliderBackground"
                    :slider-boxshadow="true"
                    :slider-border-radius="8"
                    style="width: fit-content; max-width: 100%"
                    @update:model-value="onTabChange"
                ></fv-pivot>

                <div class="editor-tab-panel">
                    <div v-show="activeTabKey === 'docs'" class="docs-panel">
                        <div class="docs-editor">
                            <power-editor
                                ref="docsEditor"
                                :model-value="''"
                                :theme="resolvedTheme"
                                :language="editorLanguage"
                                :placeholder="local('Describe this endpoint')"
                                :show-save="false"
                                :toolbar-height="75"
                                :editable-padding-top="90"
                                :editable-padding-bottom="40"
                                :read-only-padding-top="20"
                                :read-only-padding-bottom="40"
                                :content-max-width="'min(900px, calc(100% - 40px))'"
                                :show-drag-handler="true"
                                :use-tab="true"
                                style="width: 100%"
                                @on-mounted="onDocsMounted"
                                @change="onDocsChange"
                            ></power-editor>
                        </div>
                    </div>

                    <div v-show="activeTabKey === 'params'" class="kv-panel">
                        <div class="panel-heading">
                            <strong>{{ local('Query') }}</strong>
                            <span
                                >{{ enabledRowCount(draft.params) }}
                                {{ local('Enabled') }}</span
                            >
                        </div>
                        <keyValueEditor
                            v-model="draft.params"
                            key-placeholder="Key"
                            value-placeholder="Value"
                        ></keyValueEditor>
                    </div>

                    <div
                        v-show="activeTabKey === 'authorization'"
                        class="auth-panel"
                    >
                        <div class="auth-type-row">
                            <fv-drop-down
                                :model-value="authTypeSelection"
                                :options="authTypeOptions"
                                :theme="resolvedTheme"
                                border-radius="8"
                                style="width: 220px"
                                @update:model-value="changeAuthType"
                            ></fv-drop-down>
                        </div>

                        <div
                            v-if="draft.authType === 'bearer'"
                            class="auth-fields"
                        >
                            <label class="field-block">
                                <span>{{ local('Bearer token') }}</span>
                                <fv-text-box
                                    v-model="draft.authData.token"
                                    :theme="resolvedTheme"
                                    :type="
                                        revealAuth.token ? 'text' : 'password'
                                    "
                                    :icon="revealAuth.token ? 'Hide' : 'View'"
                                    placeholder="Token"
                                    border-radius="8"
                                    @icon-click="toggleReveal('token')"
                                ></fv-text-box>
                            </label>
                        </div>

                        <div
                            v-else-if="draft.authType === 'basic'"
                            class="auth-fields auth-grid"
                        >
                            <label class="field-block">
                                <span>{{ local('Username') }}</span>
                                <fv-text-box
                                    v-model="draft.authData.username"
                                    :theme="resolvedTheme"
                                    placeholder="Username"
                                    border-radius="8"
                                ></fv-text-box>
                            </label>
                            <label class="field-block">
                                <span>{{ local('Password') }}</span>
                                <fv-text-box
                                    v-model="draft.authData.password"
                                    :theme="resolvedTheme"
                                    type="password"
                                    placeholder="Password"
                                    border-radius="8"
                                ></fv-text-box>
                            </label>
                        </div>

                        <div
                            v-else-if="draft.authType === 'api-key'"
                            class="auth-fields auth-grid"
                        >
                            <label class="field-block">
                                <span>{{ local('Key') }}</span>
                                <fv-text-box
                                    v-model="draft.authData.key"
                                    :theme="resolvedTheme"
                                    placeholder="X-API-Key"
                                    border-radius="8"
                                ></fv-text-box>
                            </label>
                            <label class="field-block">
                                <span>{{ local('Value') }}</span>
                                <fv-text-box
                                    v-model="draft.authData.value"
                                    :theme="resolvedTheme"
                                    :type="
                                        revealAuth.value ? 'text' : 'password'
                                    "
                                    :icon="revealAuth.value ? 'Hide' : 'View'"
                                    placeholder="Value"
                                    border-radius="8"
                                    @icon-click="toggleReveal('value')"
                                ></fv-text-box>
                            </label>
                            <label class="field-block">
                                <span>{{ local('Add to') }}</span>
                                <fv-drop-down
                                    :model-value="authLocationSelection"
                                    :options="authLocationOptions"
                                    :theme="resolvedTheme"
                                    border-radius="8"
                                    @update:model-value="changeAuthLocation"
                                ></fv-drop-down>
                            </label>
                        </div>

                        <div v-else class="auth-empty">
                            {{ local('No authorization') }}
                        </div>
                    </div>

                    <div v-show="activeTabKey === 'headers'" class="kv-panel">
                        <div class="panel-heading">
                            <strong>{{ local('Headers') }}</strong>
                            <span
                                >{{ enabledRowCount(draft.headersData) }}
                                {{ local('Enabled') }}</span
                            >
                        </div>
                        <keyValueEditor
                            v-model="draft.headersData"
                            key-placeholder="Header"
                            value-placeholder="Value"
                        ></keyValueEditor>
                    </div>

                    <div v-show="activeTabKey === 'body'" class="body-panel">
                        <div class="body-toolbar">
                            <span>{{ local('Body type') }}</span>
                            <fv-drop-down
                                :model-value="bodyTypeSelection"
                                :options="bodyTypeOptions"
                                :theme="resolvedTheme"
                                border-radius="8"
                                style="width: 190px"
                                @update:model-value="changeBodyType"
                            ></fv-drop-down>
                        </div>

                        <keyValueEditor
                            v-if="draft.bodyType === 'form'"
                            v-model="formRows"
                            key-placeholder="Field"
                            value-placeholder="Value"
                        ></keyValueEditor>

                        <monacoEditor
                            v-else-if="draft.bodyType !== 'none'"
                            v-model="draft.body"
                            :language="bodyLanguage"
                            :theme="monacoTheme"
                            :height="'280px'"
                            :minimap="false"
                        ></monacoEditor>

                        <div v-else class="body-empty">
                            {{ local('This request does not have a body.') }}
                        </div>
                    </div>

                    <div
                        v-show="activeTabKey === 'scripts'"
                        class="scripts-panel"
                    >
                        <div class="panel-heading">
                            <strong>{{ local('Scripts') }}</strong>
                            <span>{{
                                local(
                                    'Run JavaScript before and after the request.'
                                )
                            }}</span>
                        </div>
                        <div class="scripts-layout">
                            <div class="scripts-side">
                                <fv-pivot
                                    :model-value="scriptPivotValue"
                                    :items="scriptPivotItems"
                                    :theme="resolvedTheme"
                                    :font-size="12"
                                    :background="pivotBackground"
                                    :border-radius="10"
                                    :padding="4"
                                    :item-padding="'6px 14px'"
                                    :foreground="pivotForeground"
                                    :choosen-foreground="pivotChoosenForeground"
                                    :slider-background="pivotSliderBackground"
                                    :slider-boxshadow="true"
                                    :slider-border-radius="8"
                                    style="width: fit-content; max-width: 100%"
                                    @update:model-value="onScriptTabChange"
                                ></fv-pivot>
                                <div class="scripts-hint">
                                    <template
                                        v-if="activeScriptKey === 'preRequest'"
                                    >
                                        {{
                                            local(
                                                'Use pm.environment.set to prepare variables before the request is sent.'
                                            )
                                        }}
                                    </template>
                                    <template v-else>
                                        {{
                                            local(
                                                'Use pm.response and pm.test to inspect the response and save variables.'
                                            )
                                        }}
                                    </template>
                                </div>
                                <div class="scripts-toolbar">
                                    <fv-button
                                        :theme="resolvedTheme"
                                        border-radius="8"
                                        icon="Snippet"
                                        style="height: 32px"
                                        @click="insertScriptSnippet"
                                    >
                                        {{ local('Snippets') }}
                                    </fv-button>
                                    <fv-button
                                        :theme="resolvedTheme"
                                        border-radius="8"
                                        icon="Play"
                                        style="height: 32px"
                                        :disabled="scriptRunning"
                                        @click="runCurrentScript"
                                    >
                                        {{
                                            scriptRunning
                                                ? local('Running')
                                                : local('Run script')
                                        }}
                                    </fv-button>
                                </div>
                            </div>
                            <div class="scripts-main">
                                <monacoEditor
                                    v-if="activeScriptKey === 'preRequest'"
                                    v-model="draft.preRequestScript"
                                    language="javascript"
                                    :theme="monacoTheme"
                                    :height="'320px'"
                                    :minimap="false"
                                ></monacoEditor>
                                <monacoEditor
                                    v-else
                                    v-model="draft.postResponseScript"
                                    language="javascript"
                                    :theme="monacoTheme"
                                    :height="'320px'"
                                    :minimap="false"
                                ></monacoEditor>
                                <div
                                    v-if="scriptFeedback"
                                    class="scripts-feedback"
                                >
                                    <div class="scripts-feedback-head">
                                        <strong>{{
                                            local('Script results')
                                        }}</strong>
                                        <fv-button
                                            :theme="resolvedTheme"
                                            border-radius="8"
                                            style="height: 28px"
                                            @click="clearScriptFeedback"
                                        >
                                            {{ local('Clear') }}
                                        </fv-button>
                                    </div>
                                    <div
                                        v-if="scriptFeedback.error"
                                        class="response-error"
                                    >
                                        {{ scriptFeedback.error }}
                                    </div>
                                    <ul
                                        v-if="scriptFeedback.tests?.length"
                                        class="scripts-tests"
                                    >
                                        <li
                                            v-for="(
                                                test, index
                                            ) in scriptFeedback.tests"
                                            :key="index"
                                            :class="{
                                                failed: test.passed === false
                                            }"
                                        >
                                            <i
                                                class="ms-Icon"
                                                :class="
                                                    test.passed === false
                                                        ? 'ms-Icon--ErrorBadge'
                                                        : 'ms-Icon--CheckMark'
                                                "
                                            ></i>
                                            <span>{{
                                                test.name ||
                                                local('Unnamed test')
                                            }}</span>
                                            <span
                                                v-if="test.error"
                                                class="scripts-test-error"
                                                >{{ test.error }}</span
                                            >
                                        </li>
                                    </ul>
                                    <pre
                                        v-if="scriptFeedback.console?.length"
                                        class="scripts-console"
                                        >{{ formattedScriptConsole }}</pre
                                    >
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="response-panel">
                    <div class="response-header">
                        <div>
                            <strong>{{ local('Response') }}</strong>
                            <span v-if="response">
                                {{ response.statusCode }}
                                {{ response.statusText || '' }}
                                · {{ response.duration }} ms ·
                                {{ formatSize(response.size) }}
                            </span>
                        </div>
                        <statusPill v-if="response" :status="response.status" />
                    </div>

                    <div v-if="response?.error" class="response-error">
                        {{ response.error }}
                    </div>

                    <template v-if="response">
                        <div class="response-meta">
                            <span>
                                {{ local('Status code') }}:
                                <code>{{ response.statusCode || '-' }}</code>
                            </span>
                            <span>
                                {{ local('Duration') }}:
                                <code>{{ response.duration }} ms</code>
                            </span>
                            <span>
                                {{ local('Size') }}:
                                <code>{{ formatSize(response.size) }}</code>
                            </span>
                        </div>
                        <details class="response-headers">
                            <summary>{{ local('Headers') }}</summary>
                            <pre>{{ formattedResponseHeaders }}</pre>
                        </details>
                        <label class="field-block">
                            <span>{{ local('Response body') }}</span>
                            <monacoEditor
                                :model-value="response.response || ''"
                                :language="responseLanguage"
                                :theme="monacoTheme"
                                :readonly="true"
                                :height="'300px'"
                                :minimap="false"
                            ></monacoEditor>
                        </label>
                    </template>

                    <div v-else class="response-empty">
                        <i class="ms-Icon ms-Icon--Document"></i>
                        <strong>{{ local('No response yet') }}</strong>
                        <span>{{
                            local(
                                'Send this request to inspect the live response.'
                            )
                        }}</span>
                    </div>
                </div>
            </template>
        </sectionCard>
    </div>
</template>

<script>
import { mapActions, mapState } from 'pinia';

import sectionCard from '@/components/common/sectionCard.vue';
import statusPill from '@/components/common/statusPill.vue';
import keyValueEditor from '@/components/common/keyValueEditor/index.vue';
import monacoEditor from '@/components/common/monacoEditor.vue';
import { useAppConfigStore } from '@/stores/appConfig';
import { useWorkspaceStore } from '@/stores/workspace';

const DEFAULT_COLLECTION = 'Default collection';
const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
const BODY_TYPES = [
    { key: 'none', textKey: 'None' },
    { key: 'json', textKey: 'JSON' },
    { key: 'raw', textKey: 'Raw' },
    { key: 'form', textKey: 'Form data' }
];
const AUTH_TYPES = [
    { key: 'none', textKey: 'None' },
    { key: 'bearer', textKey: 'Bearer token' },
    { key: 'basic', textKey: 'Basic auth' },
    { key: 'api-key', textKey: 'API key' }
];
const createRow = (item = {}) => ({
    id:
        item.id ||
        `row-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    key: String(item.key ?? ''),
    value: String(item.value ?? ''),
    enabled: item.enabled !== false,
    hide: item.hide === true
});
const cloneEndpoint = (endpoint) => ({
    ...endpoint,
    preRequestScript: endpoint.preRequestScript || '',
    postResponseScript: endpoint.postResponseScript || '',
    params: (endpoint.params || []).map(createRow),
    headersData: (endpoint.headersData || []).map(createRow),
    authData: { ...(endpoint.authData || {}) },
    bodyType: endpoint.bodyType || 'none',
    body: endpoint.body || ''
});
const parseFormRows = (body) => {
    try {
        const parsed = JSON.parse(body || '[]');
        return Array.isArray(parsed) ? parsed.map(createRow) : [];
    } catch {
        return [];
    }
};

export default {
    name: 'EndpointEditorView',
    components: {
        sectionCard,
        statusPill,
        keyValueEditor,
        monacoEditor
    },
    data() {
        return {
            activeTabKey: 'docs',
            activeScriptKey: 'preRequest',
            scriptRunning: false,
            scriptFeedback: null,
            draft: {},
            docsJSON: null,
            response: null,
            sending: false,
            saving: false,
            errorMessage: '',
            revealAuth: {
                token: false,
                value: false
            }
        };
    },
    computed: {
        ...mapState(useAppConfigStore, [
            'resolvedTheme',
            'local',
            'appLanguage'
        ]),
        ...mapState(useWorkspaceStore, {
            workspaceEndpoints: 'endpoints',
            workspaceCollections: 'collections',
            endpointById: 'endpointById',
            variablesByCollection: 'variablesByCollection'
        }),
        endpoint() {
            return this.endpointById[this.$route.params.id] || null;
        },
        pivotItems() {
            return [
                { key: 'docs', name: this.local('Docs'), width: 94 },
                { key: 'params', name: this.local('Params'), width: 104 },
                {
                    key: 'authorization',
                    name: this.local('Authorization'),
                    width: 136
                },
                {
                    key: 'headers',
                    name: `${this.local('Headers')} (${this.enabledRowCount(this.draft.headersData)})`,
                    width: 132
                },
                { key: 'body', name: this.local('Body'), width: 92 },
                { key: 'scripts', name: this.local('Scripts'), width: 100 }
            ];
        },
        pivotValue() {
            return this.pivotItems.find(
                (item) => item.key === this.activeTabKey
            );
        },
        scriptPivotItems() {
            return [
                {
                    key: 'preRequest',
                    name: this.local('Pre-request'),
                    width: 112
                },
                {
                    key: 'postResponse',
                    name: this.local('Post-response'),
                    width: 120
                }
            ];
        },
        scriptPivotValue() {
            return (
                this.scriptPivotItems.find(
                    (item) => item.key === this.activeScriptKey
                ) || this.scriptPivotItems[0]
            );
        },
        collectionVariableRows() {
            const collection = this.draft.collection || DEFAULT_COLLECTION;
            return this.variablesByCollection[collection] || [];
        },
        formattedScriptConsole() {
            return (this.scriptFeedback?.console || [])
                .map((entry) => {
                    const parts = (entry?.args || []).map((arg) =>
                        typeof arg === 'string'
                            ? arg
                            : this.stringifyConsoleArg(arg)
                    );
                    return `[${entry?.level || 'log'}] ${parts.join(' ')}`;
                })
                .join('\n');
        },
        methodOptions() {
            return METHODS.map((method) => ({ key: method, text: method }));
        },
        methodSelection() {
            return this.methodOptions.filter(
                (item) => item.key === this.draft.method
            );
        },
        bodyTypeOptions() {
            return BODY_TYPES.map((item) => ({
                key: item.key,
                text: this.local(item.textKey)
            }));
        },
        bodyTypeSelection() {
            return this.bodyTypeOptions.filter(
                (item) => item.key === this.draft.bodyType
            );
        },
        authTypeOptions() {
            return AUTH_TYPES.map((item) => ({
                key: item.key,
                text: this.local(item.textKey)
            }));
        },
        authTypeSelection() {
            return this.authTypeOptions.filter(
                (item) => item.key === this.draft.authType
            );
        },
        authLocationOptions() {
            return [
                { key: 'header', text: this.local('Headers') },
                { key: 'query', text: this.local('Query') }
            ];
        },
        authLocationSelection() {
            const location = this.draft.authData?.in || 'header';
            return this.authLocationOptions.filter(
                (item) => item.key === location
            );
        },
        collectionOptions() {
            return this.workspaceCollections.map((collection) => ({
                key: collection.name,
                text: collection.name
            }));
        },
        collectionSelection() {
            return this.collectionOptions.filter(
                (item) => item.key === this.draft.collection
            );
        },
        formRows: {
            get() {
                return parseFormRows(this.draft.body);
            },
            set(rows) {
                this.draft.body = JSON.stringify(rows || []);
            }
        },
        bodyLanguage() {
            if (this.draft.bodyType === 'json') return 'json';
            return 'plaintext';
        },
        responseLanguage() {
            const contentType = String(this.response?.contentType || '');
            if (contentType.includes('json')) return 'json';
            if (contentType.includes('html')) return 'html';
            if (contentType.includes('xml')) return 'xml';
            return 'plaintext';
        },
        formattedResponseHeaders() {
            return JSON.stringify(this.response?.headers || {}, null, 2);
        },
        pivotBackground() {
            return this.resolvedTheme === 'dark'
                ? 'rgba(36, 39, 45, 0.86)'
                : 'rgba(247, 249, 253, 0.96)';
        },
        pivotForeground() {
            return this.resolvedTheme === 'dark' ? '#c2c8d2' : '#505867';
        },
        pivotChoosenForeground() {
            return this.resolvedTheme === 'dark' ? '#ffffff' : '#202124';
        },
        pivotSliderBackground() {
            return this.resolvedTheme === 'dark'
                ? 'rgba(98, 189, 252, 0.18)'
                : '#ffffff';
        },
        monacoTheme() {
            return this.resolvedTheme === 'dark' ? 'vs-dark' : 'vs';
        },
        editorLanguage() {
            return this.appLanguage === 'cn' ? 'cn' : 'en';
        }
    },
    watch: {
        '$route.params.id': {
            handler() {
                this.syncDraft();
            }
        }
    },
    async mounted() {
        await this.workspaceInitialize();
        this.syncDraft();
    },
    methods: {
        ...mapActions(useWorkspaceStore, {
            workspaceInitialize: 'initialize',
            updateEndpoint: 'updateEndpoint',
            runEndpoint: 'runEndpoint',
            runEndpointScript: 'runEndpointScript',
            refreshVariables: 'refreshVariables'
        }),
        syncDraft() {
            if (!this.endpoint) {
                this.draft = {};
                this.docsJSON = null;
                return;
            }
            this.draft = cloneEndpoint(this.endpoint);
            this.docsJSON = null;
            this.$nextTick(() => {
                this.loadDocsIntoEditor();
            });
        },
        onDocsMounted() {
            this.loadDocsIntoEditor();
        },
        loadDocsIntoEditor() {
            const instance = this.$refs.docsEditor;
            if (!instance || typeof instance.editor !== 'function') return;
            const editor = instance.editor();
            if (!editor) return;
            const content = this.parseDocsContent(this.draft.description);
            editor.commands.setContent(content || '');
            this.docsJSON = editor.getJSON();
        },
        parseDocsContent(raw) {
            const text = typeof raw === 'string' ? raw.trim() : '';
            if (!text) return null;
            try {
                const parsed = JSON.parse(text);
                if (parsed && typeof parsed === 'object' && parsed.type) {
                    return parsed;
                }
            } catch {
                // Not JSON: fall back to Markdown parsing below.
            }
            const instance = this.$refs.docsEditor;
            if (instance && typeof instance.computeMarkdown === 'function') {
                try {
                    return instance.computeMarkdown(raw);
                } catch {
                    return null;
                }
            }
            return null;
        },
        onDocsChange() {
            const instance = this.$refs.docsEditor;
            if (!instance || typeof instance.editor !== 'function') return;
            const editor = instance.editor();
            if (!editor) return;
            this.docsJSON = editor.getJSON();
        },
        serializeDocsContent() {
            const content = this.currentDocsContent();
            if (!content) return '';
            try {
                return JSON.stringify(content);
            } catch {
                return '';
            }
        },
        currentDocsContent() {
            const instance = this.$refs.docsEditor;
            if (instance && typeof instance.editor === 'function') {
                const editor = instance.editor();
                if (editor) return editor.getJSON();
            }
            return this.docsJSON;
        },
        onTabChange(value) {
            if (value?.key) this.activeTabKey = value.key;
        },
        changeMethod(options) {
            this.draft.method = options?.[0]?.key || 'GET';
        },
        changeBodyType(options) {
            const nextType = options?.[0]?.key || 'none';
            this.draft.bodyType = nextType;
            if (nextType === 'form' && !parseFormRows(this.draft.body).length) {
                this.draft.body = '[]';
            }
        },
        changeAuthType(options) {
            const nextType = options?.[0]?.key || 'none';
            this.draft.authType = nextType;
            if (nextType === 'bearer' && !this.draft.authData.token) {
                this.draft.authData.token = '';
            }
            if (nextType === 'basic') {
                this.draft.authData.username =
                    this.draft.authData.username || '';
                this.draft.authData.password =
                    this.draft.authData.password || '';
            }
            if (nextType === 'api-key') {
                this.draft.authData.key = this.draft.authData.key || '';
                this.draft.authData.value = this.draft.authData.value || '';
                this.draft.authData.in = this.draft.authData.in || 'header';
            }
        },
        changeAuthLocation(options) {
            this.draft.authData.in = options?.[0]?.key || 'header';
        },
        changeCollection(options) {
            this.draft.collection = options?.[0]?.key || DEFAULT_COLLECTION;
        },
        setEnabled(value) {
            this.draft.enabled = Boolean(value);
        },
        toggleReveal(key) {
            this.revealAuth[key] = !this.revealAuth[key];
        },
        enabledRowCount(rows) {
            return (rows || []).filter((item) => item.enabled && item.key)
                .length;
        },
        async saveEndpoint() {
            this.saving = true;
            const result = await this.updateEndpoint(this.endpoint.id, {
                name: this.draft.name,
                method: this.draft.method,
                url: this.draft.url,
                collection: this.draft.collection,
                description: this.serializeDocsContent(),
                params: this.draft.params,
                headersData: this.draft.headersData,
                authType: this.draft.authType,
                authData: this.draft.authData,
                bodyType: this.draft.bodyType,
                body: this.draft.body,
                preRequestScript: this.draft.preRequestScript || '',
                postResponseScript: this.draft.postResponseScript || '',
                enabled: this.draft.enabled
            });
            this.saving = false;
            if (!result.ok) {
                this.errorMessage = result.message;
                return;
            }
            this.draft = cloneEndpoint(result.endpoint);
            this.$nextTick(() => {
                this.loadDocsIntoEditor();
            });
        },
        async sendRequest() {
            this.errorMessage = '';
            this.sending = true;
            const result = await this.runEndpoint(
                this.endpoint.id,
                { ...this.draft },
                null,
                'manual'
            );
            this.sending = false;
            if (!result.ok) {
                this.errorMessage = result.message;
                return;
            }
            this.response = result.result;
        },
        formatSize(value) {
            const bytes = Number(value);
            if (!Number.isFinite(bytes)) return '-';
            if (bytes < 1024) return `${bytes} B`;
            if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
            return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
        },
        onScriptTabChange(value) {
            if (value?.key) this.activeScriptKey = value.key;
        },
        stringifyConsoleArg(value) {
            try {
                return JSON.stringify(value);
            } catch {
                return String(value);
            }
        },
        insertScriptSnippet() {
            const snippet =
                this.activeScriptKey === 'preRequest'
                    ? 'pm.environment.set("token", "value");'
                    : 'pm.test("Status code is 200", function () {\n    pm.response.to.have.status(200);\n});';
            if (this.activeScriptKey === 'preRequest') {
                const current = this.draft.preRequestScript || '';
                this.draft.preRequestScript = current
                    ? `${current.replace(/\s*$/, '')}\n${snippet}`
                    : snippet;
            } else {
                const current = this.draft.postResponseScript || '';
                this.draft.postResponseScript = current
                    ? `${current.replace(/\s*$/, '')}\n${snippet}`
                    : snippet;
            }
        },
        variableMapForCollection() {
            const map = {};
            for (const item of this.collectionVariableRows) {
                if (item.enabled === false || !item.key) continue;
                map[item.key] = item.value;
            }
            return map;
        },
        async runCurrentScript() {
            const script =
                this.activeScriptKey === 'preRequest'
                    ? this.draft.preRequestScript || ''
                    : this.draft.postResponseScript || '';
            if (!script.trim()) {
                this.scriptFeedback = {
                    error: this.local('The script is empty.'),
                    tests: [],
                    console: []
                };
                return;
            }
            this.scriptRunning = true;
            const variables = this.variableMapForCollection();
            const result = await this.runEndpointScript({
                script,
                phase:
                    this.activeScriptKey === 'preRequest'
                        ? 'prerequest'
                        : 'test',
                environment: variables,
                collectionVariables: variables,
                request: {
                    url: this.draft.url || '',
                    method: this.draft.method || 'GET',
                    headers: this.draft.headersData || [],
                    body: this.draft.body || ''
                },
                response: this.response || null
            });
            this.scriptRunning = false;
            if (!result.ok) {
                this.scriptFeedback = {
                    error: result.message,
                    tests: [],
                    console: []
                };
                return;
            }
            this.scriptFeedback = result.result || null;
            // 脚本可能写入集合变量，运行后刷新变量列表。
            await this.refreshVariables();
        },
        clearScriptFeedback() {
            this.scriptFeedback = null;
        },
        backToEndpoints() {
            this.$router.push({ name: 'endpoints' });
        }
    }
};
</script>

<style lang="scss" scoped>
.endpoint-editor-page {
    .editor-topbar {
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
    }

    .back-button {
        width: 38px;
        height: 38px;
        padding: 0;
        flex-shrink: 0;
    }

    .topbar-spacer {
        flex: 1 1 auto;
        min-width: 8px;
    }

    .request-bar,
    .body-toolbar,
    .auth-type-row,
    .response-meta,
    .response-header {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .request-bar {
        flex-wrap: wrap;
    }

    .editor-alert,
    .response-error {
        margin-top: 12px;
        padding: 10px 12px;
        border: 1px solid rgba(196, 43, 28, 0.25);
        border-radius: 10px;
        background: rgba(196, 43, 28, 0.08);
        color: var(--ph-danger);
        font-size: 12px;
    }

    .editor-tab-panel {
        min-height: 320px;
        margin-top: 14px;
        padding: 18px;
        border: 1px solid var(--ph-border);
        border-radius: 12px;
        background: var(--ph-surface-soft);
    }

    .panel-heading {
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        justify-content: space-between;

        strong {
            color: var(--ph-text);
            font-size: 13px;
        }

        span {
            color: var(--ph-text-muted);
            font-size: 11px;
        }
    }

    .field-block {
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

    .docs-panel {
        display: flex;
        flex-direction: column;
    }

    .docs-editor {
        width: 100%;
        height: 520px;
        min-height: 360px;
        border: 1px solid var(--ph-border);
        border-radius: 12px;
        overflow: hidden;
        background: var(--ph-surface);

        :deep(.power-editor-container) {
            width: 100%;
            height: 100%;
            background: transparent;
        }

        :deep(.tip-tap-editor-container) {
            background: transparent;
        }
    }

    .auth-panel,
    .body-panel,
    .kv-panel {
        min-width: 0;
    }

    .auth-fields {
        margin-top: 16px;
    }

    .auth-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
    }

    .auth-empty,
    .body-empty,
    .response-empty {
        color: var(--ph-text-muted);
        font-size: 12px;
    }

    .body-toolbar {
        margin-bottom: 14px;
    }

    .scripts-panel {
        min-width: 0;
    }

    .scripts-layout {
        display: grid;
        grid-template-columns: minmax(180px, 240px) minmax(0, 1fr);
        gap: 16px;
        align-items: start;
    }

    .scripts-side {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .scripts-hint {
        color: var(--ph-text-muted);
        font-size: 11px;
        line-height: 1.5;
    }

    .scripts-toolbar {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
    }

    .scripts-main {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .scripts-feedback {
        padding: 12px;
        border: 1px solid var(--ph-border);
        border-radius: 10px;
        background: var(--ph-surface-soft);
    }

    .scripts-feedback-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;

        strong {
            color: var(--ph-text);
            font-size: 12px;
        }
    }

    .scripts-tests {
        margin: 10px 0 0;
        padding: 0;
        list-style: none;
        display: flex;
        flex-direction: column;
        gap: 6px;

        li {
            display: flex;
            align-items: center;
            gap: 8px;
            color: var(--ph-text-secondary);
            font-size: 12px;

            .ms-Icon {
                color: var(--ph-success, #107c10);
            }

            &.failed .ms-Icon {
                color: var(--ph-danger);
            }
        }
    }

    .scripts-test-error {
        color: var(--ph-danger);
        font-size: 11px;
    }

    .scripts-console {
        max-height: 200px;
        margin: 10px 0 0;
        padding: 10px;
        border-radius: 8px;
        background: var(--ph-surface);
        color: var(--ph-text-secondary);
        font-family: var(--ph-code-font);
        font-size: 11px;
        overflow: auto;
        white-space: pre-wrap;
    }

    .response-panel {
        margin-top: 16px;
        padding: 18px;
        border: 1px solid var(--ph-border);
        border-radius: 14px;
        background: var(--ph-surface);
    }

    .response-header {
        justify-content: space-between;

        strong {
            display: block;
            color: var(--ph-text);
            font-size: 14px;
        }

        span {
            display: block;
            margin-top: 4px;
            color: var(--ph-text-muted);
            font-size: 11px;
        }
    }

    .response-meta {
        margin-top: 12px;
        flex-wrap: wrap;
        color: var(--ph-text-secondary);
        font-size: 12px;

        code {
            color: var(--ph-text);
            font-family: var(--ph-code-font);
        }
    }

    .response-headers {
        margin-top: 12px;

        summary {
            cursor: pointer;
            color: var(--ph-text-secondary);
            font-size: 12px;
        }

        pre {
            max-height: 220px;
            margin: 10px 0 0;
            padding: 12px;
            border-radius: 10px;
            background: var(--ph-surface-soft);
            color: var(--ph-text-secondary);
            font-family: var(--ph-code-font);
            font-size: 11px;
            overflow: auto;
        }
    }

    .response-empty,
    .editor-empty {
        min-height: 220px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        text-align: center;

        .ms-Icon {
            font-size: 28px;
        }

        strong {
            color: var(--ph-text);
            font-size: 14px;
        }

        span {
            color: var(--ph-text-muted);
            font-size: 12px;
        }
    }

    @media (max-width: 880px) {
        .auth-grid {
            grid-template-columns: 1fr;
        }

        .scripts-layout {
            grid-template-columns: 1fr;
        }

        .request-bar {
            align-items: stretch;
            flex-direction: column;
        }
    }
}
</style>
