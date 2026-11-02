<template>
    <float-window-base
        :model-value="modelValue"
        :title="local('New collection')"
        :theme="resolvedTheme"
        width="min(480px, calc(100vw - 32px))"
        height="min(500px, 90vh)"
        :teleport="true"
        :is-light-dismiss="!saving"
        @update:model-value="$emit('update:modelValue', $event)"
        @confirm="createCollection"
    >
        <template #content>
            <div class="collection-form">
                <span>{{ local('Collection name') }}</span>
                <div class="collection-input">
                    <emoji-callout
                        :model-value="emoji"
                        :theme="resolvedTheme"
                        @insert-emoji="emoji = $event"
                    />
                    <fv-text-box
                        v-model="name"
                        :theme="resolvedTheme"
                        :placeholder="local('Collection name')"
                        :aria-label="local('Collection name')"
                        :disabled="saving"
                        border-radius="8"
                        style="height: 40px;"
                    />
                </div>
                <div v-if="errorMessage" class="error" role="alert">
                    {{ errorMessage }}
                </div>
            </div>
        </template>
        <template #control>
            <div class="actions">
                <fv-button
                    :theme="resolvedTheme"
                    :disabled="saving"
                    border-radius="8"
                    @click="$emit('update:modelValue', false)"
                    >{{ local('Cancel') }}</fv-button
                >
                <fv-button
                    :background="subColor"
                    :disabled="saving || !name.trim()"
                    border-radius="8"
                    @click="createCollection"
                    >{{ local('Create') }}</fv-button
                >
            </div>
        </template>
    </float-window-base>
</template>
<script>
import { mapActions, mapState } from 'pinia';
import FloatWindowBase from '@/components/window/floatWindowBase.vue';
import EmojiCallout from '@/components/general/callout/emojiCallout.vue';
import { useAppConfigStore } from '@/stores/appConfig';
import { useThemeStore } from '@/stores/theme';
import { useWorkspaceStore } from '@/stores/workspace';

export default {
    name: 'CollectionCreator',
    components: { FloatWindowBase, EmojiCallout },
    props: { modelValue: { type: Boolean, default: false } },
    emits: ['update:modelValue'],
    data() {
        return { name: '', emoji: '', saving: false, errorMessage: '' };
    },
    computed: {
        ...mapState(useAppConfigStore, ['local', 'resolvedTheme']),
        ...mapState(useThemeStore, ['subColor'])
    },
    watch: {
        modelValue(open) {
            if (open) {
                this.name = '';
                this.emoji = '';
                this.errorMessage = '';
            }
        }
    },
    methods: {
        ...mapActions(useWorkspaceStore, ['addCollection']),
        async createCollection() {
            const name = this.name.trim();
            if (!name || this.saving) return;
            this.saving = true;
            this.errorMessage = '';
            try {
                const result = await this.addCollection({
                    name,
                    emoji: this.emoji
                });
                if (!result.ok) {
                    this.errorMessage = result.message;
                    return;
                }
                this.$emit('update:modelValue', false);
            } finally {
                this.saving = false;
            }
        }
    }
};
</script>
<style lang="scss" scoped>
.collection-form {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
    color: var(--ph-text-secondary);
    font-size: 12px;
}
.collection-input {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
}
.collection-input :deep(.fv-TextBox) {
    flex: 1;
    width: 100%;
    min-width: 0;
}
.error {
    color: var(--ph-danger);
    overflow-wrap: anywhere;
}
.actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
}
</style>
