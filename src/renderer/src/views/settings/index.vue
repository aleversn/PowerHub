<template>
    <div class="page-stack settings-page">
        <sectionCard
            :title="local('Appearance')"
            :description="local('Configure theme, language, and scheduler defaults.')"
        >
            <div class="setting-list">
                <div class="setting-row">
                    <div class="setting-copy">
                        <strong>{{ local('Theme') }}</strong>
                        <span>Light / dark preference</span>
                    </div>
                    <div class="segmented-control">
                        <button
                            v-for="option in themeOptions"
                            :key="option.value"
                            type="button"
                            :class="{
                                active: config.theme === option.value
                            }"
                            @click="setTheme(option.value)"
                        >
                            <i class="ms-Icon" :class="option.icon"></i>
                            <span>{{ local(option.label) }}</span>
                        </button>
                    </div>
                </div>

                <div class="setting-row">
                    <div class="setting-copy">
                        <strong>{{ local('Language') }}</strong>
                        <span>中文 / English</span>
                    </div>
                    <fv-drop-down
                        :model-value="selectedLanguage"
                        :options="languageOptions"
                        :theme="resolvedTheme"
                        border-radius="8"
                        input-height="36px"
                        style="width: 180px"
                        @update:model-value="changeLanguage"
                    ></fv-drop-down>
                </div>

                <div class="setting-row">
                    <div class="setting-copy">
                        <strong>{{ local('Density') }}</strong>
                        <span>Spacing used by data views</span>
                    </div>
                    <fv-drop-down
                        :model-value="selectedDensity"
                        :options="densityOptions"
                        :theme="resolvedTheme"
                        border-radius="8"
                        input-height="36px"
                        style="width: 180px"
                        @update:model-value="changeDensity"
                    ></fv-drop-down>
                </div>
            </div>
        </sectionCard>

        <sectionCard :title="local('Request defaults')">
            <div class="setting-list">

                <div class="setting-row">
                    <div class="setting-copy">
                        <strong>{{ local('Timeout (ms)') }}</strong>
                        <span>1,000 - 300,000 ms</span>
                    </div>
                    <fv-text-box
                        v-model="timeoutDraft"
                        :theme="resolvedTheme"
                        type="number"
                        border-radius="8"
                        style="width: 180px"
                        @change="saveTimeout"
                    ></fv-text-box>
                </div>

                <div class="setting-row">
                    <div class="setting-copy">
                        <strong>{{
                            local('Follow redirects')
                        }}</strong>
                        <span>Use the response from the final endpoint</span>
                    </div>
                    <fv-toggle-switch
                        :model-value="config.followRedirects"
                        :theme="resolvedTheme"
                        :width="42"
                        :height="22"
                        switch-on-background="#0078d4"
                        @update:model-value="
                            (value) =>
                                updateConfig({
                                    followRedirects: value
                                })
                        "
                    ></fv-toggle-switch>
                </div>

                <div class="setting-row">
                    <div class="setting-copy">
                        <strong>{{ local('Verify SSL certificates') }}</strong>
                        <span>Disable only for trusted local services</span>
                    </div>
                    <fv-toggle-switch
                        :model-value="config.verifySSL"
                        :theme="resolvedTheme"
                        :width="42"
                        :height="22"
                        switch-on-background="#0078d4"
                        @update:model-value="
                            (value) =>
                                updateConfig({ verifySSL: value })
                        "
                    ></fv-toggle-switch>
                </div>
            </div>
        </sectionCard>

        <sectionCard :title="local('History and notifications')">
            <div class="setting-list">
                <div class="setting-row">
                    <div class="setting-copy">
                        <strong>{{ local('Save run history') }}</strong>
                        <span>Keep request results for local inspection</span>
                    </div>
                    <fv-toggle-switch
                        :model-value="config.saveRunHistory"
                        :theme="resolvedTheme"
                        :width="42"
                        :height="22"
                        switch-on-background="#0078d4"
                        @update:model-value="
                            (value) =>
                                updateConfig({
                                    saveRunHistory: value
                                })
                        "
                    ></fv-toggle-switch>
                </div>

                <div class="setting-row">
                    <div class="setting-copy">
                        <strong>{{ local('History retention (days)') }}</strong>
                        <span
                            >Older records can be pruned by the scheduler</span
                        >
                    </div>
                    <fv-text-box
                        v-model="retentionDraft"
                        :theme="resolvedTheme"
                        type="number"
                        border-radius="8"
                        style="width: 150px"
                        @change="saveRetention"
                    ></fv-text-box>
                </div>

                <div class="setting-row">
                    <div class="setting-copy">
                        <strong>{{
                            local('Desktop notifications')
                        }}</strong>
                        <span>Notify when a scheduled request fails</span>
                    </div>
                    <fv-toggle-switch
                        :model-value="config.desktopNotifications"
                        :theme="resolvedTheme"
                        :width="42"
                        :height="22"
                        switch-on-background="#0078d4"
                        @update:model-value="
                            (value) =>
                                updateConfig({
                                    desktopNotifications: value
                                })
                        "
                    ></fv-toggle-switch>
                </div>
            </div>
        </sectionCard>

        <div class="settings-footer">
            <fv-button
                :theme="resolvedTheme"
                border-radius="8"
                icon="Refresh"
                style="height: 34px"
                @click="resetSettings"
            >
                {{ local('Reset defaults') }}
            </fv-button>
        </div>
    </div>
