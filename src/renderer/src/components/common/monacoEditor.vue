<template>
    <div ref="editorContainer" class="monaco-editor-shell"></div>
</template>

<script>
import { markRaw } from 'vue';

import '@/utils/monacoWorker';

export default {
    name: 'MonacoEditor',
    props: {
        modelValue: {
            type: String,
            default: ''
        },
        language: {
            type: String,
            default: 'json'
        },
        theme: {
            type: String,
            default: 'vs'
        },
        readonly: {
            type: Boolean,
            default: false
        },
        fontSize: {
            type: Number,
            default: 13
        },
        height: {
            type: String,
            default: '220px'
        },
        minimap: {
            type: Boolean,
            default: false
        },
        wordWrap: {
            type: String,
            default: 'on'
        },
        options: {
            type: Object,
            default: () => ({})
        }
    },
    data() {
        return {
            monaco: null,
            editor: null,
            applyingExternalValue: false
        };
    },
    computed: {
        editorOptions() {
            return {
                value: this.modelValue,
                language: this.language,
                theme: this.theme,
                readOnly: this.readonly,
                fontSize: this.fontSize,
                wordWrap: this.wordWrap,
                minimap: { enabled: this.minimap },
                automaticLayout: true,
                scrollBeyondLastLine: false,
                tabSize: 4,
                insertSpaces: true,
                renderLineHighlight: 'all',
                fixedOverflowWidgets: true,
                ...this.options
            };
        }
    },
    watch: {
        modelValue(value) {
            if (!this.editor || value === this.editor.getValue()) return;
            this.applyingExternalValue = true;
            this.editor.setValue(value ?? '');
            this.applyingExternalValue = false;
        },
        language(value) {
            if (!this.editor || !this.monaco) return;
            const model = this.editor.getModel();
            if (model) this.monaco.editor.setModelLanguage(model, value || 'plaintext');
        },
        theme(value) {
            if (this.monaco) this.monaco.editor.setTheme(value || 'vs');
        },
        readonly(value) {
            this.editor?.updateOptions({ readOnly: Boolean(value) });
        },
        fontSize(value) {
            this.editor?.updateOptions({ fontSize: Number(value) || 13 });
        },
        options(value) {
            this.editor?.updateOptions(value || {});
        }
    },
    async mounted() {
        const monaco = await import('monaco-editor');
        this.monaco = markRaw(monaco);
        this.editor = markRaw(
            monaco.editor.create(this.$refs.editorContainer, this.editorOptions)
        );
        this.editor.onDidChangeModelContent(() => {
            if (this.applyingExternalValue) return;
            const value = this.editor.getValue();
            if (value !== this.modelValue) this.$emit('update:modelValue', value);
        });
        this.$emit('ready', this.editor);
        this.$nextTick(() => this.editor?.layout());
    },
    beforeUnmount() {
        this.editor?.dispose();
        this.editor = null;
        this.monaco = null;
    }
};
</script>

<style lang="scss" scoped>
.monaco-editor-shell {
    width: 100%;
    height: v-bind(height);
    min-height: 120px;
    border: 1px solid var(--ph-border);
    border-radius: 10px;
    background: var(--ph-surface);
    overflow: hidden;
}
</style>