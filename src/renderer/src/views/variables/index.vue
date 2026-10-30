<template>
    <div class="page-stack variables-page">
        <sectionCard
            :title="local('Collection variables')"
            :description="local('Store values for a collection and reuse them by name in requests and scripts.')"
        >
            <template #actions>
                <div class="toolbar-actions">
                    <fv-button
                        :theme="resolvedTheme"
                        border-radius="8"
                        icon="Add"
                        style="height: 34px"
                        :disabled="saving"
                        @click="addRow"
                    >
                        {{ local('New variable') }}
                    </fv-button>
                    <fv-button
                        :theme="resolvedTheme"
                        background="#0078d4"
                        foreground="#ffffff"
                        border-radius="8"
                        icon="Save"
                        style="height: 34px"
                        :disabled="saving || !dirty"
                        @click="saveAll"
                    >
                        {{ saving ? local('Saving') : local('Save variables') }}
                    </fv-button>
                </div>
            </template>

            <div class="variables-toolbar">
                <span>{{ local('Collection') }}</span>
                <fv-drop-down
                    :model-value="collectionSelection"
                    :options="collectionOptions"
                    :theme="resolvedTheme"
                    border-radius="8"
                    input-height="36px"
                    style="width: min(280px, 100%)"
                    @update:model-value="changeCollection"
                ></fv-drop-down>
                <span class="record-count">
                    {{ rows.length }} {{ local('Variables') }}
                </span>
            </div>

            <div v-if="errorMessage" class="variables-alert">
                {{ errorMessage }}
            </div>

            <div class="variable-grid">
                <div class="variable-head">
                    <span class="row-switch"></span>
                    <span>{{ local('Key') }}</span>
                    <span>{{ local('Value') }}</span>
                    <span>{{ local('Type') }}</span>
                    <span>{{ local('Description') }}</span>
                    <span class="row-action"></span>
                </div>

                <div
                    v-for="(item, index) in rows"
                    :key="item.id"
                    class="variable-row"
                >
                    <fv-check-box
                        :model-value="item.enabled"
                        :theme="resolvedTheme"
                        @update:model-value="updateRow(index, { enabled: $event })"
                    ></fv-check-box>
                    <fv-text-box
                        :model-value="item.key"
                        :theme="resolvedTheme"
                        :placeholder="local('Key')"
                        border-radius="8"
                        @update:model-value="updateRow(index, { key: $event })"
                    ></fv-text-box>
                    <fv-text-box
                        :model-value="item.value"
                        :theme="resolvedTheme"
                        :type="item.hidden ? 'password' : 'text'"
                        :icon="item.hidden ? 'View' : 'Hide'"
                        :placeholder="local('Value')"
                        border-radius="8"
                        @icon-click="updateRow(index, { hidden: !item.hidden })"
                        @update:model-value="updateRow(index, { value: $event })"
                    ></fv-text-box>
                    <fv-drop-down
                        :model-value="typeSelection(item)"
                        :options="typeOptions"
                        :theme="resolvedTheme"
                        border-radius="8"
                        input-height="34px"
                        @update:model-value="changeType(index, $event)"
                    ></fv-drop-down>
                    <fv-text-box
                        :model-value="item.description"
                        :theme="resolvedTheme"
                        :placeholder="local('Description')"
                        border-radius="8"
                        @update:model-value="updateRow(index, { description: $event })"
                    ></fv-text-box>
                    <fv-button
                        :theme="resolvedTheme"
                        border-radius="8"
                        style="width: 34px; height: 34px"
                        :title="local('Delete')"
                        @click="removeRow(index)"
                    >
                        <i class="ms-Icon ms-Icon--Delete"></i>
                    </fv-button>
                </div>

                <div v-if="!rows.length" class="variables-empty">
                    <i class="ms-Icon ms-Icon--Inbox"></i>
                    <strong>{{ local('No variables yet') }}</strong>
                    <span>{{
                        local('Add a variable to reuse a value across this collection.')
                    }}</span>
                </div>
            </div>
        </sectionCard>
    </div>
</template>

<script>
import { mapActions, mapState } from 'pinia';

import sectionCard from '@/components/common/sectionCard.vue';
import { useAppConfigStore } from '@/stores/appConfig';
import { useWorkspaceStore } from '@/stores/workspace';