</template>

<script>
import { mapActions, mapState } from 'pinia';

import sectionCard from '@/components/common/sectionCard.vue';
import { useAppConfigStore, defaultAppConfig } from '@/stores/appConfig';

export default {
    name: 'SettingsView',
    components: {
        sectionCard
    },
    data() {
        const appConfig = useAppConfigStore();
        return {
            timeoutDraft: String(appConfig.config.requestTimeout),
            retentionDraft: String(appConfig.config.historyRetention),
            themeOptions: [
                {
                    value: 'light',
                    label: 'Light',
                    icon: 'ms-Icon--Sunny'
                },
                {
                    value: 'dark',
                    label: 'Dark',
                    icon: 'ms-Icon--ClearNight'
                }
            ],
            languageOptions: [
                { key: 'cn', text: '简体中文' },
                { key: 'en', text: 'English' }
            ]
        };
    },
    computed: {
        ...mapState(useAppConfigStore, ['config', 'resolvedTheme', 'local']),
        densityOptions() {
            return [
                { key: 'comfortable', text: this.local('Comfortable') },
                { key: 'compact', text: this.local('Compact') }
            ];
        },
        selectedLanguage() {
            return this.languageOptions.filter(
                (option) => option.key === this.config.language
            );
        },
        selectedDensity() {
            return this.densityOptions.filter(
                (option) => option.key === this.config.density
            );
        }
    },
    watch: {
        'config.requestTimeout'(value) {
            this.timeoutDraft = String(value);
        },
        'config.historyRetention'(value) {
            this.retentionDraft = String(value);
        }
    },
    methods: {
        ...mapActions(useAppConfigStore, ['updateConfig', 'setTheme', 'setLanguage']),
        changeLanguage(options) {
            this.setLanguage(options?.[0]?.key || 'cn');
        },
        changeDensity(options) {
            this.updateConfig({ density: options?.[0]?.key || 'comfortable' });
        },
        saveTimeout() {
            this.updateConfig({ requestTimeout: Number(this.timeoutDraft) });
            this.timeoutDraft = String(this.config.requestTimeout);
        },
        saveRetention() {
            this.updateConfig({ historyRetention: Number(this.retentionDraft) });
            this.retentionDraft = String(this.config.historyRetention);
        },
        resetSettings() {
            this.updateConfig(defaultAppConfig);
        }
    }
};
</script>

<style lang="scss" scoped>
.settings-page {
    max-width: 1120px;

    .setting-list {
        display: flex;
        flex-direction: column;
    }

    .setting-row {
        min-height: 66px;
        border-bottom: 1px solid var(--ph-border-subtle);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;

        &:last-child {
            border-bottom: 0;
        }
    }

    .setting-copy {
        min-width: 0;
        display: flex;
        flex-direction: column;

        strong {
            color: var(--ph-text);
            font-size: 13px;
            font-weight: 600;
        }

        span {
            @include nowrap;

            margin-top: 4px;
            color: var(--ph-text-muted);
            font-size: 11px;
        }
    }

    .segmented-control {
        padding: 3px;
        border: 1px solid var(--ph-border);
        border-radius: 10px;
        background: var(--ph-surface-soft);
        display: flex;
        gap: 2px;

        button {
            min-height: 30px;
            padding: 0 11px;
            border: 0;
            border-radius: 7px;
            background: transparent;
            color: var(--ph-text-secondary);
            display: flex;
            align-items: center;
            gap: 6px;
            font: inherit;
            font-size: 11px;
            cursor: pointer;

            &.active {
                background: var(--ph-surface);
                color: var(--ph-accent);
                box-shadow: var(--ph-shadow-sm);
            }
        }
    }

    .settings-footer {
        display: flex;
        justify-content: flex-end;
    }

    @media (max-width: 720px) {
        .setting-row {
            align-items: flex-start;
            flex-direction: column;
            padding: 14px 0;
        }

        .segmented-control {
            width: 100%;

            button {
                flex: 1;
                justify-content: center;
            }
        }
    }
}
</style>
