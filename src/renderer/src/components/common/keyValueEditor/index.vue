<template>
    <div class="key-value-editor">
        <div class="key-value-head">
            <span class="row-switch"></span>
            <span>{{ local('Key') }}</span>
            <span>{{ local('Value') }}</span>
            <span class="row-action"></span>
        </div>

        <div
            v-for="(item, index) in displayRows"
            :key="item.id"
            class="key-value-row"
        >
            <fv-check-box
                :model-value="item.enabled"
                :theme="resolvedTheme"
                @update:model-value="updateRow(index, { enabled: $event })"
            ></fv-check-box>
            <fv-text-box
                :model-value="item.key"
                :theme="resolvedTheme"
                :placeholder="keyPlaceholder"
                border-radius="8"
                @update:model-value="updateRow(index, { key: $event })"
            ></fv-text-box>
            <variableInput
                :model-value="item.value"
                :secret="true"
                :initially-hidden="item.hide"
                :variables="variables"
                :placeholder="valuePlaceholder"
                @update:model-value="updateRow(index, { value: $event })"
            ></variableInput>
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

        <div class="key-value-footer">
            <fv-button
                :theme="resolvedTheme"
                border-radius="8"
                icon="Add"
                style="height: 34px"
                @click="addRow"
            >
                {{ local('Add row') }}
            </fv-button>
        </div>
    </div>
</template>

<script>
import { mapState } from 'pinia';

import variableInput from '@/components/common/variableInput.vue';
import { useAppConfigStore } from '@/stores/appConfig';

const createRow = (item = {}) => ({
    id: item.id || `row-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    key: String(item.key ?? ''),
    value: String(item.value ?? ''),
    enabled: item.enabled !== false,
    hide: item.hide === true
});

export default {
    name: 'KeyValueEditor',
    components: { variableInput },
    props: {
        variables: { type: Array, default: () => [] },
        modelValue: {
            type: Array,
            default: () => []
        },
        keyPlaceholder: {
            type: String,
            default: 'Key'
        },
        valuePlaceholder: {
            type: String,
            default: 'Value'
        }
    },
    data() {
        return {
            emptyRow: createRow()
        };
    },
    computed: {
        ...mapState(useAppConfigStore, ['local', 'resolvedTheme']),
        rows() {
            return Array.isArray(this.modelValue) ? this.modelValue : [];
        },
        // 没有任何行时保留一个默认空行，用户可直接输入，无需先点 Add row。
        displayRows() {
            return this.rows.length ? this.rows : [this.emptyRow];
        }
    },
    methods: {
        emitRows(rows) {
            this.emptyRow = createRow();
            this.$emit(
                'update:modelValue',
                rows.map((item) => ({ ...item }))
            );
        },
        updateRow(index, patch) {
            const rows = this.displayRows.map((item, itemIndex) =>
                itemIndex === index ? { ...item, ...patch } : { ...item }
            );
            this.emitRows(rows);
        },
        toggleHide(index) {
            const row = this.displayRows[index];
            if (!row) return;
            this.updateRow(index, { hide: !row.hide });
        },
        addRow() {
            this.emitRows([
                ...this.displayRows.map((item) => ({ ...item })),
                createRow()
            ]);
        },
        removeRow(index) {
            this.emptyRow = createRow();
            this.$emit(
                'update:modelValue',
                this.displayRows
                    .filter((_, itemIndex) => itemIndex !== index)
                    .map((item) => ({ ...item }))
            );
        }
    }
};
</script>

<style lang="scss" scoped>
.key-value-editor {
    min-width: 0;
    display: flex;
    flex-direction: column;

    .key-value-head,
    .key-value-row {
        display: grid;
        grid-template-columns: 34px minmax(120px, 0.9fr) minmax(180px, 1.5fr) 38px;
        align-items: center;
        gap: 10px;
    }

    .key-value-head {
        min-height: 32px;
        color: var(--ph-text-muted);
        font-size: 10px;
        letter-spacing: 0.04em;
        text-transform: uppercase;
    }

    .key-value-row {
        min-height: 48px;
        border-top: 1px solid var(--ph-border-subtle);

        :deep(.fv-CheckBox) {
            width: 20px;
        }

        :deep(.fv-TextBox) {
            width: 100%;
            min-width: 0;
        }
    }

    .key-value-footer {
        padding-top: 12px;
        display: flex;
        justify-content: flex-start;
    }

    @media (max-width: 760px) {
        .key-value-head,
        .key-value-row {
            grid-template-columns: 28px minmax(80px, 0.8fr) minmax(110px, 1.2fr) 34px;
            gap: 6px;
        }
    }
}
</style>