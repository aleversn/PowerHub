<template>
    <div class="expandable-section">
        <button class="expand-trigger" type="button" :aria-expanded="expanded" @click="expanded = !expanded">
            <i class="ms-Icon ms-Icon--ChevronRight" :class="{ 'is-expanded': expanded }" aria-hidden="true"></i>
            <span>{{ title }}</span>
        </button>
        <transition name="expand" @before-enter="beforeEnter" @enter="enter" @after-enter="clearHeight" @before-leave="beforeLeave" @leave="leave" @after-leave="clearHeight">
            <div v-if="expanded" class="expand-content"><slot></slot></div>
        </transition>
    </div>
</template>
<script>
export default {
    name: 'ExpandableSection',
    props: { title: { type: String, default: '' }, defaultOpen: { type: Boolean, default: false } },
    data() { return { expanded: this.defaultOpen }; },
    methods: {
        beforeEnter(element) { element.style.height = '0'; },
        enter(element) { element.style.height = `${element.scrollHeight}px`; },
        beforeLeave(element) { element.style.height = `${element.scrollHeight}px`; void element.offsetHeight; },
        leave(element) { element.style.height = '0'; },
        clearHeight(element) { element.style.height = ''; }
    }
};
</script>
<style lang="scss" scoped>
.expand-trigger { display: inline-flex; align-items: center; gap: 6px; max-width: 100%; padding: 3px 0; border: 0; background: transparent; color: inherit; font: inherit; cursor: pointer; text-align: left; }
.expand-trigger i { flex: none; font-size: 9px; transition: transform .2s ease; }
.expand-trigger i.is-expanded { transform: rotate(90deg); }
.expand-content { min-width: 0; }
.expand-enter-active, .expand-leave-active { overflow: hidden; transition: height .2s ease, opacity .2s ease; }
.expand-enter-from, .expand-leave-to { opacity: 0; }
@media (prefers-reduced-motion: reduce) { .expand-trigger i, .expand-enter-active, .expand-leave-active { transition: none; } }
</style>
