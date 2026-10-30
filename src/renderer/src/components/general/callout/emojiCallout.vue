<template>
    <div class="ph-emoji-picker">
        <span
            class="ph-emoji-trigger"
            :title="local('Emoji')"
            @click.stop="toggle"
        >
            {{ modelValue || '📁' }}
        </span>

        <teleport to="body">
            <div
                v-if="show"
                class="ph-emoji-panel"
                :style="panelStyle"
                @click.stop
            >
                <div class="ph-emoji-banner">
                    <span>{{ local('Emoji') }}</span>
                    <fv-button
                        :theme="theme"
                        border-radius="6"
                        style="height: 26px"
                        @click="insertRandom"
                    >
                        <i class="ms-Icon ms-Icon--Shuffle"></i>
                        <span class="ph-emoji-random-text">{{ local('Random') }}</span>
                    </fv-button>
                </div>

                <div class="ph-emoji-list">
                    <div
                        v-for="(group, index) in emojiList"
                        :key="index"
                        class="ph-emoji-group"
                    >
                        <p class="ph-emoji-group-title">{{ local(group.name) }}</p>
                        <div class="ph-emoji-group-items">
                            <span
                                v-for="(item, i) in group.emojis"
                                :key="i"
                                class="ph-emoji-item"
                                v-html="item"
                                @click="insertEmoji(item)"
                            ></span>
                        </div>
                    </div>
                </div>
            </div>
        </teleport>
    </div>
</template>

<script>
import { mapState } from 'pinia';

import emojiList from '@/js/emojiList.js';
import { useAppConfigStore } from '@/stores/appConfig';

const PANEL_WIDTH = 300;
const PANEL_GAP = 8;

export default {
    name: 'EmojiCallout',
    emits: ['insert-emoji'],
    props: {
        modelValue: {
            type: String,
            default: ''
        },
        theme: {
            type: String,
            default: 'light'
        }
    },
    data() {
        return {
            emojiList,
            show: false,
            panelStyle: {
                position: 'fixed',
                top: '0px',
                left: '0px'
            }
        };
    },
    computed: {
        ...mapState(useAppConfigStore, ['local'])
    },
    beforeUnmount() {
        this.detachListeners();
    },
    methods: {
        toggle() {
            if (this.show) {
                this.close();
            } else {
                this.open();
            }
        },
        open() {
            this.show = true;
            this.attachListeners();
            this.$nextTick(this.updatePosition);
        },
        close() {
            this.show = false;
            this.detachListeners();
        },
        updatePosition() {
            const trigger = this.$el?.querySelector?.('.ph-emoji-trigger');
            if (!trigger) return;
            const rect = trigger.getBoundingClientRect();
            const maxLeft = window.innerWidth - PANEL_WIDTH - 12;
            const left = Math.max(12, Math.min(rect.left, maxLeft));
            const top = Math.min(
                rect.bottom + PANEL_GAP,
                Math.max(12, window.innerHeight - 120)
            );
            this.panelStyle = {
                position: 'fixed',
                top: `${Math.round(top)}px`,
                left: `${Math.round(left)}px`
            };
        },
        attachListeners() {
            document.addEventListener('mousedown', this.onDocumentClick, true);
            window.addEventListener('resize', this.updatePosition);
            window.addEventListener('scroll', this.updatePosition, true);
        },
        detachListeners() {
            document.removeEventListener('mousedown', this.onDocumentClick, true);
            window.removeEventListener('resize', this.updatePosition);
            window.removeEventListener('scroll', this.updatePosition, true);
        },
        onDocumentClick(event) {
            const target = event.target;
            if (this.$el?.contains?.(target)) return;
            if (target?.closest?.('.ph-emoji-panel')) return;
            this.close();
        },
        insertEmoji(emoji) {
            this.$emit('insert-emoji', emoji);
            this.close();
        },
        insertRandom() {
            const group =
                this.emojiList[
                    Math.floor(Math.random() * this.emojiList.length)
                ];
            const list = group?.emojis || [];
            if (!list.length) return;
            this.$emit(
                'insert-emoji',
                list[Math.floor(Math.random() * list.length)]
            );
            this.close();
        }
    }
};
</script>

<style lang="scss" scoped>
.ph-emoji-picker {
    display: inline-flex;

    .ph-emoji-trigger {
        min-width: 38px;
        height: 38px;
        padding: 0 8px;
        border: 1px solid var(--ph-border);
        border-radius: 10px;
        background: var(--ph-surface-soft);
        font-size: 20px;
        line-height: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        user-select: none;

        &:hover {
            background: var(--ph-surface-hover);
        }
    }
}
</style>

<style lang="scss">
.ph-emoji-panel {
    z-index: 3000;
    width: 300px;
    max-height: 440px;
    padding: 10px 12px;
    border: 1px solid var(--ph-border);
    border-radius: 12px;
    background: var(--ph-surface);
    box-shadow: var(--ph-shadow-md);
    display: flex;
    flex-direction: column;

    .ph-emoji-banner {
        height: 35px;
        flex: 0 0 auto;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        font-size: 13px;
        color: var(--ph-text);
    }

    .ph-emoji-random-text {
        margin-left: 4px;
    }

    .ph-emoji-list {
        flex: 1;
        min-height: 0;
        padding: 4px 0;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .ph-emoji-group {
        width: 100%;
    }

    .ph-emoji-group-title {
        margin-bottom: 4px;
        color: var(--ph-text-muted);
        font-size: 12px;
    }

    .ph-emoji-group-items {
        display: flex;
        flex-wrap: wrap;
    }

    .ph-emoji-item {
        width: 34px;
        height: 34px;
        border-radius: 4px;
        font-size: 20px;
        line-height: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        user-select: none;

        &:hover {
            background: rgba(200, 200, 200, 0.5);
        }
    }
}
</style>