const DEFAULT_COLLECTION = 'Default collection';
const createVariable = () => ({
    id: `variable-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    key: '',
    value: '',
    type: 'text',
    hidden: false,
    enabled: true,
    description: ''
});

export default {
    name: 'VariablesView',
    components: {
        sectionCard
    },
    data() {
        return {
            activeCollection: DEFAULT_COLLECTION,
            rows: [],
            saving: false,
            dirty: false,
            errorMessage: ''
        };
    },
    computed: {
        ...mapState(useAppConfigStore, ['resolvedTheme', 'local']),
        ...mapState(useWorkspaceStore, {
            workspaceCollections: 'collections',
            variablesByCollection: 'variablesByCollection'
        }),
        collectionOptions() {
            const names = this.workspaceCollections.map(
                (collection) => collection.name
            );
            if (!names.includes(DEFAULT_COLLECTION)) {
                names.push(DEFAULT_COLLECTION);
            }
            return names.map((name) => ({ key: name, text: name }));
        },
        collectionSelection() {
            return this.collectionOptions.filter(
                (item) => item.key === this.activeCollection
            );
        },
        typeOptions() {
            return [
                { key: 'text', text: this.local('Text') },
                { key: 'blob', text: this.local('Blob') }
            ];
        }
    },
    watch: {
        activeCollection: {
            immediate: true,
            handler() {
                this.syncRows();
            }
        },
        variablesByCollection() {
            if (!this.dirty) this.syncRows();
        }
    },
    async mounted() {
        await this.workspaceInitialize();
        if (
            !this.workspaceCollections.some(
                (collection) => collection.name === this.activeCollection
            )
        ) {
            this.activeCollection =
                this.workspaceCollections[0]?.name || DEFAULT_COLLECTION;
        }
        this.syncRows();
    },
    methods: {
        ...mapActions(useWorkspaceStore, {
            workspaceInitialize: 'initialize',
            saveVariables: 'saveVariables'
        }),
        typeSelection(item) {
            return this.typeOptions.filter((option) => option.key === item.type);
        },
        changeCollection(value) {
            this.activeCollection = value?.[0]?.key || DEFAULT_COLLECTION;
        },
        changeType(index, value) {
            this.updateRow(index, { type: value?.[0]?.key || 'text' });
        },
        syncRows() {
            const items = this.variablesByCollection[this.activeCollection] || [];
            this.rows = items.map((item) => ({
                id: item.id,
                key: item.key,
                value: item.value,
                type: item.type || 'text',
                hidden: item.hidden === true,
                enabled: item.enabled !== false,
                description: item.description || ''
            }));
            this.dirty = false;
        },
        updateRow(index, patch) {
            this.rows.splice(index, 1, { ...this.rows[index], ...patch });
            this.dirty = true;
        },
        addRow() {
            this.rows.push(createVariable());
            this.dirty = true;
        },
        removeRow(index) {
            this.rows.splice(index, 1);
            this.dirty = true;
        },
        async saveAll() {
            this.saving = true;
            this.errorMessage = '';
            const result = await this.saveVariables(
                this.activeCollection,
                this.rows
            );
            this.saving = false;
            if (!result.ok) {
                this.errorMessage = result.message;
                return;
            }
            this.syncRows();
        }
    }
};
</script>

<style lang="scss" scoped>
.variables-page {
    .toolbar-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
    }

    .variables-toolbar {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
        margin-bottom: 14px;

        > span:first-child {
            color: var(--ph-text-secondary);
            font-size: 12px;
        }

        .record-count {
            color: var(--ph-text-muted);
            font-size: 11px;
        }
    }

    .variables-alert {
        margin-bottom: 12px;
        padding: 10px 12px;
        border: 1px solid rgba(196, 43, 28, 0.25);
        border-radius: 10px;
        background: rgba(196, 43, 28, 0.08);
        color: var(--ph-danger);
        font-size: 12px;
    }

    .variable-grid {
        min-width: 0;
        overflow-x: auto;
    }

    .variable-head,
    .variable-row {
        min-width: 760px;
        display: grid;
        grid-template-columns:
            34px minmax(140px, 1fr) minmax(200px, 1.4fr)
            130px minmax(160px, 1fr) 38px;
        align-items: center;
        gap: 10px;
    }

    .variable-head {
        min-height: 32px;
        color: var(--ph-text-muted);
        font-size: 10px;
        letter-spacing: 0.04em;
        text-transform: uppercase;
    }

    .variable-row {
        min-height: 48px;
        border-top: 1px solid var(--ph-border-subtle);

        :deep(.fv-CheckBox) {
            width: 20px;
        }

        :deep(.fv-TextBox),
        :deep(.fv-DropDown) {
            width: 100%;
            min-width: 0;
        }
    }

    .variables-empty {
        min-height: 200px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        text-align: center;

        .ms-Icon {
            font-size: 26px;
            color: var(--ph-text-muted);
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
}
</style>