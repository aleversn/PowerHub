<template>
    <div class="main-app">
        <titleBar
            :theme="resolvedTheme"
            background="transparent"
            style="position: absolute; z-index: 2"
        ></titleBar>
        <div class="global-container">
            <router-view></router-view>
        </div>
    </div>
</template>

<script>
import { mapActions, mapState } from 'pinia';

import titleBar from '@/components/general/titleBar.vue';
import i18n from '@/js/i18n';
import { useAppConfigStore } from '@/stores/appConfig';

export default {
    name: 'App',
    components: {
        titleBar
    },
    computed: {
        ...mapState(useAppConfigStore, ['resolvedTheme'])
    },
    mounted() {
        this.initialize();
        this.reviseI18N(i18n);
    },
    methods: {
        ...mapActions(useAppConfigStore, ['initialize', 'reviseI18N'])
    }
};
</script>

<style lang="scss">
html,
body,
#app {
    width: 100%;
    height: 100%;
    margin: 0;
    background: transparent;
    overflow: hidden;
}

.main-app {
    width: 100%;
    height: 100%;
    color: var(--ph-text);
    display: flex;
    flex-direction: column;

    .global-container {
        position: relative;
        width: 100%;
        min-height: 0;
        flex: 1;
        overflow: hidden;
    }
}
</style>
