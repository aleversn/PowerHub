<template>
    <section class="section-card">
        <header
            v-if="title || description || $slots.actions"
            class="section-header"
        >
            <div class="section-heading">
                <h2 v-if="title">{{ title }}</h2>
                <p v-if="description">{{ description }}</p>
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
    min-width: 0;
    border: 1px solid var(--ph-border);
    border-radius: 16px;
    background: var(--ph-surface);
    box-shadow: var(--ph-shadow-sm);
    overflow: hidden;

    .section-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 18px;
        padding: 20px 22px 0;
    }

    .section-heading {
        min-width: 0;

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
        min-width: 0;
        padding: 18px 22px 22px;
    }
}
</style>
