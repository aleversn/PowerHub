<template>
    <header class="server-hero">
        <div class="hero-title">
            <span class="server-state" :class="server.status"></span>
            <div>
                <h1>{{ displayName }}</h1>
                <p>{{ server.os }}</p>
                <small>{{ server.username }}@{{ server.address }}{{ server.port === 22 ? '' : ':' + server.port }}</small>
            </div>
        </div>
        <div class="hero-side">
            <span class="temperature-chip" :title="local('Temp')">
                <i class="ms-Icon ms-Icon--Thermometer"></i>
                {{ formatTemperature(metrics.temperature) }}
            </span>
            <statusPill :status="server.status" />
        </div>
    </header>
</template>

<script>
import { mapState } from 'pinia';

import statusPill from '@/components/common/statusPill.vue';
import { useAppConfigStore } from '@/stores/appConfig';

import { formatTemperature } from '../utils/format';

export default {
    name: 'ServerHero',
    components: {
        statusPill
    },
    props: {
        server: {
            type: Object,
            required: true
        },
        metrics: {
            type: Object,
            default: () => ({})
        }
    },
    computed: {
        ...mapState(useAppConfigStore, ['local']),
        displayName() {
            return this.server.hostname || this.server.name || this.local('Untitled server');
        }
    },
    methods: {
        formatTemperature
    }
};
</script>

<style lang="scss" scoped>
.server-hero {
    padding: 16px;
    border: 1px solid var(--servercat-border);
    border-radius: 14px;
    background: var(--servercat-card);
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;

    .hero-title {
        min-width: 0;
        display: flex;
        align-items: flex-start;
        gap: 12px;

        > div {
            min-width: 0;
        }

        h1 {
            margin: 0;
            color: var(--servercat-text);
            font-size: 28px;
            line-height: 1.15;
        }

        p {
            margin: 3px 0 0;
            color: var(--servercat-text);
            font-size: 13px;
        }

        small {
            margin-top: 6px;
            color: var(--servercat-muted);
            display: block;
            font-size: 11px;
        }
    }

    .server-state {
        width: 9px;
        height: 9px;
        margin-top: 9px;
        flex: 0 0 9px;
        border-radius: 50%;
        background: #10b981;

        &.warning {
            background: #f59e0b;
        }

        &.offline {
            background: #94a3b8;
        }
    }

    .hero-side {
        flex: 0 0 auto;
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .temperature-chip {
        height: 28px;
        padding: 0 9px;
        border: 1px solid var(--servercat-border);
        border-radius: 999px;
        color: #f59e0b;
        display: flex;
        align-items: center;
        gap: 5px;
        font-size: 11px;
        font-weight: 700;
    }

    @media (max-width: 880px) {
        align-items: stretch;
        flex-direction: column;
    }
}
</style>