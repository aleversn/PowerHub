<template>
    <fv-panel
        v-model="panelValue"
        :title="title"
        :theme="theme"
        :width="width"
        :height="height"
        :background="panelBackground"
        :title-size="15"
        :teleport="teleport"
        :is-acrylic="true"
        :is-central-side="true"
        :is-footer="isFooter"
        :is-light-dismiss="isLightDismiss"
        :content-padding="contentPadding"
    >
        <template #header>
            <slot name="control-header">
                <slot name="header">
                    <p class="panel-title">{{ title }}</p>
                </slot>
                <button
                    class="window-close-button"
                    type="button"
                    :title="local('Close')"
                    @click="close"
                >
                    <i class="ms-Icon ms-Icon--Cancel"></i>
                </button>
            </slot>
        </template>

        <template #container>
            <div
                class="float-window-container"
                :class="{ dark: theme === 'dark' }"
                @keyup.enter="$emit('confirm')"
            >
                <slot name="content"></slot>
            </div>
        </template>

        <template v-if="isFooter" #footer>
            <slot name="control" :close="close">
                <fv-button :theme="theme" @click="close">
                    {{ local('Close') }}
                </fv-button>
            </slot>
        </template>
    </fv-panel>
</template>

<script>
import { mapState } from 'pinia';

import { useAppConfigStore } from '@/stores/appConfig';

export default {
    name: 'FloatWindowBase',
    props: {
        modelValue: {
            type: Boolean,
            default: false
        },
        title: {
            type: String,
            default: 'Title'
        },
        width: {
            type: String,
            default: '960px'
        },
        height: {
            type: String,
            default: '86%'
        },
        contentPadding: {
            type: String,
            default: '0'
        },
        isFooter: {
            type: Boolean,
            default: true
        },
        isLightDismiss: {
            type: Boolean,
            default: true
        },
        teleport: {
            type: Boolean,
            default: false
        },
        theme: {
            type: String,
            default: 'light'
        }
    },
    data() {
        return {
            panelValue: this.modelValue
        };
    },
    computed: {
        ...mapState(useAppConfigStore, ['local']),
        panelBackground() {
            return this.theme === 'dark'
                ? 'rgba(21, 23, 28, 0.92)'
                : 'rgba(248, 250, 253, 0.92)';
        }
    },
    watch: {
        modelValue(value) {
            this.panelValue = value;
        },
        panelValue(value) {
            this.$emit('update:modelValue', value);
        }
    },
    methods: {
        close() {
            this.panelValue = false;
        }
    }
};
</script>

<style lang="scss">
.float-window-container {
    position: relative;
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
    padding: 18px 20px 20px;
    color: var(--ph-text);
    font-family: var(--ph-font);
    font-weight: 400;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    overflow: auto;

    &.dark {
        color: rgba(255, 255, 255, 0.86);

        p {
            color: rgba(255, 255, 255, 0.82);
        }
    }

    > * {
        min-width: 0;
        flex-shrink: 0;
    }
}

.window-close-button {
    width: 30px;
    height: 30px;
    flex: 0 0 30px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--ph-text-secondary);
    display: grid;
    place-items: center;
    cursor: pointer;

    &:hover {
        background: var(--ph-surface-hover);
    }

    .ms-Icon {
        font-size: 12px;
    }
}
</style>
