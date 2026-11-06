<template>
    <section-card :fill="false" :title="local('App updates')">
        <div class="update-content" aria-live="polite">
            <div class="update-details">
                <strong>{{ local('Current version') }}: {{ updater.currentVersion || '—' }}</strong>
                <span>{{ statusText }}</span>
                <span v-if="updater.version && updater.status !== 'latest'">
                    {{ local('Available version') }}: {{ updater.version }}
                </span>
                <span v-if="updater.status === 'downloading'">{{ updater.percent }}%</span>
                <span v-if="updater.platform === 'darwin'" class="update-note">
                    {{ local('Automatic installation on macOS requires a signed app.') }}
                </span>
                <span v-if="updater.status === 'error' && updater.error" class="update-error">{{ updater.error }}</span>
            </div>
            <div class="update-actions">
                <fv-button
                    :theme="resolvedTheme"
                    border-radius="8"
                    icon="Refresh"
                    style="width: 120px; height: 34px"
                    :disabled="busy || updater.status === 'downloaded' || !updateApi"
                    @click="checkForUpdates"
                >{{ local('Check for updates') }}</fv-button>
                <fv-button
                    v-if="updater.status === 'downloaded'"
                    :background="subColor"
                    border-radius="8"
                    style="width: 120px; height: 34px"
                    @click="installUpdate"
                >{{ local('Restart and install') }}</fv-button>
                <fv-button
                    v-if="updater.status === 'error' || updater.status === 'unsupported'"
                    :theme="resolvedTheme"
                    border-radius="8"
                    style="width: 120px; height: 34px"
                    @click="openReleases"
                >{{ local('Open releases') }}</fv-button>
            </div>
        </div>
    </section-card>
</template>

<script>
import { mapState } from 'pinia';
import sectionCard from '@/components/common/sectionCard.vue';
import { useAppConfigStore } from '@/stores/appConfig';
import { useThemeStore } from '@/stores/theme';

export default {
    name: 'AppUpdate',
    components: { sectionCard },
    data() {
        return {
            updater: { status: 'idle', currentVersion: '', version: '', percent: 0, error: '', platform: '', packaged: false },
            unsubscribe: null
        };
    },
    computed: {
        ...mapState(useAppConfigStore, ['local', 'resolvedTheme']),
        ...mapState(useThemeStore, ['subColor']),
        updateApi() { return window.api?.appUpdate; },
        busy() { return ['checking', 'downloading'].includes(this.updater.status); },
        statusText() {
            const statuses = {
                idle: 'Check for the latest version.',
                checking: 'Checking for updates…',
                downloading: 'Downloading update…',
                downloaded: 'Update downloaded and ready to install.',
                latest: 'You are up to date.',
                unsupported: 'Updates are available in packaged Windows and macOS apps.',
                error: 'Update failed. Please try again or open releases.'
            };
            return this.local(statuses[this.updater.status] || statuses.idle);
        }
    },
    async mounted() {
        if (!this.updateApi) {
            this.updater.status = 'unsupported';
            return;
        }
        this.unsubscribe = this.updateApi.onState((state) => { this.updater = state; });
        try {
            this.updater = await this.updateApi.getState();
            if (this.updater.status === 'idle') await this.checkForUpdates();
        } catch (error) {
            this.updater = { ...this.updater, status: 'error', error: error.message || String(error) };
        }
    },
    beforeUnmount() { this.unsubscribe?.(); },
    methods: {
        async checkForUpdates() {
            try { this.updater = await this.updateApi.check(); }
            catch (error) { this.updater = { ...this.updater, status: 'error', error: error.message || String(error) }; }
        },
        async installUpdate() {
            try {
                if (!await this.updateApi.install()) throw new Error(this.local('Update is not ready to install.'));
            } catch (error) { this.updater = { ...this.updater, status: 'error', error: error.message || String(error) }; }
        },
        async openReleases() {
            try { await this.updateApi.openReleases(); }
            catch (error) { this.updater = { ...this.updater, status: 'error', error: error.message || String(error) }; }
        }
    }
};
</script>

<style lang="scss" scoped>
.update-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    min-width: 0;
}
.update-details {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    color: var(--ph-text-muted);
    font-size: 12px;
    overflow-wrap: anywhere;
    strong { color: var(--ph-text); font-size: 13px; }
    .update-error { color: var(--ph-danger); }
}
.update-actions { display: flex; flex-wrap: wrap; gap: 8px; flex-shrink: 0; }
@media (max-width: 640px) {
    .update-content { align-items: flex-start; flex-direction: column; }
    .update-actions { max-width: 100%; }
}
</style>
