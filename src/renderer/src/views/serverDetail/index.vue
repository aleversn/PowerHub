<template>
    <div class="page-stack server-detail-page">
        <sectionCard
            :title="local('Server Detail')"
            :description="
                local(
                    'Inspect CPU, memory, GPU, network, and disk details for one server.'
                )
            "
        >
            <template #info>
                <fv-button
                    :theme="resolvedTheme"
                    background="transparent"
                    border-radius="8"
                    style="width: 32px; height: 34px"
                    :title="local('Back')"
                    @click="goBack"
                >
                    <i class="ms-Icon ms-Icon--BackToWindow"></i>
                </fv-button>
            </template>
            <template #actions>
                <div class="detail-actions">
                    <button
                        type="button"
                        class="live-chip"
                        :class="{ 'is-paused': !autoRefresh }"
                        :title="
                            autoRefresh
                                ? local('Pause auto refresh')
                                : local('Resume auto refresh')
                        "
                        @click="setAutoRefresh(!autoRefresh)"
                    >
                        <span></span>
                        {{ autoRefresh ? local('Live') : local('Paused') }}
                    </button>
                    <fv-button
                        :theme="resolvedTheme"
                        :background="subColor"
                        border-radius="8"
                        style="width: 32px; height: 34px"
                        :disabled="isServerLoading(serverId)"
                        :title="local('Refresh')"
                        @click="refreshServer(serverId)"
                    >
                        <i class="ms-Icon ms-Icon--Refresh"></i>
                    </fv-button>
                </div>
            </template>

            <div v-if="server" class="detail-shell">
                <serverHero :server="server" :metrics="metrics" />

                <section class="detail-grid">
                    <serverCpuPanel :server="server" :metrics="metrics" />
                    <serverMemoryPanel :metrics="metrics" />
                    <serverGpuPanel :gpus="gpus" />
                    <serverNetworkPanel :metrics="metrics" />
                    <serverDiskPanel :metrics="metrics" />
                </section>
            </div>

            <div v-else class="empty-state">
                <i class="ms-Icon ms-Icon--Server"></i>
                <strong>{{ local('Server not found') }}</strong>
                <span>{{
                    local('The selected server is no longer available.')
                }}</span>
            </div>
        </sectionCard>
    </div>
</template>

<script>
import { mapActions, mapState } from 'pinia';

import sectionCard from '@/components/common/sectionCard.vue';
import { useAppConfigStore } from '@/stores/appConfig';
import { useServerStore } from '@/stores/servers';
import { useThemeStore } from '@/stores/theme';

import serverCpuPanel from './components/serverCpuPanel.vue';
import serverDiskPanel from './components/serverDiskPanel.vue';
import serverGpuPanel from './components/serverGpuPanel.vue';
import serverHero from './components/serverHero.vue';
import serverMemoryPanel from './components/serverMemoryPanel.vue';
import serverNetworkPanel from './components/serverNetworkPanel.vue';

export default {
    name: 'ServerDetailView',
    components: {
        sectionCard,
        serverHero,
        serverCpuPanel,
        serverMemoryPanel,
        serverGpuPanel,
        serverNetworkPanel,
        serverDiskPanel
    },
    computed: {
        ...mapState(useAppConfigStore, ['resolvedTheme', 'local']),
        ...mapState(useServerStore, ['serverById', 'autoRefresh']),
        ...mapState(useThemeStore, ['subColor']),
        serverId() {
            return String(this.$route.params.id || '');
        },
        server() {
            return this.serverById[this.serverId] || null;
        },
        metrics() {
            return this.server?.metrics || {};
        },
        gpus() {
            return this.metrics.gpus || [];
        }
    },
    mounted() {
        this.startAutoRefresh();
        if (this.server?.enabled) this.refreshServer(this.serverId);
    },
    beforeUnmount() {
        this.stopAutoRefresh();
    },
    methods: {
        ...mapActions(useServerStore, [
            'refreshServer',
            'startAutoRefresh',
            'stopAutoRefresh',
            'setAutoRefresh',
            'isServerLoading'
        ]),
        goBack() {
            this.$router.push({ name: 'server-status' });
        }
    }
};
</script>

<style lang="scss" scoped>
.server-detail-page {
    position: relative;
    width: 100%;
    min-height: 0;
    flex: 1;
    box-sizing: border-box;
    overflow: hidden;

    padding: 18px;
    border-radius: 18px;
    --servercat-panel: var(--ph-surface);
    --servercat-card: var(--ph-surface);
    --servercat-card-soft: var(--ph-surface-soft);
    --servercat-border: var(--ph-border);
    --servercat-text: var(--ph-text);
    --servercat-muted: var(--ph-text-muted);
    --servercat-red: var(--ph-danger);

    .detail-actions {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .live-chip {
        height: 34px;
        padding: 0 12px;
        border: 1px solid var(--servercat-border);
        border-radius: 8px;
        background: rgba(16, 185, 129, 0.1);
        color: #10b981;
        display: flex;
        align-items: center;
        gap: 7px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;

        span {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: currentColor;
            box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.12);
        }

        &.is-paused {
            background: rgba(148, 163, 184, 0.12);
            color: var(--servercat-muted);

            span {
                box-shadow: none;
            }
        }
    }

    .detail-shell {
        display: flex;
        flex-direction: column;
        gap: 14px;
    }

    .detail-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 14px;
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
            font-size: 28px;
        }

        strong {
            color: var(--servercat-text);
            font-size: 13px;
        }

        span {
            max-width: 320px;
            font-size: 11px;
            line-height: 1.6;
            text-align: center;
        }
    }

    @media (max-width: 880px) {
        .detail-actions {
            align-items: stretch;
            flex-direction: column;
        }
    }
}
</style>
