<template>
    <section class="section-card">
        <header
            v-if="title || description || $slots.actions"
            class="section-header"
        >
            <div class="section-heading">
                <slot name="info"></slot>
            </div>
            <div v-if="$slots.actions" class="section-actions">
                <slot name="actions"></slot>
            </div>
        </header>
        <div class="section-body">
            <slot></slot>
        </div>
    </section>
</template>

<script>
export default {
    name: 'SectionCard',
    props: {
        title: {
            type: String,
            default: ''
        },
        description: {
            type: String,
            default: ''
        }
    }
};
</script>

<style lang="scss" scoped>
.section-card {
    position: relative;
    width: 100%;
    height: 100%;
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;

    .section-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 18px;
        padding: 15px;
    }

    .section-heading {
        min-width: 0;
        flex: 1;

        h2 {
            margin: 0;
            color: var(--ph-text);
            font-size: 16px;
            font-weight: 600;
            line-height: 1.4;
        }

        p {
            margin: 6px 0 0;
            color: var(--ph-text-secondary);
            font-size: 13px;
            line-height: 1.6;
        }
    }

    .section-actions {
        flex-shrink: 0;
    }

    .section-body {
        position: relative;
        width: 100%;
        height: 10px;
        flex: 1;
        padding: 15px;
        box-sizing: border-box;
        overflow: overlay;
    }
}
</style>
