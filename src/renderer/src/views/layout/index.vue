<template>
    <div class="app-layout">
        <appNavigation></appNavigation>
        <main class="app-main">
            <appHeader></appHeader>
            <div class="app-content">
                <router-view v-slot="{ Component }">
                    <transition name="page-fade" mode="out-in">
                        <component :is="Component"></component>
                    </transition>
                </router-view>
            </div>
        </main>
    </div>
</template>

<script>
import appHeader from '@/components/layout/appHeader.vue';
import appNavigation from '@/components/layout/appNavigation.vue';

export default {
    name: 'AppLayout',
    components: {
        appHeader,
        appNavigation
    }
};
</script>

<style lang="scss" scoped>
.app-layout {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 0;
    background: var(--ph-background-gradient);
    display: flex;
    overflow: hidden;

    .app-main {
        min-width: 0;
        min-height: 0;
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;

        .app-content {
            position: relative;
            width: 100%;
            height: 10px;
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
    }

    .page-fade-enter-active,
    .page-fade-leave-active {
        transition:
            opacity 140ms ease,
            transform 140ms ease;
    }

    .page-fade-enter-from {
        opacity: 0;
        transform: translateY(5px);
    }

    .page-fade-leave-to {
        opacity: 0;
        transform: translateY(-3px);
    }

}
</style>
